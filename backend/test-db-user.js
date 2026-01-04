const db = require("./config/db");

(async () => {
  try {
    console.log("🔍 Checking users table...");
    const allUsers = await db.query(
      "SELECT user_id, cognito_sub, cognito_username, role FROM users LIMIT 10"
    );
    console.log("📋 All users:");
    console.log(JSON.stringify(allUsers.rows, null, 2));

    console.log("\n🔍 Checking for doc001...");
    const doc001 = await db.query(
      "SELECT user_id, cognito_sub, cognito_username, role FROM users WHERE cognito_username = $1",
      ["doc001"]
    );
    console.log("doc001 result:");
    console.log(JSON.stringify(doc001.rows, null, 2));
  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error(err);
  }
  process.exit(0);
})();
