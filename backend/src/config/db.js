const { Pool } = require('pg');
const { DATABASE_URL } = require('./env');

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20, // pg-pool max 20 connections as requested
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
