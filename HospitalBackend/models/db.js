const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(() => console.log('✅ PostgreSQL Connected Successfully'))
  .catch(err => console.error('❌ Connection Failed', err));

module.exports = pool;
