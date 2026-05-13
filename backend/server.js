const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── ROUTES ───────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/flights',       require('./routes/flights'));
app.use('/api/bookings',      require('./routes/bookings'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/luggage',       require('./routes/luggage'));
app.use('/api/notifications', require('./routes/notifications'));

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Flight Reservation API is running.' });
});

// ─── CATCH-ALL: serve frontend for any non-API route ─────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── START SERVER ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
