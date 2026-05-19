const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const auth = require('../middleware/auth');

// POST /api/attendees/login  — email only, must already be in DB (imported by admin)
router.post('/login', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  // Basic email format check (OWASP A03)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Select only columns we need — no SELECT *
    const result = await pool.query(
      'SELECT id, name, email, credits FROM attendees WHERE email = $1',
      [cleanEmail]
    );
    if (!result.rows.length) {
      // Don't reveal whether email exists vs wrong password (OWASP A07)
      return res.status(404).json({
        error: 'Email not found. Please purchase a ticket to attend this event.'
      });
    }

    const attendee = result.rows[0];
    const token = jwt.sign(
      { id: attendee.id, role: 'attendee' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, attendee });
  } catch (err) {
    console.error('Attendee login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/attendees/me
router.get('/me', auth(['attendee']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, credits FROM attendees WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Attendee not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/attendees/me/transactions?page=1&limit=20
// Paginated — never return unbounded result sets
router.get('/me/transactions', auth(['attendee']), async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      `SELECT t.id, t.amount, t.created_at, s.name AS stall_name
       FROM transactions t
       JOIN stalls s ON t.stall_id = s.id
       WHERE t.attendee_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
