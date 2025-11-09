// handlers/vitalSigns.js
const db = require("../config/db");
const {
  success,
  error,
  validationError,
  notFound,
  forbidden,
} = require("../utils/response");
const { withAuth } = require("../middleware/auth");
const { requireAnyRole, canModifyVitalSigns } = require("../middleware/rbac");
const { withAuditLog } = require("../utils/auditLog");

// CREATE Vital Signs (Nurse, Doctor, Admin)
const create = withAuth(
  requireAnyRole(["nurse", "doctor"])(
    withAuditLog(
      "CREATE",
      "vital_signs"
    )(async (event) => {
      try {
        const body = JSON.parse(event.body || "{}");
        const user = event.user;

        // Validation
        if (!body.patient_id) {
          return validationError({ patient_id: "Patient ID is required" });
        }

        // Check if patient exists
        const patientCheck = await db.query(
          "SELECT patient_id FROM patients WHERE patient_id = $1 AND is_active = true",
          [body.patient_id]
        );

        if (patientCheck.rows.length === 0) {
          return notFound("Patient not found");
        }

        // Get database user_id
        const userQuery = await db.query(
          "SELECT user_id FROM users WHERE cognito_sub = $1",
          [user.sub]
        );

        if (userQuery.rows.length === 0) {
          return error("User not found in database", 404);
        }

        const userId = userQuery.rows[0].user_id;

        // Calculate BMI if height and weight provided
        let bmi = null;
        if (body.height && body.weight) {
          const heightInMeters = body.height / 100;
          bmi = (body.weight / (heightInMeters * heightInMeters)).toFixed(2);
        }

        // Insert vital signs
        const query = `
            INSERT INTO vital_signs (
              patient_id,
              record_id,
              temperature,
              blood_pressure_systolic,
              blood_pressure_diastolic,
              heart_rate,
              respiratory_rate,
              oxygen_saturation,
              height,
              weight,
              bmi,
              notes,
              measured_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING 
              vital_id,
              patient_id,
              temperature,
              blood_pressure_systolic,
              blood_pressure_diastolic,
              heart_rate,
              respiratory_rate,
              oxygen_saturation,
              height,
              weight,
              bmi,
              notes,
              measured_at,
              created_at
          `;

        const values = [
          body.patient_id,
          body.record_id || null,
          body.temperature || null,
          body.blood_pressure_systolic || null,
          body.blood_pressure_diastolic || null,
          body.heart_rate || null,
          body.respiratory_rate || null,
          body.oxygen_saturation || null,
          body.height || null,
          body.weight || null,
          bmi,
          body.notes || null,
          userId,
        ];

        const result = await db.query(query, values);

        return success(
          result.rows[0],
          "Vital signs recorded successfully",
          201
        );
      } catch (err) {
        console.error("Create vital signs error:", err);

        if (err.code === "23503") {
          // Foreign key violation
          return error("Invalid patient_id or record_id", 400);
        }

        return error("Failed to record vital signs", 500, err.message);
      }
    })
  )
);

// GET Vital Signs by Patient ID
const getByPatient = withAuth(
  requireAnyRole(["nurse", "doctor"])(
    withAuditLog(
      "READ",
      "vital_signs"
    )(async (event) => {
      try {
        const patientId = event.pathParameters?.patientId;
        const queryParams = event.queryStringParameters || {};
        const limit = parseInt(queryParams.limit) || 20;
        const offset = parseInt(queryParams.offset) || 0;

        if (!patientId) {
          return validationError({ patientId: "Patient ID is required" });
        }

        // Check if patient exists
        const patientCheck = await db.query(
          "SELECT patient_id, full_name FROM patients WHERE patient_id = $1 AND is_active = true",
          [patientId]
        );

        if (patientCheck.rows.length === 0) {
          return notFound("Patient not found");
        }

        const patient = patientCheck.rows[0];

        // Get vital signs
        const query = `
            SELECT 
              vs.vital_id,
              vs.patient_id,
              vs.record_id,
              vs.temperature,
              vs.blood_pressure_systolic,
              vs.blood_pressure_diastolic,
              vs.heart_rate,
              vs.respiratory_rate,
              vs.oxygen_saturation,
              vs.height,
              vs.weight,
              vs.bmi,
              vs.notes,
              vs.measured_at,
              u.full_name as measured_by_name,
              u.role as measured_by_role
            FROM vital_signs vs
            JOIN users u ON vs.measured_by = u.user_id
            WHERE vs.patient_id = $1
            ORDER BY vs.measured_at DESC
            LIMIT $2 OFFSET $3
          `;

        const result = await db.query(query, [patientId, limit, offset]);

        // Get total count
        const countResult = await db.query(
          "SELECT COUNT(*) FROM vital_signs WHERE patient_id = $1",
          [patientId]
        );

        const total = parseInt(countResult.rows[0].count);

        return success(
          {
            patient: {
              patient_id: patient.patient_id,
              full_name: patient.full_name,
            },
            vital_signs: result.rows,
            pagination: {
              total,
              limit,
              offset,
              hasMore: offset + result.rows.length < total,
            },
          },
          "Vital signs retrieved successfully"
        );
      } catch (err) {
        console.error("Get vital signs error:", err);
        return error("Failed to retrieve vital signs", 500, err.message);
      }
    })
  )
);

// GET Latest Vital Signs (most recent)
const getLatest = withAuth(
  requireAnyRole(["nurse", "doctor"])(async (event) => {
    try {
      const patientId = event.pathParameters?.patientId;

      if (!patientId) {
        return validationError({ patientId: "Patient ID is required" });
      }

      const query = `
          SELECT 
            vs.vital_id,
            vs.temperature,
            vs.blood_pressure_systolic,
            vs.blood_pressure_diastolic,
            vs.heart_rate,
            vs.respiratory_rate,
            vs.oxygen_saturation,
            vs.height,
            vs.weight,
            vs.bmi,
            vs.measured_at,
            u.full_name as measured_by_name
          FROM vital_signs vs
          JOIN users u ON vs.measured_by = u.user_id
          WHERE vs.patient_id = $1
          ORDER BY vs.measured_at DESC
          LIMIT 1
        `;

      const result = await db.query(query, [patientId]);

      if (result.rows.length === 0) {
        return notFound("No vital signs found for this patient");
      }

      return success(
        result.rows[0],
        "Latest vital signs retrieved successfully"
      );
    } catch (err) {
      console.error("Get latest vital signs error:", err);
      return error("Failed to retrieve vital signs", 500, err.message);
    }
  })
);

module.exports = {
  create,
  getByPatient,
  getLatest,
};
