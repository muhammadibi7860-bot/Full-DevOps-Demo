const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({
  connectionString,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error', error);
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDatabase({
  retries = Number(process.env.DB_CONNECT_RETRIES || 30),
  delayMs = Number(process.env.DB_CONNECT_DELAY_MS || 2000),
} = {}) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      lastError = error;
      console.log(
        `PostgreSQL is not ready yet, retrying (${attempt}/${retries})...`
      );
      await delay(delayMs);
    }
  }

  throw lastError;
}

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function listNotes() {
  const { rows } = await pool.query(
    `
      SELECT id, title, content, created_at, updated_at
      FROM notes
      ORDER BY created_at DESC, id DESC
    `
  );

  return rows;
}

async function createNote({ title, content }) {
  const { rows } = await pool.query(
    `
      INSERT INTO notes (title, content)
      VALUES ($1, $2)
      RETURNING id, title, content, created_at, updated_at
    `,
    [title, content]
  );

  return rows[0];
}

async function deleteNote(id) {
  const { rows } = await pool.query(
    `
      DELETE FROM notes
      WHERE id = $1
      RETURNING id
    `,
    [id]
  );

  return rows[0] || null;
}

module.exports = {
  pool,
  createNote,
  deleteNote,
  initSchema,
  listNotes,
  waitForDatabase,
};
