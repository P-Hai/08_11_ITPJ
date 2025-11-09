// ✅ scripts/test-env.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, "../.env");
console.log("📁 Looking for .env at:", envPath);

// Kiểm tra file có tồn tại không
if (!fs.existsSync(envPath)) {
  console.error("❌ .env file not found at:", envPath);
  process.exit(1);
}

// Load .env
const result = dotenv.config({ path: envPath });

// In ra xem dotenv có parse được không
console.log("🔍 Dotenv parse result:", result);

console.log("✅ ENV CHECK:", {
  REGION: process.env.REGION,
  USER_POOL_ID: process.env.USER_POOL_ID,
  CLIENT_ID: process.env.CLIENT_ID,
  DATABASE_URL: process.env.DATABASE_URL
    ? process.env.DATABASE_URL.slice(0, 30) + "..."
    : undefined,
});
