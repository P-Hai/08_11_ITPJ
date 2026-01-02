// scripts/create-patient-for-cognito-user.js
const { Pool } = require("pg");
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  host: "ehr-system-db.c1keewkss49f.ap-southeast-1.rds.amazonaws.com",
  port: 5432,
  database: "ehr_production",
  user: "postgres",
  password: "EHRdb#2025Secure!",
  ssl: { rejectUnauthorized: false },
});

async function createPatientRecord() {
  try {
    console.log("Creating patient record for patient12345...\n");

    // Get receptionist user_id (created_by)
    const receptionistQuery = await pool.query(
      "SELECT user_id FROM users WHERE role = 'receptionist' LIMIT 1"
    );

    let createdBy = null;
    if (receptionistQuery.rows.length > 0) {
      createdBy = receptionistQuery.rows[0].user_id;
    }

    // Insert patient record
    const result = await pool.query(
      `INSERT INTO patients (
        patient_id,
        full_name,
        date_of_birth,
        gender,
        email,
        cognito_sub,
        cognito_username,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        uuidv4(),
        "Nguyen Van A",
        "1990-01-01",
        "male",
        "patient12345@example.com",
        "89aa25fc-2021-70e6-1c2a-d1d7c72d86ee",
        "patient12345",
        createdBy
      ]
    );

    console.log("Patient record created successfully!");
    console.table(result.rows);

    // Verify
    const verify = await pool.query(
      "SELECT * FROM patients WHERE cognito_username = 'patient12345'"
    );

    console.log("\nVerification:");
    console.table(verify.rows);

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

createPatientRecord();
