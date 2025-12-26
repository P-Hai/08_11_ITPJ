// scripts/sync-cognito-users.js
const AWS = require("aws-sdk");
const { Pool } = require("pg");

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: "ap-southeast-1",
});

// ✅ HARDCODE DATABASE CONFIG
const pool = new Pool({
  host: "ehr-system-db.c1keewkss49f.ap-southeast-1.rds.amazonaws.com",
  port: 5432,
  database: "ehr_production",
  user: "postgres",
  password: "EhrAdmin2025!", // ← HARDCODED
});

const USER_POOL_ID = "ap-southeast-1_KAphl41fW";

async function syncCognitoUsers() {
  try {
    console.log("🔄 Fetching Cognito users...\n");

    const cognitoUsers = await cognito
      .listUsers({ UserPoolId: USER_POOL_ID })
      .promise();

    console.log(`✅ Found ${cognitoUsers.Users.length} Cognito users\n`);

    for (const user of cognitoUsers.Users) {
      const username = user.Username; // ← COGNITO USERNAME (e.g., admin001)
      const sub = user.Attributes.find((a) => a.Name === "sub")?.Value;
      const email = user.Attributes.find((a) => a.Name === "email")?.Value;

      // Get user's groups (roles)
      const groups = await cognito
        .adminListGroupsForUser({
          UserPoolId: USER_POOL_ID,
          Username: username,
        })
        .promise();

      const role = groups.Groups[0]?.GroupName || "patient";

      console.log(`📋 Username: ${username}`);
      console.log(`   Email: ${email}`);
      console.log(`   Role: ${role}`);
      console.log(`   Sub: ${sub}`);

      // Check if exists
      const existing = await pool.query(
        "SELECT user_id, cognito_username FROM users WHERE cognito_sub = $1",
        [sub]
      );

      if (existing.rows.length > 0) {
        const dbUsername = existing.rows[0].cognito_username;

        if (dbUsername !== username) {
          // ✅ UPDATE USERNAME TO MATCH COGNITO
          console.log(
            `   ⚠️  DB username mismatch: "${dbUsername}" → "${username}"`
          );
          await pool.query(
            "UPDATE users SET cognito_username = $1 WHERE cognito_sub = $2",
            [username, sub]
          );
          console.log(`   ✅ Updated username to: ${username}\n`);
        } else {
          console.log(`   ✅ Already synced\n`);
        }
      } else {
        // ✅ INSERT NEW USER WITH COGNITO USERNAME
        await pool.query(
          `INSERT INTO users (user_id, cognito_sub, cognito_username, email, full_name, role, created_at)
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, NOW())`,
          [sub, username, email, username, role]
        );
        console.log(`   ✅ ADDED to database\n`);
      }
    }

    console.log("\n✅ Sync complete!");
    console.log("\nUsers in database:");

    const allUsers = await pool.query(
      "SELECT cognito_username, email, role FROM users ORDER BY role, cognito_username"
    );

    console.table(allUsers.rows);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await pool.end();
  }
}

syncCognitoUsers();
