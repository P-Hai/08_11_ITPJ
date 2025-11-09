// scripts/sync-cognito-to-db.js
const AWS = require("aws-sdk");
const { Pool } = require("pg");
require("dotenv").config();

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.REGION,
});

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function syncUsers() {
  try {
    console.log("🔄 Syncing Cognito users to database...");

    // 1. Lấy tất cả users từ Cognito
    const params = {
      UserPoolId: process.env.USER_POOL_ID,
      Limit: 60,
    };

    const cognitoUsers = await cognito.listUsers(params).promise();
    console.log(`📋 Found ${cognitoUsers.Users.length} users in Cognito`);

    // 2. Sync từng user vào database
    for (const cognitoUser of cognitoUsers.Users) {
      const attributes = {};
      cognitoUser.Attributes.forEach((attr) => {
        attributes[attr.Name] = attr.Value;
      });

      const cognitoSub = attributes.sub;
      const email = attributes.email;
      const fullName = attributes.name;
      const role = attributes["custom:role"];
      const phone = attributes.phone_number || null;

      // Skip nếu không có role (patient accounts)
      if (!role || role === "patient") {
        console.log(
          `⏭️  Skipping ${cognitoUser.Username} (patient or no role)`
        );
        continue;
      }

      // Check nếu user đã tồn tại
      const checkQuery = "SELECT user_id FROM users WHERE cognito_sub = $1";
      const existing = await pool.query(checkQuery, [cognitoSub]);

      if (existing.rows.length > 0) {
        console.log(`✅ User ${cognitoUser.Username} already exists in DB`);
        continue;
      }

      // Insert user mới
      const insertQuery = `
        INSERT INTO users (cognito_sub, email, full_name, role, phone)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING user_id, email, role
      `;

      const result = await pool.query(insertQuery, [
        cognitoSub,
        email,
        fullName,
        role,
        phone,
      ]);

      console.log(`✅ Created user in DB:`, {
        username: cognitoUser.Username,
        email: result.rows[0].email,
        role: result.rows[0].role,
      });
    }

    console.log("🎉 Sync completed!");
    await pool.end();
  } catch (error) {
    console.error("❌ Sync failed:", error);
    await pool.end();
    process.exit(1);
  }
}

syncUsers();
