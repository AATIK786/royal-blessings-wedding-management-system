// ========================================================
// DATABASE SEED SCRIPT
// Re-executes schema.sql using mysql2
// ========================================================

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runSeed() {
    console.log('🌱 Starting MySQL Seed for Online Wedding Management System...');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        multipleStatements: true
    });

    try {
        const schemaPath = path.join(__dirname, '..', 'schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        console.log('📄 Executing schema.sql into MySQL Server...');
        await connection.query(sql);

        console.log('✅ Database `wedding_db` and tables created and seeded successfully!');
        console.log('✨ Tables ready in MySQL Workbench:');
        console.log('   - customers');
        console.log('   - halls');
        console.log('   - bookings');
        console.log('   - payments');
        console.log('   - admins');
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
    } finally {
        await connection.end();
    }
}

runSeed();

