const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

const genId = (prefix) => prefix + Math.random().toString(36).substr(2, 7).toUpperCase();

// ─── CREATE BOOKING ───────────────────────────────────────────
// POST /api/bookings
router.post('/', auth, async (req, res) => {
  const { flightId, seatNumber, totalAmount } = req.body;
  const userId = req.user.userId;

  if (!flightId || !seatNumber || !totalAmount) {
    return res.status(400).json({ error: 'flightId, seatNumber and totalAmount are required.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Check seat availability
    const [flights] = await conn.query('SELECT availableSeats FROM Flight WHERE flightId = ?', [flightId]);
    if (flights.length === 0) throw new Error('Flight not found.');
    if (flights[0].availableSeats <= 0) throw new Error('No available seats on this flight.');

    // Check seat not already taken
    const [taken] = await conn.query(
      'SELECT bookingId FROM Booking WHERE flightId = ? AND seatNumber = ?',
      [flightId, seatNumber]
    );
    if (taken.length > 0) throw new Error('That seat is already booked.');

    const bookingId = genId('B');
    await conn.query(
      `INSERT INTO Booking (bookingId, userId, flightId, bookingDate, seatNumber, paymentStatus, totalAmount)
       VALUES (?, ?, ?, NOW(), ?, 'Pending', ?)`,
      [bookingId, userId, flightId, seatNumber, totalAmount]
    );

    // Decrease available seats
    await conn.query('UPDATE Flight SET availableSeats = availableSeats - 1 WHERE flightId = ?', [flightId]);

    await conn.commit();
    res.status(201).json({ message: 'Booking created successfully.', bookingId });
  } catch (err) {
    await conn.rollback();
    console.error('Booking error:', err.message);
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ─── GET MY BOOKINGS ──────────────────────────────────────────
// GET /api/bookings/my
router.get('/my', auth, async (req, res) => {
  try {
    const [bookings] = await db.query(
      `SELECT b.bookingId, b.bookingDate, b.seatNumber, b.paymentStatus, b.totalAmount,
              f.flightNumber, f.fromLocation, f.toLocation, f.departureTime, f.arrivalTime, f.status AS flightStatus
       FROM Booking b
       JOIN Flight f ON b.flightId = f.flightId
       WHERE b.userId = ?
       ORDER BY b.bookingDate DESC`,
      [req.user.userId]
    );
    res.json(bookings);
  } catch (err) {
    console.error('My bookings error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET SINGLE BOOKING ───────────────────────────────────────
// GET /api/bookings/:bookingId
router.get('/:bookingId', auth, async (req, res) => {
  try {
    const [bookings] = await db.query(
      `SELECT b.*, u.name AS userName, u.email,
              f.flightNumber, f.fromLocation, f.toLocation, f.departureTime, f.arrivalTime, f.status AS flightStatus
       FROM Booking b
       JOIN Users u ON b.userId = u.userId
       JOIN Flight f ON b.flightId = f.flightId
       WHERE b.bookingId = ? AND b.userId = ?`,
      [req.params.bookingId, req.user.userId]
    );
    if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found.' });
    res.json(bookings[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── CANCEL BOOKING ───────────────────────────────────────────
// DELETE /api/bookings/:bookingId
router.delete('/:bookingId', auth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [bookings] = await conn.query(
      'SELECT * FROM Booking WHERE bookingId = ? AND userId = ?',
      [req.params.bookingId, req.user.userId]
    );
    if (bookings.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Booking not found or unauthorized.' });
    }

    const booking = bookings[0];

    // Create refund entry
    const refundId = genId('R');
    await conn.query(
      `INSERT INTO Refund (refundId, bookingId, refundAmount, status, requestDate)
       VALUES (?, ?, ?, 'Requested', NOW())`,
      [refundId, booking.bookingId, booking.totalAmount]
    );

    // Restore seat
    await conn.query('UPDATE Flight SET availableSeats = availableSeats + 1 WHERE flightId = ?', [booking.flightId]);

    // Delete booking
    await conn.query('DELETE FROM Booking WHERE bookingId = ?', [booking.bookingId]);

    await conn.commit();
    res.json({ message: 'Booking cancelled. Refund has been requested.', refundId });
  } catch (err) {
    await conn.rollback();
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    conn.release();
  }
});

// ─── GROUP BOOKING ────────────────────────────────────────────
// POST /api/bookings/group
router.post('/group', auth, async (req, res) => {
  const { flightId, totalPeople, totalAmount } = req.body;
  const userId = req.user.userId;

  if (!flightId || !totalPeople || totalPeople < 2) {
    return res.status(400).json({ error: 'flightId and totalPeople (min 2) are required.' });
  }

  try {
    const [flights] = await db.query('SELECT availableSeats FROM Flight WHERE flightId = ?', [flightId]);
    if (flights.length === 0) return res.status(404).json({ error: 'Flight not found.' });
    if (flights[0].availableSeats < totalPeople) {
      return res.status(400).json({ error: `Only ${flights[0].availableSeats} seats available.` });
    }

    const groupBookingId = genId('G');
    await db.query(
      `INSERT INTO GroupBooking (groupBookingId, userId, flightId, totalPeople, totalAmount)
       VALUES (?, ?, ?, ?, ?)`,
      [groupBookingId, userId, flightId, totalPeople, totalAmount || 0]
    );

    await db.query(
      'UPDATE Flight SET availableSeats = availableSeats - ? WHERE flightId = ?',
      [totalPeople, flightId]
    );

    res.status(201).json({ message: 'Group booking created.', groupBookingId });
  } catch (err) {
    console.error('Group booking error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
