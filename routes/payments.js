const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/payments - List all payments with customer and hall info
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT p.*, 
                   b.event_name, b.event_date, b.total_amount AS booking_total,
                   c.customer_id, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
                   h.hall_id, h.hall_name, h.location
            FROM payments p
            JOIN bookings b ON p.booking_id = b.booking_id
            JOIN customers c ON b.customer_id = c.customer_id
            JOIN halls h ON b.hall_id = h.hall_id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            query += ' AND p.payment_status = ?';
            params.push(status);
        }

        query += ' ORDER BY p.payment_date DESC, p.payment_id DESC';
        const [payments] = await db.query(query, params);
        res.json({ success: true, count: payments.length, data: payments });
    } catch (err) {
        console.error('Error fetching payments:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve payments', error: err.message });
    }
});

// GET /api/payments/booking/:booking_id - Get payment details for a specific booking
router.get('/booking/:booking_id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT p.*, b.event_name, b.event_date, b.total_amount, c.name AS customer_name, h.hall_name
             FROM payments p
             JOIN bookings b ON p.booking_id = b.booking_id
             JOIN customers c ON b.customer_id = c.customer_id
             JOIN halls h ON b.hall_id = h.hall_id
             WHERE p.booking_id = ?`,
            [req.params.booking_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No payments found for this booking' });
        }

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching payments for booking:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve payment', error: err.message });
    }
});

// PUT /api/payments/:id/status - Update payment status (Paid, Pending, Refunded, Partially Paid)
router.put('/:id/status', async (req, res) => {
    try {
        const { payment_status } = req.body;
        const validStatuses = ['Paid', 'Pending', 'Partially Paid', 'Refunded'];

        if (!payment_status || !validStatuses.includes(payment_status)) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid payment status. Valid values: ${validStatuses.join(', ')}` 
            });
        }

        const [result] = await db.query(
            'UPDATE payments SET payment_status = ? WHERE payment_id = ?',
            [payment_status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Payment record not found' });
        }

        res.json({ success: true, message: `Payment status updated to ${payment_status}` });
    } catch (err) {
        console.error('Error updating payment status:', err);
        res.status(500).json({ success: false, message: 'Failed to update payment status', error: err.message });
    }
});

module.exports = router;

