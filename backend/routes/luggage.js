const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

const genId = (prefix) => prefix + Math.random().toString(36).substr(2, 7).toUpperCase();

// ─── ADD LUGGAGE TO BOOKING ───────────────────────────────────
// POST /api/luggage
router.post('/', auth, async (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) return res.status(400).json({ error: 'bookingId is required.' });

  try {
    // Verify booking belongs to user
    const [bookings] = await db.query(
      'SELECT bookingId FROM Booking WHERE bookingId = ? AND userId = ?',
      [bookingId, req.user.userId]
    );
    if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found or unauthorized.' });

    const luggageId = genId('L');
    const trackingNumber = 'TRK' + Math.random().toString(36).substr(2, 6).toUpperCase();

    await db.query(
      `INSERT INTO Luggage (luggageId, bookingId, status, location, trackingNumber)
       VALUES (?, ?, 'Checked-in', 'Check-in Counter', ?)`,
      [luggageId, bookingId, trackingNumber]
    );

    res.status(201).json({ message: 'Luggage checked in.', luggageId, trackingNumber });
  } catch (err) {
    console.error('Add luggage error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── TRACK BY TRACKING NUMBER (public) ───────────────────────
// GET /api/luggage/track/:trackingNumber
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.luggageId, l.status, l.location, l.trackingNumber,
              u.name AS passengerName,
              f.flightNumber, f.fromLocation, f.toLocation, f.status AS flightStatus
       FROM Luggage l
       JOIN Booking b ON l.bookingId = b.bookingId
       JOIN Users u ON b.userId = u.userId
       JOIN Flight f ON b.flightId = f.flightId
       WHERE l.trackingNumber = ?`,
      [req.params.trackingNumber]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Tracking number not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Track luggage error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET LUGGAGE FOR MY BOOKING ───────────────────────────────
// GET /api/luggage/booking/:bookingId
router.get('/booking/:bookingId', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.*
       FROM Luggage l
       JOIN Booking b ON l.bookingId = b.bookingId
       WHERE l.bookingId = ? AND b.userId = ?`,
      [req.params.bookingId, req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── UPDATE LUGGAGE STATUS (admin/staff) ─────────────────────
// PATCH /api/luggage/:luggageId/status
router.patch('/:luggageId/status', auth, async (req, res) => {
  const { status, location } = req.body;

  const validStatuses = ['Checked-in', 'In Transit', 'Delivered', 'Lost'];
  const validLocations = ['Check-in Counter', 'Security Check', 'Sorting Area', 'Loaded on Flight', 'In Transit', 'Baggage Claim', 'Delivered', 'Lost and Found'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  if (location && !validLocations.includes(location)) {
    return res.status(400).json({ error: 'Invalid location.' });
  }

  try {
    await db.query(
      'UPDATE Luggage SET status = ?, location = ? WHERE luggageId = ?',
      [status, location || null, req.params.luggageId]
    );
    res.json({ message: 'Luggage status updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
