const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendees (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(255) NOT NULL,
        ticket_code VARCHAR(100) UNIQUE,
        credits     INTEGER NOT NULL DEFAULT 300 CHECK (credits >= 0),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS stalls (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(255) UNIQUE NOT NULL,
        earned      INTEGER NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attendee_id  UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
        stall_id     UUID NOT NULL REFERENCES stalls(id) ON DELETE CASCADE,
        amount       INTEGER NOT NULL CHECK (amount > 0),
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Migration: add email column to stalls if not present (safe to run repeatedly)
    await client.query(`
      ALTER TABLE attendees
      ADD COLUMN IF NOT EXISTS ticket_code VARCHAR(100);
    `);

    // Ensure ticket codes are unique
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_attendees_ticket_code
      ON attendees(ticket_code)
      WHERE ticket_code IS NOT NULL;
    `);

    await client.query(`
      ALTER TABLE stalls ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_stalls_email ON stalls(email) WHERE email IS NOT NULL;
    `);

    // Other indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendees_name
      ON attendees(name);

      CREATE INDEX IF NOT EXISTS idx_tx_attendee
      ON transactions(attendee_id);

      CREATE INDEX IF NOT EXISTS idx_tx_stall
      ON transactions(stall_id);

      CREATE INDEX IF NOT EXISTS idx_tx_created
      ON transactions(created_at DESC);
    `);

    console.log(':) Database tables and indexes ready');
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
