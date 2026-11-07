const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/customers - List all customers
router.get('/', async (req, res) => {
    try {
        const [customers] = await db.query('SELECT * FROM customers ORDER BY customer_id DESC');
        res.json({ success: true, data: customers });
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve customers', error: err.message });
    }
});

// GET /api/customers/lookup?search=email_or_phone
router.get('/lookup', async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ success: false, message: 'Search parameter required' });
        }

        const [customers] = await db.query(
            'SELECT * FROM customers WHERE email = ? OR phone = ?',
            [search.trim(), search.trim()]
        );

        if (customers.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        // Fetch their bookings & payments
        const customer = customers[0];
        const [bookings] = await db.query(
            `SELECT b.*, h.hall_name, h.location, h.image_url,
                    p.payment_id, p.amount AS payment_amount, p.payment_date, p.payment_status, p.payment_method, p.transaction_ref
             FROM bookings b
             JOIN halls h ON b.hall_id = h.hall_id
             LEFT JOIN payments p ON b.booking_id = p.booking_id
             WHERE b.customer_id = ?
             ORDER BY b.event_date DESC`,
            [customer.customer_id]
        );

        res.json({ success: true, customer, bookings });
    } catch (err) {
        console.error('Error in customer lookup:', err);
        res.status(500).json({ success: false, message: 'Lookup failed', error: err.message });
    }
});

// GET /api/customers/:id - Single customer with booking history
router.get('/:id', async (req, res) => {
    try {
        const [customers] = await db.query('SELECT * FROM customers WHERE customer_id = ?', [req.params.id]);
        if (customers.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        const [bookings] = await db.query(
            `SELECT b.*, h.hall_name, h.location, p.payment_status, p.amount as paid_amount
             FROM bookings b
             JOIN halls h ON b.hall_id = h.hall_id
             LEFT JOIN payments p ON b.booking_id = p.booking_id
             WHERE b.customer_id = ?
             ORDER BY b.booking_id DESC`,
            [req.params.id]
        );

        res.json({ success: true, data: { ...customers[0], bookings } });
    } catch (err) {
        console.error('Error fetching customer details:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve customer', error: err.message });
    }
});

// POST /api/customers - Create customer
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        if (!name || !email || !phone || !address) {
            return res.status(400).json({ success: false, message: 'Name, email, phone, and address are required' });
        }

        // Check if email already exists
        const [existing] = await db.query('SELECT customer_id FROM customers WHERE email = ?', [email.trim()]);
        if (existing.length > 0) {
            return res.json({ success: true, customer_id: existing[0].customer_id, message: 'Existing customer found' });
        }

        const [result] = await db.query(
            'INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)',
            [name.trim(), email.trim(), phone.trim(), address.trim()]
        );

        res.status(201).json({ success: true, customer_id: result.insertId, message: 'Customer registered successfully' });
    } catch (err) {
        console.error('Error creating customer:', err);
        res.status(500).json({ success: false, message: 'Failed to register customer', error: err.message });
    }
});

module.exports = router;

