## Overview

SkyWay is a full-stack flight reservation platform built to modernize Pakistan's air travel experience. It addresses common issues in existing systems — missing baggage tracking, limited refund options, overbooking, and fragmented booking flows — by bringing everything together in one platform.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js + Express.js |
| Database | MySQL |
| Auth | JWT + bcryptjs |
| Dev Tool | nodemon |

---

## Features

- ✅ User registration & login (JWT, bcrypt password hashing)
- ✅ Flight search by route & date
- ✅ One-way booking with seat class (Economy / Business / First) and position (Window / Middle / Aisle)
- ✅ Group booking (2–50 passengers)
- ✅ Payment via Credit Card or Debit Card
- ✅ Loyalty points (1 pt per PKR 100) with auto tier upgrades: Bronze → Silver → Gold → Platinum → Diamond
- ✅ Booking cancellation with confirmation prompt and automatic refund request
- ✅ Refund status timeline (Requested → Approved → Processed)
- ✅ Auto luggage check-in on payment with tracking number generation
- ✅ Real-time luggage tracking with visual progress steps
- ✅ Luggage tracking number shown on booking card with copy button
- ✅ Flight notifications dashboard
- ✅ Invoice auto-generated on every payment (with 15% tax)
- ✅ Password reset token flow
- ✅ User session tracking
- ✅ About page with team info and tech stack
- ✅ Responsive design (mobile-friendly)

---

## Project Structure

```
flight-reservation/
├── backend/
│   ├── server.js              ← Express entry point (serves frontend + API)
│   ├── db.js                  ← MySQL connection pool
│   ├── .env.example           ← Copy to .env and fill in your values
│   ├── middleware/
│   │   └── auth.js            ← JWT auth middleware
│   ├── routes/
│   │   ├── auth.js            ← Register, Login, Profile, Password Reset
│   │   ├── flights.js         ← Search, Add, Update flight status
│   │   ├── bookings.js        ← Book, Cancel, Group booking
│   │   ├── payments.js        ← Pay, Refund, Payment history
│   │   ├── luggage.js         ← Auto check-in, Track, Update status
│   │   └── notifications.js   ← Get/send flight notifications
│   └── package.json
├── frontend/
│   ├── index.html             ← Landing page + flight search + booking modal
│   ├── login.html             ← Login
│   ├── register.html          ← Registration
│   ├── dashboard.html         ← Bookings, payments, refunds, notifications
│   ├── luggage.html           ← Public luggage tracker
│   ├── about.html             ← About page with team info
│   ├── css/style.css          ← All styles
│   └── js/
│       ├── api.js             ← Shared Fetch API helper
│       └── app.js             ← Flight search & booking logic
└── database/
    ├── schema_mysql.sql       ← Full MySQL schema + triggers + sample data
    └── migration_v2.sql       ← Migration: refund fix + seat class columns
```

---

## Setup Instructions

### 1. Database

```bash
mysql -u root -p
```
```sql
source /path/to/database/schema_mysql.sql
```

If upgrading from an earlier version, also run:
```sql
source /path/to/database/migration_v2.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
nano .env
```

Fill in your `.env`:
```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=EnhancedFlightReservation
JWT_SECRET=any_long_random_string_here
JWT_EXPIRES_IN=7d
```

```bash
npm install
npm run dev
```

### 3. Open in Browser

```
http://localhost:3000
```

> ⚠️ Always use `http://localhost:3000` — do NOT open HTML files via Live Server or file:// as API calls will fail.

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/profile` | Yes | Get profile + loyalty tier |
| POST | `/api/auth/forgot-password` | No | Request password reset |
| POST | `/api/auth/reset-password` | No | Reset with token |
| GET | `/api/flights/search?from=&to=&date=` | No | Search flights |
| POST | `/api/flights` | Yes | Add flight |
| PATCH | `/api/flights/:id/status` | Yes | Update flight status |
| POST | `/api/bookings` | Yes | Create booking |
| GET | `/api/bookings/my` | Yes | My bookings (with luggage info) |
| DELETE | `/api/bookings/:id` | Yes | Cancel + auto refund |
| POST | `/api/bookings/group` | Yes | Group booking |
| POST | `/api/payments` | Yes | Pay + auto luggage check-in |
| GET | `/api/payments/my` | Yes | Payment history |
| GET | `/api/payments/refunds/my` | Yes | My refunds |
| GET | `/api/luggage/track/:trackingNum` | No | Track luggage (public) |
| PATCH | `/api/luggage/:id/status` | Yes | Update luggage status |
| GET | `/api/notifications` | Yes | My notifications |

---

## Database

17 tables with foreign keys, triggers, and sample data:

`Users` · `Passport` · `Flight` · `Booking` · `Luggage` · `GroupBooking` · `Refund` · `Payment` · `Hotel` · `CarRental` · `FrequentFlyer` · `FlightNotification` · `PasswordResetTokens` · `UserSessions` · `TwoFactorAuth` · `Invoice` · `InvoiceItem`

**Triggers:**
- Auto-award loyalty points on payment
- Auto-upgrade tier level when points change
- Block expired passport inserts

---

## Sample Flights

| Flight | Route | Departure |
|--------|-------|-----------|
| PK301 | Lahore → Karachi | 2025-07-01 08:00 |
| PK401 | Karachi → Islamabad | 2025-07-01 11:00 |
| PA501 | Islamabad → Lahore | 2025-07-02 06:30 |
| PK601 | Lahore → Islamabad | 2025-07-03 14:00 |
| SA201 | Karachi → Quetta | 2025-07-04 09:00 |
