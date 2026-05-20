require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./db');
const sanitize = require('./middleware/sanitize');

const app = express();

// OWASP A05 – Security Misconfiguration: set secure HTTP headers
app.use(helmet());

// CORS – only allow the configured frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing with size limit to prevent DoS
app.use(express.json({ limit: '2mb' }));

// OWASP A03 – Injection: sanitize all inputs
app.use(sanitize);

// OWASP A07 – Auth Failures: rate limit all API calls globally
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

// Stricter rate limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again later.' },
});
app.use('/api/attendees/login', authLimiter);
app.use('/api/stalls/login', authLimiter);
app.use('/api/admin/login', authLimiter);

// Simple request logger
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
// app.use('/api/attendees', require('./routes/attendees'));
const { router: attendeesRouter } = require('./routes/attendees');
app.use('/api/attendees', attendeesRouter);
app.use('/api/stalls',    require('./routes/stalls'));
app.use('/api/admin',     require('./routes/admin'));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler – never leak stack traces to client (OWASP A09)
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
initDB()
  .then(() => app.listen(PORT, () => console.log(`🚀 EventPay API on http://localhost:${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
