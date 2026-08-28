const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { Readable } = require('stream');
const { pool } = require('../db');
const auth = require('../middleware/auth');

// Multer — memory storage, Excel/CSV only, 5MB max
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only .xlsx, .xls, or .csv files are allowed'), ok);
  },
});

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { pin } = req.body;
  if (!pin || typeof pin !== 'string') return res.status(400).json({ error: 'PIN required' });
  if (pin !== process.env.ADMIN_PIN) return res.status(401).json({ error: 'Invalid PIN' });
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// GET /api/admin/overview  — aggregates only, no full table scan
router.get('/overview', auth(['admin']), async (req, res) => {
  try {
    const [atts, stalls, txs] = await Promise.all([
      pool.query('SELECT COUNT(*) AS count, COALESCE(SUM(credits),0) AS total_remaining FROM attendees'),
      pool.query('SELECT COUNT(*) AS count, COALESCE(SUM(earned),0) AS total_earned FROM stalls'),
      pool.query('SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS total_spent FROM transactions'),
    ]);
    res.json({
      attendees:              parseInt(atts.rows[0].count),
      stalls:                 parseInt(stalls.rows[0].count),
      total_credits_remaining:parseInt(atts.rows[0].total_remaining),
      total_credits_earned:   parseInt(stalls.rows[0].total_earned),
      total_transactions:     parseInt(txs.rows[0].count),
      total_credits_spent:    parseInt(txs.rows[0].total_spent),
      credit_to_cash:         parseFloat(process.env.CREDIT_TO_CASH) || 1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/stalls?page=1&limit=50
router.get('/stalls', auth(['admin']), async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const offset = (page - 1) * limit;
  try {
    const result = await pool.query(
      `SELECT s.id, s.name, s.email, s.earned, s.created_at, COUNT(t.id)::int AS tx_count
       FROM stalls s
       LEFT JOIN transactions t ON s.id = t.stall_id
       GROUP BY s.id
       ORDER BY s.earned DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/admin/attendees?page=1&limit=50&search=ticket_code
router.get('/attendees', auth(['admin']), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const offset = (page - 1) * limit;

  const search = req.query.search
    ? `%${req.query.search.toLowerCase().trim()}%`
    : null;

  try {
    const result = search
      ? await pool.query(
          `SELECT
              a.id,
              a.name,
              a.ticket_code,
              a.credits,
              a.created_at,
              COUNT(t.id)::int AS tx_count
           FROM attendees a
           LEFT JOIN transactions t
             ON a.id = t.attendee_id
           WHERE
             LOWER(a.ticket_code) LIKE $1
             OR LOWER(a.name) LIKE $1
           GROUP BY a.id
           ORDER BY a.created_at DESC
           LIMIT $2 OFFSET $3`,
          [search, limit, offset]
        )
      : await pool.query(
          `SELECT
              a.id,
              a.name,
              a.ticket_code,
              a.credits,
              a.created_at,
              COUNT(t.id)::int AS tx_count
           FROM attendees a
           LEFT JOIN transactions t
             ON a.id = t.attendee_id
           GROUP BY a.id
           ORDER BY a.created_at DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );

    res.json(result.rows);

  } catch (err) {
    console.error('Get attendees error:', err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

// POST /api/admin/stalls  — admin creates a stall (name + email)
router.post('/stalls', auth(['admin']), async (req, res) => {
  const { name, email } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Stall name required' });
  }
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Stall owner email required' });
  }
  const cleanEmail = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  try {
    const nameExists = await pool.query('SELECT id FROM stalls WHERE LOWER(name) = $1', [name.toLowerCase().trim()]);
    if (nameExists.rows.length) return res.status(409).json({ error: 'Stall name already exists' });
    const emailExists = await pool.query('SELECT id FROM stalls WHERE email = $1', [cleanEmail]);
    if (emailExists.rows.length) return res.status(409).json({ error: 'Email already registered to another stall' });

    const result = await pool.query(
      'INSERT INTO stalls (name, email) VALUES ($1, $2) RETURNING id, name, email, earned, created_at',
      [name.trim(), cleanEmail]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/stalls/:id
router.delete('/stalls/:id', auth(['admin']), async (req, res) => {
  try {
    await pool.query('DELETE FROM stalls WHERE id = $1', [req.params.id]);
    res.json({ message: 'Stall deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/attendees
// Admin creates a single attendee using name + ticket code
router.post('/attendees', auth(['admin']), async (req, res) => {
  const { name, ticket_code, credits } = req.body;

  // Validate name
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      error: 'Attendee name is required'
    });
  }

  // Validate ticket code
  if (!ticket_code || typeof ticket_code !== 'string' || !ticket_code.trim()) {
    return res.status(400).json({
      error: 'Ticket code is required'
    });
  }

  // Standardize the ticket code
  const cleanTicketCode = ticket_code
    .trim()
    .toUpperCase();

  // Basic safety limits
  if (cleanTicketCode.length < 4 || cleanTicketCode.length > 100) {
    return res.status(400).json({
      error: 'Ticket code must be between 4 and 100 characters'
    });
  }

  // Optional format validation
  // Allows letters, numbers and hyphens
  if (!/^[A-Z0-9-]+$/.test(cleanTicketCode)) {
    return res.status(400).json({
      error: 'Ticket code can only contain letters, numbers, and hyphens'
    });
  }

  // Default credits from environment
  const defaultCredits =
    parseInt(process.env.STARTING_CREDITS) || 300;

  // Allow admin to override credits
  const parsedCredits =
    credits !== undefined &&
    credits !== null &&
    credits !== ''
      ? parseInt(credits)
      : defaultCredits;

  if (
    isNaN(parsedCredits) ||
    parsedCredits < 0 ||
    parsedCredits > 100000
  ) {
    return res.status(400).json({
      error: 'Credits must be a number between 0 and 100000'
    });
  }

  try {

    // Check whether ticket code already exists
    const exists = await pool.query(
      `SELECT id
       FROM attendees
       WHERE ticket_code = $1`,
      [cleanTicketCode]
    );

    if (exists.rows.length) {
      return res.status(409).json({
        error: 'This ticket code is already registered'
      });
    }

    // Create attendee
    const result = await pool.query(
      `INSERT INTO attendees (
        name,
        ticket_code,
        credits
      )
      VALUES ($1, $2, $3)
      RETURNING
        id,
        name,
        ticket_code,
        credits,
        created_at`,
      [
        name.trim(),
        cleanTicketCode,
        parsedCredits
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {

    console.error('Create attendee error:', err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

// DELETE /api/admin/attendees/:id
router.delete('/attendees/:id', auth(['admin']), async (req, res) => {
  try {
    await pool.query('DELETE FROM attendees WHERE id = $1', [req.params.id]);
    res.json({ message: 'Attendee deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/attendees/import — bulk import from Excel/CSV using exceljs
router.post('/attendees/import', auth(['admin']), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const workbook = new ExcelJS.Workbook();
    const stream = Readable.from(req.file.buffer);
    const ext = req.file.originalname.toLowerCase();

    // Read CSV or Excel file
    if (ext.endsWith('.csv')) {
      await workbook.csv.read(stream);
    } else {
      await workbook.xlsx.read(stream);
    }

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return res.status(400).json({ error: 'File has no worksheets' });
    }

    // Read header row
    // Supports:
    // Name | Ticket Code | Credits
    // or positional columns:
    // A = Name, B = Ticket Code, C = Credits
    const headerRow = worksheet.getRow(1);

    let nameCol = -1;
    let ticketCodeCol = -1;
    let creditsCol = -1;
    let hasHeaders = false;

    headerRow.eachCell((cell, colNum) => {
      const val = String(cell.value || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_');

      if (val === 'name') {
        nameCol = colNum;
        hasHeaders = true;
      }

      if (
        val === 'ticket_code' ||
        val === 'ticketcode' ||
        val === 'ticket'
      ) {
        ticketCodeCol = colNum;
        hasHeaders = true;
      }

      if (val === 'credits') {
        creditsCol = colNum;
        hasHeaders = true;
      }
    });

    // No headers found
    // Assume:
    // A = Name
    // B = Ticket Code
    // C = Credits
    if (!hasHeaders) {
      nameCol = 1;
      ticketCodeCol = 2;
      creditsCol = 3;
    }

    // Validate required columns
    if (nameCol === -1 || ticketCodeCol === -1) {
      return res.status(400).json({
        error: 'Could not find name and ticket code columns. Use Name and Ticket Code, or columns A and B.'
      });
    }

    const defaultCredits = parseInt(process.env.STARTING_CREDITS) || 300;

    let imported = 0;
    let skipped = 0;
    const errors = [];

    // Track duplicates inside the uploaded file
    const seenTicketCodes = new Set();

    // Start at row 2 because row 1 is normally the header
    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);

      const name = String(row.getCell(nameCol).value || '').trim();

      const ticketCode = String(
        row.getCell(ticketCodeCol).value || ''
      )
        .trim()
        .toUpperCase();

      const rawCredits = creditsCol > 0
        ? row.getCell(creditsCol).value
        : null;

      const credits = rawCredits !== null && rawCredits !== ''
        ? parseInt(rawCredits)
        : defaultCredits;

      // Skip completely empty rows
      if (!name && !ticketCode) {
        continue;
      }

      // Name and ticket code are required
      if (!name || !ticketCode) {
        errors.push(`Row ${r}: name and ticket code are required`);
        skipped++;
        continue;
      }

      // Validate ticket code length
      if (ticketCode.length < 4 || ticketCode.length > 100) {
        errors.push(`Row ${r}: invalid ticket code "${ticketCode}"`);
        skipped++;
        continue;
      }

      // Only allow letters, numbers and hyphens
      if (!/^[A-Z0-9-]+$/.test(ticketCode)) {
        errors.push(`Row ${r}: ticket code "${ticketCode}" contains invalid characters`);
        skipped++;
        continue;
      }

      // Check duplicate inside Excel/CSV file
      if (seenTicketCodes.has(ticketCode)) {
        errors.push(`Row ${r}: duplicate ticket code "${ticketCode}" in this file`);
        skipped++;
        continue;
      }

      seenTicketCodes.add(ticketCode);

      // Validate credits
      if (isNaN(credits) || credits < 0 || credits > 100000) {
        errors.push(`Row ${r}: invalid credits value "${rawCredits}"`);
        skipped++;
        continue;
      }

      // Clean values
      const safeName = name
        .replace(/<[^>]*>/g, '')
        .slice(0, 255);

      const safeTicketCode = ticketCode.slice(0, 100);

      try {
        const result = await pool.query(
          `INSERT INTO attendees (name, ticket_code, credits)
           VALUES ($1, $2, $3)
           ON CONFLICT (ticket_code) DO NOTHING
           RETURNING id`,
          [safeName, safeTicketCode, credits]
        );

        // Only count if PostgreSQL actually inserted the attendee
        if (result.rows.length > 0) {
          imported++;
        } else {
          skipped++;
          errors.push(`Row ${r}: ticket code "${ticketCode}" already exists`);
        }

      } catch (err) {
        console.error(`Import error on row ${r}:`, err);
        skipped++;
        errors.push(`Row ${r}: failed to import`);
      }
    }

    res.json({
      message: 'Import complete',
      imported,
      skipped,
      errors: errors.slice(0, 20)
    });

  } catch (err) {
    console.error('Import error:', err);

    res.status(500).json({
      error: 'Failed to parse file. Make sure it has name and ticket code columns.'
    });
  }
});

// DELETE /api/admin/reset
router.delete('/reset', auth(['admin']), async (req, res) => {
  if (req.body?.confirm !== 'RESET') {
    return res.status(400).json({ error: 'Send { confirm: "RESET" } to confirm' });
  }
  try {
    await pool.query('DELETE FROM transactions');
    await pool.query('DELETE FROM stalls');
    await pool.query('DELETE FROM attendees');
    res.json({ message: 'Event data cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/admin/stalls/export  — download stall payout summary as Excel
router.get('/stalls/export', auth(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.name, s.earned, COUNT(t.id)::int AS transactions,
              s.earned * $1 AS payout_lsl, s.created_at
       FROM stalls s
       LEFT JOIN transactions t ON s.id = t.stall_id
       GROUP BY s.id
       ORDER BY s.earned DESC`,
      [parseFloat(process.env.CREDIT_TO_CASH) || 1]
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EventPay';
    const sheet = workbook.addWorksheet('Stall Payouts');

    // Header row styling
    sheet.columns = [
      { header: 'Stall Name',    key: 'name',         width: 30 },
      { header: 'Credits Earned',key: 'earned',       width: 16 },
      { header: 'Transactions',  key: 'transactions', width: 14 },
      { header: 'Payout (LSL)',  key: 'payout_lsl',   width: 16 },
      { header: 'Registered At', key: 'created_at',   width: 22 },
    ];

    // Style header row
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C5CFC' } };
      cell.alignment = { horizontal: 'center' };
    });

    // Add data rows
    result.rows.forEach(row => {
      sheet.addRow({
        name:         row.name,
        earned:       row.earned,
        transactions: row.transactions,
        payout_lsl:   row.payout_lsl,
        created_at:   new Date(row.created_at).toLocaleString(),
      });
    });

    // Add totals row
    const totalRow = sheet.addRow({
      name:         'TOTAL',
      earned:       result.rows.reduce((s, r) => s + parseInt(r.earned), 0),
      transactions: result.rows.reduce((s, r) => s + parseInt(r.transactions), 0),
      payout_lsl:   result.rows.reduce((s, r) => s + parseFloat(r.payout_lsl), 0),
      created_at:   '',
    });
    totalRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE8A0' } };
    });

    // Number formatting
    sheet.getColumn('payout_lsl').numFmt = '"LSL "#,##0.00';
    sheet.getColumn('earned').numFmt = '#,##0';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="eventpay-stall-payouts-${new Date().toISOString().slice(0,10)}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});


// POST /api/admin/stalls/import  — bulk import stalls from Excel/CSV
router.post('/stalls/import', auth(['admin']), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const workbook = new ExcelJS.Workbook();
    const stream = Readable.from(req.file.buffer);
    const ext = req.file.originalname.toLowerCase();
    if (ext.endsWith('.csv')) { await workbook.csv.read(stream); }
    else { await workbook.xlsx.read(stream); }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) return res.status(400).json({ error: 'File has no worksheets' });

    const headerRow = worksheet.getRow(1);
    let nameCol = -1, emailCol = -1;
    let hasHeaders = false;
    headerRow.eachCell((cell, colNum) => {
      const val = String(cell.value || '').toLowerCase().trim();
      if (val === 'name')  { nameCol  = colNum; hasHeaders = true; }
      if (val === 'email') { emailCol = colNum; hasHeaders = true; }
    });
    // Fallback: no headers — col A=name, col B=email
    if (!hasHeaders) { nameCol = 1; emailCol = 2; }
    if (nameCol === -1 || emailCol === -1) {
      return res.status(400).json({ error: 'Could not find name/email columns. Add headers or use columns A and B.' });
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let imported = 0, skipped = 0, errors = [];

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row   = worksheet.getRow(r);
      const name  = String(row.getCell(nameCol).value  || '').trim();
      const email = String(row.getCell(emailCol).value || '').toLowerCase().trim();
      if (!name || !email) { skipped++; continue; }
      if (!EMAIL_RE.test(email)) { errors.push('Row ' + r + ': invalid email "' + email + '"'); skipped++; continue; }
      try {
        await pool.query(
          'INSERT INTO stalls (name, email) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
          [name.slice(0, 255), email.slice(0, 255)]
        );
        imported++;
      } catch { skipped++; }
    }
    res.json({ message: 'Import complete', imported, skipped, errors: errors.slice(0, 20) });
  } catch (err) {
    console.error('Stall import error:', err);
    res.status(500).json({ error: 'Failed to parse file. Make sure it has name and email columns.' });
  }
});


// GET /api/admin/stalls/:id/transactions-admin — full tx list for a stall (admin view)
router.get('/stalls/:id/transactions-admin', auth(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.amount, t.created_at, t.attendee_id, a.name AS attendee_name
       FROM transactions t
       JOIN attendees a ON t.attendee_id = a.id
       WHERE t.stall_id = $1
       ORDER BY t.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
