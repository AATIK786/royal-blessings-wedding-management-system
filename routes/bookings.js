const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/bookings - List all bookings (for Admin & reporting)
router.get('/', async (req, res) => {
    try {
        const { status, date } = req.query;
        let query = `
            SELECT b.*, 
                   c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, c.address AS customer_address,
                   h.hall_name, h.location AS hall_location, h.capacity AS hall_capacity, h.image_url AS hall_image,
                   p.payment_id, p.amount AS payment_amount, p.payment_date, p.payment_status, p.payment_method, p.transaction_ref
            FROM bookings b
            JOIN customers c ON b.customer_id = c.customer_id
            JOIN halls h ON b.hall_id = h.hall_id
            LEFT JOIN payments p ON b.booking_id = p.booking_id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            query += ' AND b.status = ?';
            params.push(status);
        }

        if (date) {
            query += ' AND b.event_date = ?';
            params.push(date);
        }

        query += ' ORDER BY b.event_date DESC, b.booking_id DESC';
        const [bookings] = await db.query(query, params);
        res.json({ success: true, count: bookings.length, data: bookings });
    } catch (err) {
        console.error('Error fetching bookings:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve bookings', error: err.message });
    }
});

// GET /api/bookings/:id - Single booking details with customer, hall, and payment invoice
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT b.*, 
                    c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, c.address AS customer_address,
                    h.hall_name, h.location AS hall_location, h.capacity AS hall_capacity, h.price AS hall_price, h.facilities, h.image_url,
                    p.payment_id, p.amount AS payment_amount, p.payment_date, p.payment_status, p.payment_method, p.transaction_ref
             FROM bookings b
             JOIN customers c ON b.customer_id = c.customer_id
             JOIN halls h ON b.hall_id = h.hall_id
             LEFT JOIN payments p ON b.booking_id = p.booking_id
             WHERE b.booking_id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('Error fetching booking details:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve booking', error: err.message });
    }
});

// POST /api/bookings - Book a hall (Customer or Admin)
router.post('/', async (req, res) => {
    let connection;
    try {
        const {
            hall_id,
            event_name,
            event_date,
            start_time,
            end_time,
            // Either existing customer_id or new customer profile details:
            customer_id,
            customer_name,
            customer_email,
            customer_phone,
            customer_address,
            // Payment details
            payment_status,
            payment_method
        } = req.body;

        if (!hall_id || !event_name || !event_date || !start_time || !end_time) {
            return res.status(400).json({ 
                success: false, 
                message: 'Hall, Event Name, Event Date, Start Time, and End Time are required' 
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Check Hall Details
        const [halls] = await connection.query('SELECT * FROM halls WHERE hall_id = ?', [hall_id]);
        if (halls.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Selected hall does not exist' });
        }
        const hall = halls[0];

        if (hall.status === 'Maintenance') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'This hall is currently closed for maintenance' });
        }

        // 2. Double-booking conflict check
        const [conflicts] = await connection.query(
            `SELECT booking_id FROM bookings 
             WHERE hall_id = ? AND event_date = ? AND status != 'Cancelled'`,
            [hall_id, event_date]
        );

        if (conflicts.length > 0) {
            await connection.rollback();
            return res.status(409).json({ 
                success: false, 
                message: `Sorry, "${hall.hall_name}" is already booked on ${event_date}. Please choose another date or hall.` 
            });
        }

        // 3. Resolve Customer ID
        let resolvedCustomerId = customer_id;
        if (!resolvedCustomerId) {
            if (!customer_name || !customer_email || !customer_phone) {
                await connection.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'Customer information (Name, Email, Phone) is required' 
                });
            }

            // Check if customer email already exists
            const [existingCust] = await connection.query('SELECT customer_id FROM customers WHERE email = ?', [customer_email.trim()]);
            if (existingCust.length > 0) {
                resolvedCustomerId = existingCust[0].customer_id;
            } else {
                const [custInsert] = await connection.query(
                    'INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)',
                    [customer_name.trim(), customer_email.trim(), customer_phone.trim(), (customer_address || 'Not Provided').trim()]
                );
                resolvedCustomerId = custInsert.insertId;
            }
        }

        const totalAmount = parseFloat(hall.price);

        // 4. Create Booking
        const [bookingInsert] = await connection.query(
            `INSERT INTO bookings (customer_id, hall_id, event_name, event_date, start_time, end_time, total_amount, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                resolvedCustomerId,
                hall_id,
                event_name.trim(),
                event_date,
                start_time,
                end_time,
                totalAmount,
                'Confirmed'
            ]
        );
        const bookingId = bookingInsert.insertId;

        // 5. Create Payment record
        const initialPaymentStatus = payment_status || 'Paid';
        const method = payment_method || 'Online / Card';
        const txnRef = 'TXN-' + Math.floor(10000000 + Math.random() * 90000000);

        const [paymentInsert] = await connection.query(
            `INSERT INTO payments (booking_id, amount, payment_date, payment_status, payment_method, transaction_ref)
             VALUES (?, ?, CURDATE(), ?, ?, ?)`,
            [
                bookingId,
                totalAmount,
                initialPaymentStatus,
                method,
                txnRef
            ]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Wedding booking confirmed successfully!',
            booking_id: bookingId,
            payment_id: paymentInsert.insertId,
            total_amount: totalAmount,
            hall_name: hall.hall_name,
            event_date: event_date,
            transaction_ref: txnRef
        });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Error creating booking:', err);
        res.status(500).json({ success: false, message: 'Failed to create booking', error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// PUT /api/bookings/:id/status - Admin update reservation status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Confirmed', 'Pending', 'Cancelled', 'Completed'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid status. Valid values: ${validStatuses.join(', ')}` 
            });
        }

        const [result] = await db.query(
            'UPDATE bookings SET status = ? WHERE booking_id = ?',
            [status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        res.json({ success: true, message: `Booking status updated to ${status}` });
    } catch (err) {
        console.error('Error updating booking status:', err);
        res.status(500).json({ success: false, message: 'Failed to update booking status', error: err.message });
    }
});

// DELETE /api/bookings/:id - Admin cancel/delete booking
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM bookings WHERE booking_id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        res.json({ success: true, message: 'Booking deleted successfully' });
    } catch (err) {
        console.error('Error deleting booking:', err);
        res.status(500).json({ success: false, message: 'Failed to delete booking', error: err.message });
    }
});

module.exports = router;

