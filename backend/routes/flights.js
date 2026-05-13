const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

const genId = (prefix) => prefix + Math.random().toString(36).substr(2, 7).toUpperCase();

// ─── SEARCH FLIGHTS ──────────────────────────────────────────
// GET /api/flights/search?from=Lahore&to=Karachi&date=2025-06-01
router.get('/search', async (req, res) => {
  const { from, to, date } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: 'from and to locations are required.' });
  }

  try {
    let query = `
      SELECT flightId, flightNumber, departureTime, arrivalTime,
             fromLocation, toLocation, availableSeats, status
      FROM Flight
      WHERE fromLocation LIKE ? AND toLocation LIKE ?
        AND status NOT IN ('Cancelled', 'Landed')
    `;
    const params = [`%${from}%`, `%${to}%`];

    if (date) {
      query += ' AND DATE(departureTime) = ?';
      params.push(date);
    }

    query += ' ORDER BY departureTime ASC';

    const [flights] = await db.query(query, params);
    res.json(flights);
  } catch (err) {
    console.error('Flight search error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET ALL FLIGHTS (admin/listing) ─────────────────────────
// GET /api/flights
router.get('/', async (req, res) => {
  try {
    const [flights] = await db.query(
      `SELECT * FROM Flight ORDER BY departureTime ASC`
    );
    res.json(flights);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET SINGLE FLIGHT ────────────────────────────────────────
// GET /api/flights/:flightId
router.get('/:flightId', async (req, res) => {
  try {
    const [flights] = await db.query('SELECT * FROM Flight WHERE flightId = ?', [req.params.flightId]);
    if (flights.length === 0) return res.status(404).json({ error: 'Flight not found.' });
    res.json(flights[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── ADD FLIGHT (admin) ───────────────────────────────────────
// POST /api/flights
router.post('/', auth, async (req, res) => {
  const { flightNumber, departureTime, arrivalTime, fromLocation, toLocation, availableSeats, status } = req.body;

  if (!flightNumber || !departureTime || !arrivalTime || !fromLocation || !toLocation || !availableSeats) {
    return res.status(400).json({ error: 'All flight fields are required.' });
  }

  try {
    const flightId = genId('F');
    await db.query(
      `INSERT INTO Flight (flightId, flightNumber, departureTime, arrivalTime, fromLocation, toLocation, availableSeats, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [flightId, flightNumber, departureTime, arrivalTime, fromLocation, toLocation, availableSeats, status || 'Scheduled']
    );
    res.status(201).json({ message: 'Flight added successfully.', flightId });
  } catch (err) {
    console.error('Add flight error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── UPDATE FLIGHT STATUS ─────────────────────────────────────
// PATCH /api/flights/:flightId/status
router.patch('/:flightId/status', auth, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Scheduled', 'Boarding', 'Departed', 'In-Air', 'Delayed', 'Landed', 'Cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  try {
    await db.query('UPDATE Flight SET status = ? WHERE flightId = ?', [status, req.params.flightId]);
    res.json({ message: 'Flight status updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
