const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool to MySQL Database (as configured in MySQL Workbench)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'wedding_db',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true
});

// Test connection on startup
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected successfully to MySQL database "wedding_db" (user: root)');
        connection.release();
    } catch (err) {
        console.error('❌ Failed to connect to MySQL database:', err.message);
        console.error('👉 Make sure MySQL Server is running and password is "root" as specified in MySQL Workbench.');
    }
})();

module.exports = pool;

