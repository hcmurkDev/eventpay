const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const auth = require('../middleware/auth');
const { connections } = require('./attendees'); // import SSE connections

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


// POST /api/stalls/login  — email only, stall must be created by admin
router.post('/login', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }
  const cleanEmail = email.toLowerCase().trim();
  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, earned FROM stalls WHERE email = $1',
      [cleanEmail]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Stall not found. Ask the event organizer to register your stall.' });
    }
    const stall = result.rows[0];
    const token = jwt.sign({ id: stall.id, role: 'stall' }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, stall });
  } catch (err) {
    console.error('Stall login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/stalls/me
router.get('/me', auth(['stall']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, earned FROM stalls WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Stall not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/stalls/me/transactions?page=1&limit=20
router.get('/me/transactions', auth(['stall']), async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(50, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  try {
    const result = await pool.query(
      `SELECT t.id, t.amount, t.created_at, a.name AS attendee_name
       FROM transactions t
       JOIN attendees a ON t.attendee_id = a.id
       WHERE t.stall_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/stalls/attendee/:id  — look up attendee before charging
router.get('/attendee/:id', auth(['stall']), async (req, res) => {
  if (!UUID_RE.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid attendee ID' });
  }
  try {
    const result = await pool.query(
      'SELECT id, name, credits FROM attendees WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Attendee not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/stalls/charge  — atomic credit transfer
router.post('/charge', auth(['stall']), async (req, res) => {
  const { attendee_id, amount } = req.body;
  const parsedAmount = parseInt(amount);

  if (!attendee_id || !parsedAmount || parsedAmount <= 0 || parsedAmount > 10000) {
    return res.status(400).json({ error: 'Valid attendee_id and positive amount required' });
  }
  if (!UUID_RE.test(attendee_id)) {
    return res.status(400).json({ error: 'Invalid attendee ID' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const attResult = await client.query(
      'SELECT id, name, credits FROM attendees WHERE id = $1 FOR UPDATE',
      [attendee_id]
    );
    if (!attResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Attendee not found' });
    }
    const attendee = attResult.rows[0];
    if (attendee.credits < parsedAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Insufficient credits. Attendee has ${attendee.credits} credits.` });
    }
    await client.query('UPDATE attendees SET credits = credits - $1 WHERE id = $2', [parsedAmount, attendee_id]);
    await client.query('UPDATE stalls SET earned = earned + $1 WHERE id = $2',      [parsedAmount, req.user.id]);
    const txResult = await client.query(
      'INSERT INTO transactions (attendee_id, stall_id, amount) VALUES ($1, $2, $3) RETURNING id, amount, created_at',
      [attendee_id, req.user.id, parsedAmount]
    );
    await client.query('COMMIT');

    // Push SSE update to attendee if they are connected
    const newCredits = attendee.credits - parsedAmount;
    const sseConn = connections.get(attendee_id);
    if (sseConn) {
      sseConn.write(`data: ${JSON.stringify({ credits: newCredits })}\n\n`);
      console.log(`SSE pushed to attendee ${attendee_id}: credits = ${newCredits}`);
    }

    res.json({ transaction: txResult.rows[0], attendee_name: attendee.name, credits_remaining: newCredits });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Charge error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;

// router.post('/charge', auth(['stall']), async (req, res) => {
//   const { attendee_id, amount } = req.body;
//   const parsedAmount = parseInt(amount);

//   if (!attendee_id || !parsedAmount || parsedAmount <= 0 || parsedAmount > 10000) {
//     return res.status(400).json({ error: 'Valid attendee_id and positive amount required' });
//   }
//   if (!UUID_RE.test(attendee_id)) {
//     return res.status(400).json({ error: 'Invalid attendee ID' });
//   }

//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');
//     const attResult = await client.query(
//       'SELECT id, name, credits FROM attendees WHERE id = $1 FOR UPDATE',
//       [attendee_id]
//     );
//     if (!attResult.rows.length) {
//       await client.query('ROLLBACK');
//       return res.status(404).json({ error: 'Attendee not found' });
//     }
//     const attendee = attResult.rows[0];
//     if (attendee.credits < parsedAmount) {
//       await client.query('ROLLBACK');
//       return res.status(400).json({ error: `Insufficient credits. Attendee has ${attendee.credits} credits.` });
//     }
//     await client.query('UPDATE attendees SET credits = credits - $1 WHERE id = $2', [parsedAmount, attendee_id]);
//     await client.query('UPDATE stalls SET earned = earned + $1 WHERE id = $2',      [parsedAmount, req.user.id]);
//     const txResult = await client.query(
//       'INSERT INTO transactions (attendee_id, stall_id, amount) VALUES ($1, $2, $3) RETURNING id, amount, created_at',
//       [attendee_id, req.user.id, parsedAmount]
//     );
//     await client.query('COMMIT');
//     res.json({ transaction: txResult.rows[0], attendee_name: attendee.name, credits_remaining: attendee.credits - parsedAmount });
//   } catch (err) {
//     await client.query('ROLLBACK');
//     console.error('Charge error:', err);
//     res.status(500).json({ error: 'Server error' });
//   } finally {
//     client.release();
//   }
// });

// module.exports = router;
