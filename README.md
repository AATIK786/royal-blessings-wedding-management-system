# 💍 Online Wedding Management System

A full-stack web application and database system designed to manage marriage halls, event bookings, customer reservations, and payment transactions with venue showcase images.

---

## 📋 Database Specifications (MySQL Workbench)

- **Database Name**: `wedding_db`
- **Host**: `localhost:3306`
- **Username**: `root`
- **Password**: `root`

### Tables Architecture

#### 1. `customers`
Stores customer profiles and contact details.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `customer_id` | `INT` | `PK, AUTO_INCREMENT` | Unique identifier for customer |
| `name` | `VARCHAR(100)` | `NOT NULL` | Customer full name |
| `email` | `VARCHAR(100)` | `NOT NULL, UNIQUE` | Customer email address |
| `phone` | `VARCHAR(15)` | `NOT NULL` | Contact mobile number |
| `address` | `VARCHAR(255)` | `NOT NULL` | Residential / billing address |

#### 2. `halls`
Stores marriage hall inventory, capacity, price, facilities, and image URLs.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `hall_id` | `INT` | `PK, AUTO_INCREMENT` | Unique identifier for hall |
| `hall_name` | `VARCHAR(100)` | `NOT NULL` | Marriage hall title |
| `location` | `VARCHAR(150)` | `NOT NULL` | City and landmark address |
| `capacity` | `INT` | `NOT NULL` | Maximum guest capacity (seats) |
| `price` | `DECIMAL(10,2)` | `NOT NULL` | Booking rental price per event/day |
| `facilities` | `TEXT` | `NULL` | Comma-separated list of amenities |
| `status` | `VARCHAR(20)` | `DEFAULT 'Available'` | `Available`, `Booked`, `Maintenance` |
| `image_url` | `VARCHAR(500)` | `NULL` | High-res showcase photo URL |

#### 3. `bookings`
Stores wedding and event reservations linked to customers and halls.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `booking_id` | `INT` | `PK, AUTO_INCREMENT` | Unique reservation identifier |
| `customer_id` | `INT` | `FK -> customers(customer_id)` | Customer who booked the hall |
| `hall_id` | `INT` | `FK -> halls(hall_id)` | Hall being reserved |
| `event_name` | `VARCHAR(100)` | `NOT NULL` | Name of wedding function |
| `event_date` | `DATE` | `NOT NULL` | Date of the wedding event |
| `start_time` | `TIME` | `NOT NULL` | Event start time |
| `end_time` | `TIME` | `NOT NULL` | Event end time |
| `total_amount` | `DECIMAL(10,2)` | `NOT NULL` | Total booking price calculated |
| `status` | `VARCHAR(30)` | `DEFAULT 'Pending'` | `Confirmed`, `Pending`, `Cancelled`, `Completed` |

#### 4. `payments`
Tracks financial payment records and invoices tied to bookings.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `payment_id` | `INT` | `PK, AUTO_INCREMENT` | Unique payment transaction ID |
| `booking_id` | `INT` | `FK -> bookings(booking_id)` | Linked reservation ID |
| `amount` | `DECIMAL(10,2)` | `NOT NULL` | Amount paid |
| `payment_date` | `DATE` | `NOT NULL` | Transaction date |
| `payment_status` | `VARCHAR(30)` | `DEFAULT 'Paid'` | `Paid`, `Pending`, `Partially Paid`, `Refunded` |
| `payment_method` | `VARCHAR(50)` | `NULL` | Mode (UPI, Card, Net Banking, Cheque) |
| `transaction_ref`| `VARCHAR(100)`| `NULL` | Reference transaction code |

---

## 🛠️ How to Connect in MySQL Workbench

1. Open **MySQL Workbench**.
2. Click on the **Local instance MySQL80** connection (or click **+** to add a new connection):
   - **Hostname**: `127.0.0.1` or `localhost`
   - **Port**: `3306`
   - **Username**: `root`
   - **Password**: Click *Store in Vault...* and enter `root`
3. Click **Test Connection** (it will show *Successfully made the MySQL connection*).
4. Click **OK** and open the connection.
5. In the left **Schemas** sidebar, locate `wedding_db`.
6. Expand `Tables` to view:
   - `customers`
   - `halls`
   - `bookings`
   - `payments`

### Helpful SQL Queries to Run in MySQL Workbench

```sql
-- 1. Use the wedding database
USE wedding_db;

-- 2. View all marriage halls with capacity, price & status
SELECT hall_id, hall_name, location, capacity, price, status, image_url 
FROM halls;

-- 3. View upcoming wedding bookings with customer & hall details
SELECT 
    b.booking_id,
    c.name AS customer_name,
    c.phone,
    h.hall_name,
    h.location,
    b.event_name,
    b.event_date,
    b.start_time,
    b.end_time,
    b.total_amount,
    b.status AS booking_status
FROM bookings b
JOIN customers c ON b.customer_id = c.customer_id
JOIN halls h ON b.hall_id = h.hall_id
ORDER BY b.event_date ASC;

-- 4. View payment transactions & revenue ledger
SELECT 
    p.payment_id,
    p.transaction_ref,
    c.name AS customer_name,
    h.hall_name,
    p.amount,
    p.payment_date,
    p.payment_status,
    p.payment_method
FROM payments p
JOIN bookings b ON p.booking_id = b.booking_id
JOIN customers c ON b.customer_id = c.customer_id
JOIN halls h ON b.hall_id = h.hall_id;

-- 5. Check if a hall is available on a specific date (e.g. Hall 1 on '2026-11-20')
SELECT COUNT(*) AS active_bookings
FROM bookings
WHERE hall_id = 1 AND event_date = '2026-11-20' AND status != 'Cancelled';
```

---

## 🚀 Running the Web Application

### Option A: Double-Click
Simply double-click `run.bat` in this folder.

### Option B: Terminal Command
```powershell
cd "C:\Users\SHAIK AATIK MANSOOR\.gemini\antigravity\scratch\online-wedding-management-system"
npm start
```

Open your browser to:
**`http://localhost:5000`**

---

## ✨ Features Breakdown

### 1. Customer Portal
- **Browse Marriage Halls**: Visual cards featuring photos, guest capacity pills, pricing per day, location pins, and included facilities tags.
- **Dynamic Search & Filters**: Search venues by keyword, city/location, minimum guest capacity, and budget.
- **Real-Time Date Availability Checker**: Select any wedding date to verify whether a hall is available or already reserved.
- **Instant Booking Engine**: Choose a venue, input wedding timings, enter contact info, and calculate total payable amount with automated collision prevention (double-booking protection).
- **Official Payment Receipt & Invoice**: Search bookings by email or phone and view or print formatted invoices with "PAID" verification stamps and transaction references.

### 2. Admin Management Portal
- **Real-time Analytics**: Total halls, available halls, total bookings, confirmed bookings, and total revenue collected.
- **Hall Management (CRUD)**: Add new halls with photos, update capacities, pricing, amenities, or delete/toggle status.
- **Reservations Control**: Review all reservations, change status (`Confirmed`, `Pending`, `Completed`, `Cancelled`) on the fly, or view receipts.
- **Payments Ledger**: Monitor payment statuses (`Paid`, `Pending`, `Partially Paid`, `Refunded`), transaction references, and payment methods.
- **Customer Directory**: View contact profiles and booking histories.

