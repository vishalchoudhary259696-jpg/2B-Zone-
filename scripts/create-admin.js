
require("dotenv").config();

const argon2 = require("argon2");
const pool = require("../src/db");
const config = require("../src/config");

(async () => {
  try {
    if (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD) {
      throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD for this one-time command.");
    }

    const hash = await argon2.hash(config.ADMIN_PASSWORD, {
      type: argon2.argon2id
    });

    await pool.query(`
      INSERT INTO admins(email,password_hash,role,is_active)
      VALUES(LOWER($1),$2,'admin',true)
      ON CONFLICT(email)
      DO UPDATE SET password_hash=EXCLUDED.password_hash,is_active=true
    `, [config.ADMIN_EMAIL, hash]);

    console.log("Admin created/updated. Remove ADMIN_PASSWORD from the environment after this command.");
  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
