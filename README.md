# ✈ SkyWay — Enhanced Flight Reservation System
**COMSATS University Islamabad | FA23-BCS-033 | FA23-BCS-185 | FA23-BCS-166**

---

## Tech Stack
- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Backend:** Node.js + Express.js
- **Database:** MySQL
- **Auth:** JWT + bcryptjs

---

## Project Structure
```
flight-reservation/
├── backend/
│   ├── server.js              ← Express entry point
│   ├── db.js                  ← MySQL connection pool
│   ├── .env.example           ← Copy to .env and fill in
│   ├── middleware/
│   │   └── auth.js            ← JWT middleware
│   ├── routes/
│   │   ├── auth.js            ← Register, Login, Profile, Password Reset
│   │   ├── flights.js         ← Search, Add, Update flight status
│   │   ├── bookings.js        ← Book, Cancel, Group booking
│   │   ├── payments.js        ← Pay, Refund, Payment history
│   │   ├── luggage.js         ← Check-in luggage, Track, Update status
│   │   └── notifications.js   ← Get/send flight notifications
│   └── package.json
├── frontend/
│   ├── index.html             ← Landing page + flight search
│   ├── login.html             ← Login
│   ├── register.html          ← Registration
│   ├── dashboard.html         ← My bookings, payments, refunds, notifications
│   ├── luggage.html           ← Public luggage tracker
│   ├── css/style.css          ← All styles
│   └── js/
│       ├── api.js             ← All API calls (shared)
│       └── app.js             ← Index page logic
└── database/
    └── schema_mysql.sql       ← Full MySQL schema + sample data
```

---

## Setup Instructions

### 1. Database
```sql
-- In MySQL Workbench or terminal:
source path/to/database/schema_mysql.sql
```

### 2. Backend
```bash
cd backend

# Copy environment file and fill in your values
cp .env.example .env

# Install dependencies
npm install

# Start (development with auto-reload)
npm run dev

# OR start normally
npm start
```

Your `.env` file should look like:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=EnhancedFlightReservation
JWT_SECRET=any_long_random_string_here
JWT_EXPIRES_IN=7d
```

### 3. Frontend
Open `frontend/index.html` directly in your browser, **OR** use Live Server (VS Code extension) for best results.

The backend serves the frontend too — just open `http://localhost:5000` after starting the server.

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/profile` | Yes | Get profile + tier |
| GET | `/api/flights/search?from=&to=&date=` | No | Search flights |
| POST | `/api/flights` | Yes | Add flight |
| PATCH | `/api/flights/:id/status` | Yes | Update flight status |
| POST | `/api/bookings` | Yes | Create booking |
| GET | `/api/bookings/my` | Yes | My bookings |
| DELETE | `/api/bookings/:id` | Yes | Cancel booking |
| POST | `/api/bookings/group` | Yes | Group booking |
| POST | `/api/payments` | Yes | Make payment |
| GET | `/api/payments/my` | Yes | Payment history |
| POST | `/api/payments/refund` | Yes | Request refund |
| GET | `/api/payments/refunds/my` | Yes | My refunds |
| POST | `/api/luggage` | Yes | Check in luggage |
| GET | `/api/luggage/track/:trackingNum` | No | Track luggage (public) |
| PATCH | `/api/luggage/:id/status` | Yes | Update luggage status |
| GET | `/api/notifications` | Yes | My notifications |

---

## Features Implemented
- ✅ User registration & login (JWT auth, bcrypt hashing)
- ✅ Flight search by route & date
- ✅ One-way & group booking with seat validation
- ✅ Payment processing with loyalty points (1 pt per PKR 100)
- ✅ Auto tier upgrade: Bronze → Silver → Gold → Platinum → Diamond
- ✅ Booking cancellation with automatic refund request
- ✅ Luggage check-in & real-time status tracking
- ✅ Flight notifications
- ✅ Invoice generation on payment
- ✅ Password reset token flow
- ✅ Session tracking
- ✅ Responsive frontend (mobile-friendly)
