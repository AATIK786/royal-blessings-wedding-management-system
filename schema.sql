-- ========================================================
-- ONLINE WEDDING MANAGEMENT SYSTEM
-- Database Schema for MySQL Server & MySQL Workbench
-- Password for Workbench: root
-- ========================================================

CREATE DATABASE IF NOT EXISTS wedding_db;
USE wedding_db;

-- --------------------------------------------------------
-- Table 1: customers
-- Description: Stores customer profile and contact details
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Table 2: halls
-- Description: Stores marriage hall specifications, capacity, pricing,
--              facilities, status, and showcase images.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS halls (
    hall_id INT AUTO_INCREMENT PRIMARY KEY,
    hall_name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    capacity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    facilities TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Available',
    image_url VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Table 3: bookings
-- Description: Stores customer reservations for halls with date,
--              timeslot, event name, total cost, and status.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    hall_id INT NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (hall_id) REFERENCES halls(hall_id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Table 4: payments
-- Description: Stores payment transactions linked to bookings
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'Paid',
    payment_method VARCHAR(50) DEFAULT 'Online / Card',
    transaction_ref VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Table 5: admins (Optional helper for Admin Authentication)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- INDEXES FOR FASTER SEARCHING & AVAILABILITY CHECKS
-- ========================================================
CREATE INDEX idx_bookings_date_hall ON bookings(hall_id, event_date);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_halls_location ON halls(location);

-- ========================================================
-- SEED DATA (Realistic Sample Records with High-Res Images)
-- ========================================================

-- Insert Sample Customers
INSERT INTO customers (customer_id, name, email, phone, address) VALUES
(1, 'Rahul Sharma', 'rahul.sharma@example.com', '9876543210', '42MG Road, Bangalore, Karnataka'),
(2, 'Priya Patel', 'priya.patel@example.com', '9812345678', '15 Ring Road, Surat, Gujarat'),
(3, 'Shaik Mansoor', 'mansoor.wedding@example.com', '9845123789', '77 Jubilee Hills, Hyderabad, Telangana'),
(4, 'Ananya Sen', 'ananya.sen@example.com', '9734561289', '12 Salt Lake Sector V, Kolkata, West Bengal'),
(5, 'Vikramaditya Rao', 'vikram.rao@example.com', '9900112233', '88 Marine Drive, Mumbai, Maharashtra'),
(6, 'Neha Kulkarni', 'neha.k@example.com', '9122334455', '23 Shivaji Nagar, Pune, Maharashtra')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert Sample Marriage Halls (with Wedding Images)
INSERT INTO halls (hall_id, hall_name, location, capacity, price, facilities, status, image_url) VALUES
(1, 'Royal Blessings Wedding Hall', 'Jubilee Hills, Hyderabad', 1500, 180000.00, 'Centrally Air-Conditioned, Royal Blessings Grand Stage, Luxury Bridal Suite, Premium In-house Catering, Ample Parking (300 Cars), DJ Sound & Chandeliers, Owner: Aatik Mansoor', 'Available', '/images/background.jpg'),
(2, 'Imperial Blossom Convention Lawn', 'Banjara Hills, Hyderabad', 2000, 220000.00, 'Open-air Royal Garden, 35,000 sq.ft Lawn, Floating Stage, Decorative Fountains, Full Generator Backup, 500 Car Parking, Chef Live Counters, Drone Videography Setup', 'Available', 'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?auto=format&fit=crop&w=1200&q=80'),
(3, 'Emerald Heights Ballroom', 'Marine Drive, Mumbai', 800, 180000.00, 'Sea View Banquet, Italian Marble Flooring, Crystal Chandeliers, Acoustic Soundproofing, High-speed Wi-Fi, VIP Lounge, 2 Bridal Suites, Dedicated Event Manager', 'Available', 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80'),
(4, 'Shubham Vivah Kalyana Mandapam', 'T. Nagar, Chennai', 600, 85000.00, 'Traditional South Indian Mandap Architecture, Pure Veg Dining Hall (400 Seater), Homam-friendly Sacred Fire Pit, Nadaswaram stage, Guest Rooms (10 AC Rooms)', 'Available', 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80'),
(5, 'Mayflower Garden Estate', 'Kalyani Nagar, Pune', 1500, 165000.00, 'Lush Botanical Garden Theme, Fairylight Canopy, Outdoor Cocktail Deck, Stage with LED Backdrop Screen, Covered Dining Pavillion, Dedicated Valet Service', 'Available', 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1200&q=80'),
(6, 'Regal Heritage Durbar Hall', 'Amer Road, Jaipur', 1000, 250000.00, 'Rajasthani Royal Heritage Architecture, Jharokha Balconies, Sheesh Mahal Themed Lighting, Traditional Welcome Folk Troupe, Horse & Elephant Pathway, Royal Suite', 'Available', 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80'),
(7, 'Golden Pearl Banquet & Resort', 'Salt Lake, Kolkata', 500, 95000.00, 'Modern Elegance, Poolside Terrace, Ambient Color Mood Lighting, Premium Audio/Visual System, Multi-Cuisine Live Kitchen, 6 Changing Rooms, 24/7 Security', 'Available', 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1200&q=80'),
(8, 'Sapphire Lagoon Waterfront Pavilion', 'Kochi Marine Bay, Kerala', 750, 140000.00, 'Waterfront Scenic View, Sunset Deck, Kerala Traditional Boat Entry Option, Tropical Landscape, Open Air Dining & Covered Hall, High Tech Audio System', 'Maintenance', 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80')
ON DUPLICATE KEY UPDATE hall_name=VALUES(hall_name);

-- Insert Sample Bookings
INSERT INTO bookings (booking_id, customer_id, hall_id, event_name, event_date, start_time, end_time, total_amount, status) VALUES
(1, 1, 1, 'Rahul & Ananya Grand Wedding Reception', '2026-11-20', '18:00:00', '23:30:00', 150000.00, 'Confirmed'),
(2, 2, 2, 'Priya & Harsh Royal Sangeet & Vivah', '2026-11-25', '10:00:00', '22:00:00', 220000.00, 'Confirmed'),
(3, 3, 3, 'Mansoor & Sarah Wedding Gala', '2026-12-05', '17:00:00', '23:00:00', 180000.00, 'Pending'),
(4, 4, 4, 'Sen Family Traditional Muhurtham', '2026-12-12', '06:00:00', '15:00:00', 85000.00, 'Confirmed'),
(5, 5, 5, 'Vikram & Radhika Destination Wedding', '2026-12-18', '16:00:00', '23:59:00', 165000.00, 'Confirmed'),
(6, 6, 6, 'Kulkarni Heritage Wedding Ceremony', '2026-12-28', '09:00:00', '21:00:00', 250000.00, 'Pending')
ON DUPLICATE KEY UPDATE event_name=VALUES(event_name);

-- Insert Sample Payments
INSERT INTO payments (payment_id, booking_id, amount, payment_date, payment_status, payment_method, transaction_ref) VALUES
(1, 1, 150000.00, '2026-11-01', 'Paid', 'Net Banking (HDFC)', 'TXN-98421098'),
(2, 2, 220000.00, '2026-11-03', 'Paid', 'UPI / GPay', 'TXN-88741235'),
(3, 3, 50000.00, '2026-11-05', 'Partially Paid', 'Credit Card', 'TXN-77612349'),
(4, 4, 85000.00, '2026-11-06', 'Paid', 'Online NEFT', 'TXN-66509812'),
(5, 5, 165000.00, '2026-11-06', 'Paid', 'Debit Card', 'TXN-55498723'),
(6, 6, 50000.00, '2026-11-07', 'Pending', 'Cheque Deposit', 'TXN-44387612')
ON DUPLICATE KEY UPDATE amount=VALUES(amount);

-- Insert Default Admin
INSERT INTO admins (admin_id, username, password, full_name, email) VALUES
(1, 'admin', 'admin123', 'Wedding System Administrator', 'admin@wedding.com')
ON DUPLICATE KEY UPDATE username=VALUES(username);

