const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');
const crypto = require('crypto');

// Helper: generate a short unique ID
const genId = (prefix) => prefix + Math.random().toString(36).substr(2, 7).toUpperCase();

// ─── REGISTER ───────────────────────────────────────────────
// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, phoneNumber, password, country, city, area, street } = req.body;

  if (!name || !email || !password || !country || !city) {
    return res.status(400).json({ error: 'Name, email, password, country and city are required.' });
  }

  try {
    // Check duplicate email
    const [existing] = await db.query('SELECT userId FROM Users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = genId('U');

    await db.query(
      `INSERT INTO Users (userId, name, email, phoneNumber, passwordHash, salt, country, city, area, street, loyaltyPoints)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [userId, name, email, phoneNumber || null, passwordHash, salt, country, city, area || null, street || null]
    );

    // Auto-create FrequentFlyer entry
    await db.query(
      `INSERT INTO FrequentFlyer (frequentFlyerId, userId, loyaltyPoints, tierLevel) VALUES (?, ?, 0, 'Bronze')`,
      [genId('FF'), userId]
    );

    const token = jwt.sign({ userId, name, email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    res.status(201).json({ message: 'Registration successful.', token, userId, name, email });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────
// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const [users] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Create session
    const sessionId = crypto.randomBytes(32).toString('hex');
    await db.query(
      `INSERT INTO UserSessions (sessionId, userId, loginTime, lastActivity, ipAddress, userAgent)
       VALUES (?, ?, NOW(), NOW(), ?, ?)`,
      [sessionId, user.userId, req.ip, req.headers['user-agent'] || '']
    );

    const token = jwt.sign(
      { userId: user.userId, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: { userId: user.userId, name: user.name, email: user.email, loyaltyPoints: user.loyaltyPoints }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ─── GET PROFILE ─────────────────────────────────────────────
// GET /api/auth/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT u.userId, u.name, u.email, u.phoneNumber, u.loyaltyPoints, u.country, u.city,
              ff.tierLevel, ff.loyaltyPoints AS ffPoints
       FROM Users u
       LEFT JOIN FrequentFlyer ff ON u.userId = ff.userId
       WHERE u.userId = ?`,
      [req.user.userId]
    );

    if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(users[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── FORGOT PASSWORD ─────────────────────────────────────────
// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const [users] = await db.query('SELECT userId FROM Users WHERE email = ?', [email]);
    // Always return success to prevent email enumeration
    if (users.length === 0) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    await db.query(
      `INSERT INTO PasswordResetTokens (tokenId, userId, token, expiry, used) VALUES (?, ?, ?, ?, 0)`,
      [genId('PR'), users[0].userId, token, expiry]
    );

    // In a real app, send email here with the token
    console.log(`Password reset token for ${email}: ${token}`);

    res.json({ message: 'If that email exists, a reset link has been sent.', devToken: token });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── RESET PASSWORD ──────────────────────────────────────────
// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required.' });

  try {
    const [tokens] = await db.query(
      `SELECT * FROM PasswordResetTokens WHERE token = ? AND used = 0 AND expiry > NOW()`,
      [token]
    );

    if (tokens.length === 0) return res.status(400).json({ error: 'Invalid or expired reset token.' });

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE Users SET passwordHash = ?, salt = ? WHERE userId = ?', [passwordHash, salt, tokens[0].userId]);
    await db.query('UPDATE PasswordResetTokens SET used = 1 WHERE token = ?', [token]);

    res.json({ message: 'Password reset successful. Please log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
