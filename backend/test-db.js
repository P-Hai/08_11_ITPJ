// test-db.js
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // ✅ THÊM SSL config
  ssl:
    process.env.DB_SSL === "true"
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

async function testConnection() {
  try {
    console.log("Testing database connection...");
    console.log("Config:", {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      ssl: process.env.DB_SSL === "true" ? "enabled" : "disabled",
    });

    const client = await pool.connect();
    console.log("✅ Connected successfully!");

    const result = await client.query("SELECT NOW()");
    console.log("✅ Query executed:", result.rows[0]);

    // Test audit_logs table
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'audit_logs'
    `);

    if (tableCheck.rows.length > 0) {
      console.log("✅ audit_logs table exists");
    } else {
      console.log("⚠️ audit_logs table NOT found");
    }

    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

testConnection();
