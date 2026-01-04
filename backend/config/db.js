// config/db.js
const { Pool } = require("pg");

let pool;

const getPool = () => {
  if (!pool) {
    // DEBUG: Log environment variables
    const pwd = process.env.DB_PASSWORD || "EHRdb#2025Secure!";
    console.log("[DB CONFIG] Connection settings:");
    console.log("  DB_HOST env:", process.env.DB_HOST);
    console.log("  DB_USER env:", process.env.DB_USER);
    console.log(
      "  DB_PASSWORD env set:",
      !!process.env.DB_PASSWORD,
      "length:",
      process.env.DB_PASSWORD?.length
    );
    console.log(
      "  Using password:",
      pwd === "EHRdb#2025Secure!" ? "HARDCODED FALLBACK" : "FROM ENV"
    );

    const config = {
      host:
        process.env.DB_HOST ||
        "ehr-system-db.c1keewkss49f.ap-southeast-1.rds.amazonaws.com",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "ehr_production",
      user: process.env.DB_USER || "postgres",
      password: pwd,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000, // ✅ Giảm xuống 5s (từ 10s)
      statement_timeout: 10000, // ✅ THÊM: Query timeout 10s
    };

    // ✅ SSL cho RDS
    if (
      process.env.DB_SSL === "true" ||
      process.env.DB_HOST?.includes("rds.amazonaws.com")
    ) {
      config.ssl = {
        rejectUnauthorized: false,
      };
    }

    pool = new Pool(config);

    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });

    console.log("Database pool created:", {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      ssl: config.ssl ? "enabled" : "disabled",
    });
  }
  return pool;
};

// Execute query with better error handling
const query = async (text, params) => {
  const pool = getPool();
  const start = Date.now();

  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Query executed", { duration, rows: res.rowCount });
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error("Database query error", {
      duration,
      error: error.message,
      code: error.code,
    });
    throw error;
  }
};

// Get a client from pool (for transactions)
const getClient = async () => {
  const pool = getPool();
  return await pool.connect();
};

module.exports = {
  query,
  getClient,
  getPool,
};
