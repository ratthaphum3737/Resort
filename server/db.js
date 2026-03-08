const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'root',
  database: 'Resort1',
  port: 5432
});
module.exports = pool;


