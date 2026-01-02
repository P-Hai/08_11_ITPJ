// test-env.js
require("dotenv").config();

console.log("✅ Testing .env file...\n");

console.log("AWS Cognito:");
console.log("  USER_POOL_ID:", process.env.USER_POOL_ID);
console.log("  CLIENT_ID:", process.env.CLIENT_ID);
console.log("  REGION:", process.env.REGION);

console.log("\nDatabase:");
console.log("  DB_HOST:", process.env.DB_HOST);
console.log("  DB_NAME:", process.env.DB_NAME);
console.log("  DB_USER:", process.env.DB_USER);
console.log("  DB_PASSWORD:", "***" + process.env.DB_PASSWORD.slice(-4)); // Ẩn password

console.log("\nEmail:");
console.log("  SES_FROM_EMAIL:", process.env.SES_FROM_EMAIL);

console.log("\nFrontend:");
console.log("  FRONTEND_URL:", process.env.FRONTEND_URL);

console.log("\n✅ All variables loaded successfully!");
