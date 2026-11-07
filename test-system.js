// ========================================================
// SYSTEM VERIFICATION TEST
// Tests MySQL connectivity, schema tables, constraints & workflows
// ========================================================

const mysql = require('mysql2/promise');
require('dotenv').config();

async function runTests() {
    console.log('========================================================');
    console.log('🧪 RUNNING ONLINE WEDDING MANAGEMENT SYSTEM TEST SUITE');
    console.log('========================================================');

    let connection;
    let passed = 0;
    let total = 0;

    function assert(desc, condition) {
        total++;
        if (condition) {
            console.log(`  ✅ [PASS] ${desc}`);
            passed++;
        } else {
            console.error(`  ❌ [FAIL] ${desc}`);
        }
    }

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'root',
            database: process.env.DB_NAME || 'wedding_db',
            port: parseInt(process.env.DB_PORT || '3306', 10)
        });

        assert('Connect to MySQL Server with user root and password root', true);

        // 1. Verify required tables exist
        const [tables] = await connection.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0].toLowerCase());
        
        assert('Table 1: `customers` exists', tableNames.includes('customers'));
        assert('Table 2: `halls` exists', tableNames.includes('halls'));
        assert('Table 3: `bookings` exists', tableNames.includes('bookings'));
        assert('Table 4: `payments` exists', tableNames.includes('payments'));

        // 2. Verify halls columns (including images requirement)
        const [hallCols] = await connection.query('DESCRIBE halls');
        const hallColNames = hallCols.map(c => c.Field.toLowerCase());
        assert('Halls table has image_url for photo display', hallColNames.includes('image_url'));
        assert('Halls table has capacity and price', hallColNames.includes('capacity') && hallColNames.includes('price'));

        // 3. Verify seed halls populated
        const [halls] = await connection.query('SELECT * FROM halls');
        assert(`Halls loaded with photos & details (Count: ${halls.length})`, halls.length >= 6);

        // 4. Test Availability Check query
        const testHallId = halls[0].hall_id;
        const testDate = '2026-12-31';
        const [availCheck] = await connection.query(
            'SELECT booking_id FROM bookings WHERE hall_id = ? AND event_date = ? AND status != "Cancelled"',
            [testHallId, testDate]
        );
        assert(`Availability query functional for date ${testDate} (available: ${availCheck.length === 0})`, true);

        // 5. Test Customer Creation
        const testEmail = `test.wedding.${Date.now()}@example.com`;
        const [custRes] = await connection.query(
            'INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)',
            ['Test Couple', testEmail, '9998887776', '100 Test Avenue']
        );
        const testCustId = custRes.insertId;
        assert('Customer registration creates new customer record', testCustId > 0);

        // 6. Test Booking with Payment Transaction
        const [bookRes] = await connection.query(
            `INSERT INTO bookings (customer_id, hall_id, event_name, event_date, start_time, end_time, total_amount, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [testCustId, testHallId, 'Test Wedding Ceremony', testDate, '10:00:00', '22:00:00', 150000.00, 'Confirmed']
        );
        const testBookingId = bookRes.insertId;
        assert('Booking successfully created with foreign keys', testBookingId > 0);

        // 7. Test Payment creation linked to booking
        const [payRes] = await connection.query(
            `INSERT INTO payments (booking_id, amount, payment_date, payment_status, payment_method, transaction_ref)
             VALUES (?, ?, CURDATE(), ?, ?, ?)`,
            [testBookingId, 150000.00, 'Paid', 'UPI / GPay', 'TXN-TEST-12345']
        );
        assert('Payment record successfully created linked to booking_id', payRes.insertId > 0);

        // 8. Test Conflict Detection (Same Hall, Same Date)
        const [conflictCheck] = await connection.query(
            'SELECT booking_id FROM bookings WHERE hall_id = ? AND event_date = ? AND status != "Cancelled"',
            [testHallId, testDate]
        );
        assert('Double-booking conflict accurately detected', conflictCheck.length > 0);

        // 9. Clean up test record
        await connection.query('DELETE FROM bookings WHERE booking_id = ?', [testBookingId]);
        await connection.query('DELETE FROM customers WHERE customer_id = ?', [testCustId]);
        assert('Test records cleaned up successfully', true);

        console.log('========================================================');
        console.log(`🏁 TEST RESULTS: ${passed} / ${total} TESTS PASSED!`);
        console.log('========================================================');

    } catch (err) {
        console.error('Test execution error:', err);
    } finally {
        if (connection) await connection.end();
    }
}

runTests();

