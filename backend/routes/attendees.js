
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const auth = require('../middleware/auth');

// SSE connections map — attendeeId → res object
const connections = new Map();

// Ticket code is the only credential here (no password), so this is the main
// defense against someone scripting through codes. Keyed by IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8,                    // 8 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait a few minutes and try again.' },
});

// POST /api/attendees/login
router.post('/login', loginLimiter, async (req, res) => {
  const { ticket_code } = req.body;

  if (!ticket_code || typeof ticket_code !== 'string') {
    return res.status(400).json({
      error: 'Ticket code is required'
    });
  }

  // Convert to uppercase and remove accidental spaces
  const cleanTicketCode = ticket_code
    .trim()
    .toUpperCase();

  try {
    const result = await pool.query(
      `SELECT id, name, ticket_code, credits
       FROM attendees
       WHERE ticket_code = $1`,
      [cleanTicketCode]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Ticket code not found. Please check your ticket and try again.'
      });
    }

    const attendee = result.rows[0];

    const token = jwt.sign(
      {
        id: attendee.id,
        role: 'attendee'
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '24h'
      }
    );

    res.json({
      token,
      attendee
    });

  } catch (err) {
    console.error('Attendee login error:', err);

    res.status(500).json({
      error: ':( Server error'
    });
  }
});

// GET /api/attendees/me
router.get('/me', auth(['attendee']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, ticket_code, credits FROM attendees WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Attendee not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: ':( Server error' });
  }
});

// GET /api/attendees/me/transactions?page=1&limit=20
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
    res.status(500).json({ error: ':( Server error' });
  }
});

// GET /api/attendees/events — SSE endpoint
router.get('/events', (req, res) => {
  // Verify token from query param since EventSource can't set headers
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: ':| No token provided' });

  let attendeeId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'attendee') return res.status(403).json({ error: 'Forbidden' });
    attendeeId = decoded.id;
  } catch {
    return res.status(401).json({ error: ':(Invalid token' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Store this connection
  connections.set(attendeeId, res);
  console.log(`SSE connected: attendee ${attendeeId}`);

  // Heartbeat every 20s to prevent Render's 30s timeout
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 20000);

  // Cleanup when client disconnects
  req.on('close', () => {
    clearInterval(heartbeat);
    connections.delete(attendeeId);
    console.log(`SSE disconnected: attendee ${attendeeId}`);
  });
});

module.exports = { router, connections };