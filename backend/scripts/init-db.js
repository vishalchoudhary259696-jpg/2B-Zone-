
require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const pool = require("../src/db");

(async () => {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, "../sql/schema.sql"),
      "utf8"
    );

    await pool.query(sql);
    console.log("Database schema and sample movies initialized.");
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
