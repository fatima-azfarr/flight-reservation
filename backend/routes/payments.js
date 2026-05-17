const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

const genId = (prefix) => prefix + Math.random().toString(36).substr(2, 7).toUpperCase();

// ─── MAKE PAYMENT ─────────────────────────────────────────────
// POST /api/payments
router.post('/', auth, async (req, res) => {
  const { bookingId, paymentMethod, paymentAmount } = req.body;

  if (!bookingId || !paymentMethod || !paymentAmount) {
    return res.status(400).json({ error: 'bookingId, paymentMethod and paymentAmount are required.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Verify booking belongs to user
    const [bookings] = await conn.query(
      'SELECT * FROM Booking WHERE bookingId = ? AND userId = ?',
      [bookingId, req.user.userId]
    );
    if (bookings.length === 0) throw new Error('Booking not found or unauthorized.');
    if (bookings[0].paymentStatus === 'Completed') throw new Error('Booking already paid.');

    const paymentId = genId('PAY');
    await conn.query(
      `INSERT INTO Payment (paymentId, bookingId, paymentDate, paymentMethod, paymentStatus, paymentAmount)
       VALUES (?, ?, NOW(), ?, 'Completed', ?)`,
      [paymentId, bookingId, paymentMethod, paymentAmount]
    );

    // Update booking payment status
    await conn.query(
      `UPDATE Booking SET paymentStatus = 'Completed' WHERE bookingId = ?`,
      [bookingId]
    );

    // Add loyalty points (1 point per 100 PKR)
    const pointsEarned = Math.floor(paymentAmount / 100);
    if (pointsEarned > 0) {
      await conn.query(
        'UPDATE Users SET loyaltyPoints = loyaltyPoints + ? WHERE userId = ?',
        [pointsEarned, req.user.userId]
      );
      // Update frequent flyer too
      await conn.query(
        'UPDATE FrequentFlyer SET loyaltyPoints = loyaltyPoints + ? WHERE userId = ?',
        [pointsEarned, req.user.userId]
      );
    }

    // Generate invoice
    const invoiceId = genId('INV');
    const invoiceNumber = 'INV-' + Date.now();
    const taxAmount = +(paymentAmount * 0.15).toFixed(2);
    const totalWithTax = +(+paymentAmount + taxAmount).toFixed(2);

    await conn.query(
      `INSERT INTO Invoice (invoiceId, bookingId, invoiceNumber, issueDate, dueDate, totalAmount, taxAmount, discountAmount, status, paymentMethod, paymentDate)
       VALUES (?, ?, ?, NOW(), NOW(), ?, ?, 0, 'Paid', ?, NOW())`,
      [invoiceId, bookingId, invoiceNumber, totalWithTax, taxAmount, paymentMethod]
    );

    // Auto-create luggage entry
    const luggageId = 'L' + Math.random().toString(36).substr(2, 7).toUpperCase();
    const trackingNumber = 'TRK' + Math.random().toString(36).substr(2, 6).toUpperCase();
    await conn.query(
      `INSERT INTO Luggage (luggageId, bookingId, status, location, trackingNumber)
       VALUES (?, ?, 'Checked-in', 'Check-in Counter', ?)`,
      [luggageId, bookingId, trackingNumber]
    );

    await conn.commit();
    res.status(201).json({
      message: 'Payment successful.',
      paymentId,
      invoiceId,
      invoiceNumber,
      pointsEarned,
      trackingNumber
    });
  } catch (err) {
    await conn.rollback();
    console.error('Payment error:', err.message);
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ─── GET MY PAYMENTS ──────────────────────────────────────────
// GET /api/payments/my
router.get('/my', auth, async (req, res) => {
  try {
    const [payments] = await db.query(
      `SELECT p.*, b.seatNumber, f.flightNumber, f.fromLocation, f.toLocation
       FROM Payment p
       JOIN Booking b ON p.bookingId = b.bookingId
       JOIN Flight f ON b.flightId = f.flightId
       WHERE b.userId = ?
       ORDER BY p.paymentDate DESC`,
      [req.user.userId]
    );
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── REQUEST REFUND ───────────────────────────────────────────
// POST /api/payments/refund
router.post('/refund', auth, async (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) return res.status(400).json({ error: 'bookingId is required.' });

  try {
    const [bookings] = await db.query(
      'SELECT * FROM Booking WHERE bookingId = ? AND userId = ?',
      [bookingId, req.user.userId]
    );
    if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found.' });

    // Check no existing refund
    const [existing] = await db.query(
      `SELECT refundId FROM Refund WHERE bookingId = ? AND status IN ('Requested', 'Approved')`,
      [bookingId]
    );
    if (existing.length > 0) return res.status(409).json({ error: 'A refund request already exists for this booking.' });

    const refundId = genId('R');
    await db.query(
      `INSERT INTO Refund (refundId, bookingId, refundAmount, status, requestDate)
       VALUES (?, ?, ?, 'Requested', NOW())`,
      [refundId, bookingId, bookings[0].totalAmount]
    );

    res.status(201).json({ message: 'Refund requested successfully.', refundId });
  } catch (err) {
    console.error('Refund request error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});


// ─── GET MY REFUNDS ───────────────────────────────────────────
// GET /api/payments/refunds/my
router.get('/refunds/my', auth, async (req, res) => {
  try {
    const [refunds] = await db.query(
      `SELECT refundId, refundAmount, status, requestDate, processedDate,
              flightNumber, fromLocation, toLocation
       FROM Refund
       WHERE userId = ?
       ORDER BY requestDate DESC`,
      [req.user.userId]
    );
    res.json(refunds);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
