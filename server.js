const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for API requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Database connection test
const db = require('./config/db');

// Register API Routes
app.use('/api/halls', require('./routes/halls'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/stats', require('./routes/stats'));

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({
            status: 'online',
            service: 'Online Wedding Management System',
            database: 'Connected to MySQL (wedding_db)',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({
            status: 'degraded',
            database: 'Disconnected from MySQL',
            error: err.message
        });
    }
});

// Serve frontend single-page application for any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🌸 ONLINE WEDDING MANAGEMENT SYSTEM IS RUNNING 🌸`);
    console.log(`🚀 Web Application URL : http://localhost:${PORT}`);
    console.log(`🗄️  MySQL Database      : wedding_db (port 3306)`);
    console.log(`🔑 MySQL Workbench User : root (password: root)`);
    console.log('====================================================');
});

