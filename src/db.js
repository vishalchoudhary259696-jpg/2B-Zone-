
const { Pool } = require("pg");
const config = require("./config");

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.DATABASE_SSL === "true"
    ? { rejectUnauthorized: true }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on("error", error => {
  console.error("Unexpected database connection error:", error.message);
});

module.exports = pool;
