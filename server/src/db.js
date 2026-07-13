// PostgreSQL connection pool (Supabase-hosted).
// Uses the `pg` library and DATABASE_URL from the environment.
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("[db] DATABASE_URL is not set. Copy server/.env.example to server/.env and set your Supabase connection string");
}

// Supabase requires SSL. The pooler cert is not in the local trust store,
// so we disable strict cert verification (standard for Supabase poolers).
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("[db] Unexpected error on idle client", err);
});

// Thin helper so routes can call query(text, params).
function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
