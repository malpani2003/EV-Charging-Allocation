const { Pool } = require('pg')

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ev_charging",
  user: "shipsy",
  password: "",
});

module.exports = pool;