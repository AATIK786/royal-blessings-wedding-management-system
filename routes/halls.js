const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/halls - List all halls with optional filters
router.get('/', async (req, res) => {
    try {
        const { search, location, min_capacity, max_price, status } = req.query;
        let query = 'SELECT * FROM halls WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (hall_name LIKE ? OR location LIKE ? OR facilities LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        if (location) {
            query += ' AND location LIKE ?';
            params.push(`%${location}%`);
        }

        if (min_capacity) {
            query += ' AND capacity >= ?';
            params.push(parseInt(min_capacity, 10));
        }

        if (max_price) {
            query += ' AND price <= ?';
            params.push(parseFloat(max_price));
        }

        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY hall_id DESC';
        const [rows] = await db.query(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching halls:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve halls', error: err.message });
    }
});

// GET /api/halls/check-availability?hall_id=1&event_date=2026-11-20
router.get('/check-availability', async (req, res) => {
    try {
        const { hall_id, event_date } = req.query;

        if (!hall_id || !event_date) {
            return res.status(400).json({ success: false, message: 'hall_id and event_date are required' });
        }

        // Fetch hall info first
        const [halls] = await db.query('SELECT * FROM halls WHERE hall_id = ?', [hall_id]);
        if (halls.length === 0) {
            return res.status(404).json({ success: false, message: 'Hall not found' });
        }
        const hall = halls[0];

        // Check if there is any active booking on that date (excluding cancelled)
        const [bookings] = await db.query(
            `SELECT b.booking_id, b.event_name, b.start_time, b.end_time, b.status, c.name AS customer_name
             FROM bookings b
             JOIN customers c ON b.customer_id = c.customer_id
             WHERE b.hall_id = ? AND b.event_date = ? AND b.status != 'Cancelled'`,
            [hall_id, event_date]
        );

        const isAvailable = bookings.length === 0 && hall.status !== 'Maintenance';

        res.json({
            success: true,
            hall: hall,
            event_date: event_date,
            is_available: isAvailable,
            existing_bookings: bookings,
            status_reason: hall.status === 'Maintenance' 
                ? 'Hall is currently under maintenance' 
                : (isAvailable ? 'Hall is available for booking' : 'Hall is already reserved for this date')
        });
    } catch (err) {
        console.error('Error checking availability:', err);
        res.status(500).json({ success: false, message: 'Error checking availability', error: err.message });
    }
});

// GET /api/halls/:id - Get single hall details with its scheduled dates
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM halls WHERE hall_id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Hall not found' });
        }
        const hall = rows[0];

        // Fetch upcoming confirmed/pending bookings for this hall
        const [bookings] = await db.query(
            `SELECT booking_id, event_name, event_date, start_time, end_time, status
             FROM bookings 
             WHERE hall_id = ? AND status != 'Cancelled'
             ORDER BY event_date ASC`,
            [req.params.id]
        );

        res.json({ success: true, data: { ...hall, upcoming_bookings: bookings } });
    } catch (err) {
        console.error('Error fetching hall:', err);
        res.status(500).json({ success: false, message: 'Error fetching hall details', error: err.message });
    }
});

// POST /api/halls - Admin create new hall
router.post('/', async (req, res) => {
    try {
        const { hall_name, location, capacity, price, facilities, status, image_url } = req.body;

        if (!hall_name || !location || !capacity || !price) {
            return res.status(400).json({ success: false, message: 'Name, location, capacity, and price are required' });
        }

        const fallbackImage = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80';

        const [result] = await db.query(
            `INSERT INTO halls (hall_name, location, capacity, price, facilities, status, image_url)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                hall_name.trim(),
                location.trim(),
                parseInt(capacity, 10),
                parseFloat(price),
                facilities ? facilities.trim() : '',
                status || 'Available',
                image_url ? image_url.trim() : fallbackImage
            ]
        );

        const [newHall] = await db.query('SELECT * FROM halls WHERE hall_id = ?', [result.insertId]);
        res.status(201).json({ success: true, message: 'Hall created successfully', data: newHall[0] });
    } catch (err) {
        console.error('Error creating hall:', err);
        res.status(500).json({ success: false, message: 'Failed to create hall', error: err.message });
    }
});

// PUT /api/halls/:id - Admin update hall
router.put('/:id', async (req, res) => {
    try {
        const { hall_name, location, capacity, price, facilities, status, image_url } = req.body;

        const [existing] = await db.query('SELECT * FROM halls WHERE hall_id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Hall not found' });
        }

        await db.query(
            `UPDATE halls 
             SET hall_name = ?, location = ?, capacity = ?, price = ?, facilities = ?, status = ?, image_url = ?
             WHERE hall_id = ?`,
            [
                hall_name ? hall_name.trim() : existing[0].hall_name,
                location ? location.trim() : existing[0].location,
                capacity ? parseInt(capacity, 10) : existing[0].capacity,
                price ? parseFloat(price) : existing[0].price,
                facilities !== undefined ? facilities.trim() : existing[0].facilities,
                status || existing[0].status,
                image_url ? image_url.trim() : existing[0].image_url,
                req.params.id
            ]
        );

        const [updated] = await db.query('SELECT * FROM halls WHERE hall_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Hall updated successfully', data: updated[0] });
    } catch (err) {
        console.error('Error updating hall:', err);
        res.status(500).json({ success: false, message: 'Failed to update hall', error: err.message });
    }
});

// DELETE /api/halls/:id - Admin delete hall
router.delete('/:id', async (req, res) => {
    try {
        const [existing] = await db.query('SELECT * FROM halls WHERE hall_id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Hall not found' });
        }

        await db.query('DELETE FROM halls WHERE hall_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Hall deleted successfully' });
    } catch (err) {
        console.error('Error deleting hall:', err);
        res.status(500).json({ success: false, message: 'Failed to delete hall', error: err.message });
    }
});

module.exports = router;

