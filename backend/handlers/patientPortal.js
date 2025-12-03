// handlers/patientPortal.js - Patient Portal APIs
const db = require("../config/db");
const crypto = require("crypto");
const {
  success,
  error,
  validationError,
  notFound,
  forbidden,
} = require("../utils/response");
const { withAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { withAuditLog } = require("../utils/auditLog");

// Decrypt helper (same as patients.js)
const decrypt = (text) => {
  try {
    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(
      process.env.DB_PASSWORD || "secret",
      "salt",
      32
    );
    const parts = text.split(":");
    const iv = Buffer.from(parts.shift(), "hex");
    const encryptedText = Buffer.from(parts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Decryption error:", err);
    return null;
  }
};

// GET /patients/me - Patient views their own profile
const getMyProfile = withAuth(
  requireRole("patient")(
    withAuditLog(
      "READ",
      "patients"
    )(async (event) => {
      try {
        const user = event.user;

        // Get patient by cognito_sub
        const query = `
            SELECT 
              patient_id,
              full_name,
              date_of_birth,
              gender,
              phone,
              email,
              address,
              city,
              national_id_encrypted,
              insurance_number_encrypted,
              created_at,
              updated_at
            FROM patients
            WHERE cognito_sub = $1 AND is_active = true
          `;

        const result = await db.query(query, [user.sub]);

        if (result.rows.length === 0) {
          return notFound(
            "Patient profile not found. Please contact clinic staff."
          );
        }

        const patient = result.rows[0];

        // Decrypt sensitive data
        if (patient.national_id_encrypted) {
          patient.national_id = decrypt(patient.national_id_encrypted);
          delete patient.national_id_encrypted;
        }

        if (patient.insurance_number_encrypted) {
          patient.insurance_number = decrypt(
            patient.insurance_number_encrypted
          );
          delete patient.insurance_number_encrypted;
        }

        return success(patient, "Profile retrieved successfully");
      } catch (err) {
        console.error("Get patient profile error:", err);
        return error("Failed to retrieve profile", 500, err.message);
      }
    })
  )
);

// GET /medical-records/me - Patient views their medical history
const getMyMedicalRecords = withAuth(
  requireRole("patient")(
    withAuditLog(
      "READ",
      "medical_records"
    )(async (event) => {
      try {
        const user = event.user;
        const queryParams = event.queryStringParameters || {};
        const limit = parseInt(queryParams.limit) || 20;
        const offset = parseInt(queryParams.offset) || 0;

        // Get patient_id from cognito_sub
        const patientQuery =
          "SELECT patient_id, full_name FROM patients WHERE cognito_sub = $1 AND is_active = true";
        const patientResult = await db.query(patientQuery, [user.sub]);

        if (patientResult.rows.length === 0) {
          return notFound("Patient profile not found");
        }

        const patient = patientResult.rows[0];

        // Get medical records (WITHOUT diagnosis - patients don't see diagnosis)
        const query = `
            SELECT 
              mr.record_id,
              mr.visit_date,
              mr.chief_complaint,
              mr.treatment_plan,
              mr.status,
              mr.created_at,
              u.full_name as doctor_name
            FROM medical_records mr
            JOIN users u ON mr.doctor_id = u.user_id
            WHERE mr.patient_id = $1 AND mr.status != 'deleted'
            ORDER BY mr.visit_date DESC
            LIMIT $2 OFFSET $3
          `;

        const result = await db.query(query, [
          patient.patient_id,
          limit,
          offset,
        ]);

        // Get total count
        const countResult = await db.query(
          "SELECT COUNT(*) FROM medical_records WHERE patient_id = $1 AND status != 'deleted'",
          [patient.patient_id]
        );

        const total = parseInt(countResult.rows[0].count);

        return success(
          {
            patient: {
              patient_id: patient.patient_id,
              full_name: patient.full_name,
            },
            records: result.rows,
            pagination: {
              total,
              limit,
              offset,
              hasMore: offset + result.rows.length < total,
            },
          },
          "Medical records retrieved successfully"
        );
      } catch (err) {
        console.error("Get medical records error:", err);
        return error("Failed to retrieve medical records", 500, err.message);
      }
    })
  )
);

// GET /prescriptions/me - Patient views their prescriptions
const getMyPrescriptions = withAuth(
  requireRole("patient")(
    withAuditLog(
      "READ",
      "prescriptions"
    )(async (event) => {
      try {
        const user = event.user;
        const queryParams = event.queryStringParameters || {};
        const limit = parseInt(queryParams.limit) || 20;
        const offset = parseInt(queryParams.offset) || 0;

        // Get patient_id from cognito_sub
        const patientQuery =
          "SELECT patient_id FROM patients WHERE cognito_sub = $1 AND is_active = true";
        const patientResult = await db.query(patientQuery, [user.sub]);

        if (patientResult.rows.length === 0) {
          return notFound("Patient profile not found");
        }

        const patientId = patientResult.rows[0].patient_id;

        // Get prescriptions with medications
        const query = `
            SELECT 
              p.prescription_id,
              p.prescription_date,
              p.notes,
              p.status,
              u.full_name as doctor_name,
              COUNT(m.medication_id) as medication_count
            FROM prescriptions p
            JOIN users u ON p.prescribed_by = u.user_id
            LEFT JOIN medications m ON p.prescription_id = m.prescription_id
            WHERE p.patient_id = $1
            GROUP BY p.prescription_id, p.prescription_date, p.notes, p.status, u.full_name
            ORDER BY p.prescription_date DESC
            LIMIT $2 OFFSET $3
          `;

        const result = await db.query(query, [patientId, limit, offset]);

        // Get total count
        const countResult = await db.query(
          "SELECT COUNT(*) FROM prescriptions WHERE patient_id = $1",
          [patientId]
        );

        const total = parseInt(countResult.rows[0].count);

        return success(
          {
            prescriptions: result.rows,
            pagination: {
              total,
              limit,
              offset,
              hasMore: offset + result.rows.length < total,
            },
          },
          "Prescriptions retrieved successfully"
        );
      } catch (err) {
        console.error("Get prescriptions error:", err);
        return error("Failed to retrieve prescriptions", 500, err.message);
      }
    })
  )
);

// GET /vital-signs/me - Patient views their vital signs
const getMyVitalSigns = withAuth(
  requireRole("patient")(
    withAuditLog(
      "READ",
      "vital_signs"
    )(async (event) => {
      try {
        const user = event.user;
        const queryParams = event.queryStringParameters || {};
        const limit = parseInt(queryParams.limit) || 20;
        const offset = parseInt(queryParams.offset) || 0;

        // Get patient_id from cognito_sub
        const patientQuery =
          "SELECT patient_id FROM patients WHERE cognito_sub = $1 AND is_active = true";
        const patientResult = await db.query(patientQuery, [user.sub]);

        if (patientResult.rows.length === 0) {
          return notFound("Patient profile not found");
        }

        const patientId = patientResult.rows[0].patient_id;

        // Get vital signs
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
              vs.notes,
              vs.measured_at,
              u.full_name as measured_by_name
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

        // Get latest vital signs summary
        let latestVitals = null;
        if (result.rows.length > 0) {
          latestVitals = result.rows[0];
        }

        return success(
          {
            latest_vitals: latestVitals,
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

module.exports = {
  getMyProfile,
  getMyMedicalRecords,
  getMyPrescriptions,
  getMyVitalSigns,
};
