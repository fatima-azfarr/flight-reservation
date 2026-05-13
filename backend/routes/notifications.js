const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ─── GET MY NOTIFICATIONS ─────────────────────────────────────
// GET /api/notifications
router.get('/', auth, async (req, res) => {
  try {
    const [notifications] = await db.query(
      `SELECT fn.notificationId, fn.message, fn.notificationDate,
              f.flightNumber, f.fromLocation, f.toLocation, f.status AS flightStatus
       FROM FlightNotification fn
       JOIN Flight f ON fn.flightId = f.flightId
       WHERE fn.userId = ?
       ORDER BY fn.notificationDate DESC
       LIMIT 50`,
      [req.user.userId]
    );
    res.json(notifications);
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── SEND NOTIFICATION (admin/system) ────────────────────────
// POST /api/notifications
router.post('/', auth, async (req, res) => {
  const { userId, flightId, message } = req.body;
  if (!userId || !flightId || !message) {
    return res.status(400).json({ error: 'userId, flightId and message are required.' });
  }

  try {
    const notifId = 'N' + Math.random().toString(36).substr(2, 7).toUpperCase();
    await db.query(
      `INSERT INTO FlightNotification (notificationId, userId, flightId, message, notificationDate)
       VALUES (?, ?, ?, ?, NOW())`,
      [notifId, userId, flightId, message]
    );
    res.status(201).json({ message: 'Notification sent.', notifId });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
