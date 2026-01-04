// scripts/sync-patient-accounts.js
const AWS = require("aws-sdk");
const { Pool } = require("pg");
require("dotenv").config();

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: "ap-southeast-1",
});

const pool = new Pool({
  host: "ehr-system-db.c1keewkss49f.ap-southeast-1.rds.amazonaws.com",
  port: 5432,
  database: "ehr_production",
  user: "postgres",
  password: "Hai12345",
  ssl: { rejectUnauthorized: false },
});

async function syncPatientAccounts() {
  try {
    console.log("Starting patient account synchronization...\n");

    // 1. Get all users in "patient" group from Cognito
    console.log("Fetching patient users from Cognito...");
    const groupUsers = await cognito
      .listUsersInGroup({
        UserPoolId: "ap-southeast-1_KAphl41fW",
        GroupName: "patient",
      })
      .promise();

    console.log(`Found ${groupUsers.Users.length} patient users in Cognito\n`);

    if (groupUsers.Users.length === 0) {
      console.log("No patient users found in Cognito");
      return;
    }

    let syncedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    // 2. Process each Cognito user
    for (const cognitoUser of groupUsers.Users) {
      const username = cognitoUser.Username;
      const attributes = {};

      // Extract user attributes
      cognitoUser.Attributes.forEach((attr) => {
        attributes[attr.Name] = attr.Value;
      });

      const cognitoSub = attributes.sub;
      const email = attributes.email;
      const name = attributes.name;

      console.log(`\nProcessing: ${username}`);
      console.log(`   Email: ${email}`);
      console.log(`   Name: ${name}`);
      console.log(`   Sub: ${cognitoSub}`);

      // 3. Check if patient exists in database
      const existingPatient = await pool.query(
        `SELECT patient_id, full_name, cognito_sub, cognito_username, email 
         FROM patients 
         WHERE email = $1 OR cognito_sub = $2`,
        [email, cognitoSub]
      );

      if (existingPatient.rows.length > 0) {
        const patient = existingPatient.rows[0];

        // Check if already synced
        if (patient.cognito_sub && patient.cognito_username) {
          console.log(`   Already synced (patient_id: ${patient.patient_id})`);
          skippedCount++;
        } else {
          // Update with cognito information
          await pool.query(
            `UPDATE patients 
             SET cognito_sub = $1, 
                 cognito_username = $2, 
                 updated_at = NOW()
             WHERE patient_id = $3`,
            [cognitoSub, username, patient.patient_id]
          );
          console.log(
            `   Updated patient_id ${patient.patient_id} with Cognito credentials`
          );
          syncedCount++;
        }
      } else {
        console.log(`   No matching patient found in database`);
        console.log(
          `   Suggestion: This user exists in Cognito but has no patient record`
        );
        notFoundCount++;
      }
    }

    // 4. Display summary
    console.log("\n" + "=".repeat(60));
    console.log("SYNCHRONIZATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Successfully synced: ${syncedCount}`);
    console.log(`Already synced (skipped): ${skippedCount}`);
    console.log(`Not found in database: ${notFoundCount}`);
    console.log(`Total processed: ${groupUsers.Users.length}`);
    console.log("=".repeat(60));

    // 5. Display current patients in database
    console.log("\nCurrent patients in database:");
    const allPatients = await pool.query(`
      SELECT 
        patient_id,
        full_name,
        email,
        cognito_username,
        CASE 
          WHEN cognito_sub IS NOT NULL THEN 'YES'
          ELSE 'NO'
        END as has_cognito_account,
        created_at
      FROM patients
      ORDER BY created_at DESC
    `);

    console.table(allPatients.rows);

    // 6. Find orphaned patients (in DB but not in Cognito)
    const orphanedPatients = await pool.query(`
      SELECT patient_id, full_name, email
      FROM patients
      WHERE cognito_sub IS NULL
    `);

    if (orphanedPatients.rows.length > 0) {
      console.log("\nPatients without Cognito accounts:");
      console.table(orphanedPatients.rows);
      console.log(
        "\nThese patients cannot login. Consider creating Cognito accounts for them."
      );
    }

    console.log("\nSynchronization completed successfully!\n");
  } catch (error) {
    console.error("\nError during synchronization:", error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Run the sync
syncPatientAccounts();
