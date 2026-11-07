const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/stats - Dashboard analytics
router.get('/', async (req, res) => {
    try {
        const [hallsCount] = await db.query('SELECT COUNT(*) as total, SUM(CASE WHEN status="Available" THEN 1 ELSE 0 END) as available FROM halls');
        const [bookingsCount] = await db.query('SELECT COUNT(*) as total, SUM(CASE WHEN status="Confirmed" THEN 1 ELSE 0 END) as confirmed, SUM(CASE WHEN status="Pending" THEN 1 ELSE 0 END) as pending FROM bookings');
        const [customersCount] = await db.query('SELECT COUNT(*) as total FROM customers');
        const [revenueData] = await db.query('SELECT COALESCE(SUM(amount), 0) as total_revenue, COALESCE(SUM(CASE WHEN payment_status="Paid" THEN amount ELSE 0 END), 0) as collected_revenue FROM payments');

        // Recent 5 bookings
        const [recentBookings] = await db.query(`
            SELECT b.booking_id, b.event_name, b.event_date, b.total_amount, b.status,
                   c.name AS customer_name, h.hall_name
            FROM bookings b
            JOIN customers c ON b.customer_id = c.customer_id
            JOIN halls h ON b.hall_id = h.hall_id
            ORDER BY b.booking_id DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            stats: {
                total_halls: hallsCount[0].total,
                available_halls: hallsCount[0].available,
                total_bookings: bookingsCount[0].total,
                confirmed_bookings: bookingsCount[0].confirmed,
                pending_bookings: bookingsCount[0].pending,
                total_customers: customersCount[0].total,
                total_revenue: revenueData[0].total_revenue,
                collected_revenue: revenueData[0].collected_revenue
            },
            recent_bookings: recentBookings
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve stats', error: err.message });
    }
});

module.exports = router;

