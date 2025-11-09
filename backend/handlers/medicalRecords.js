// handlers/medicalRecords.js
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
const {
  requireAnyRole,
  canModifyMedicalRecord,
  canViewMedicalData,
} = require("../middleware/rbac");
const { withAuditLog } = require("../utils/auditLog");

// Encryption helpers (same as patients.js)
const encrypt = (text) => {
  const algorithm = "aes-256-cbc";
  const key = crypto.scryptSync(
    process.env.DB_PASSWORD || "secret",
    "salt",
    32
  );
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
};

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

// CREATE Medical Record (Doctor only)
const create = withAuth(
  requireAnyRole(["doctor"])(
    withAuditLog(
      "CREATE",
      "medical_records"
    )(async (event) => {
      try {
        const body = JSON.parse(event.body || "{}");
        const user = event.user;

        // Validation
        const required = ["patient_id", "chief_complaint"];
        const missing = required.filter((field) => !body[field]);

        if (missing.length > 0) {
          return validationError(
            missing.reduce((acc, field) => {
              acc[field] = `${field} is required`;
              return acc;
            }, {})
          );
        }

        // Check if patient exists
        const patientCheck = await db.query(
          "SELECT patient_id FROM patients WHERE patient_id = $1 AND is_active = true",
          [body.patient_id]
        );

        if (patientCheck.rows.length === 0) {
          return notFound("Patient not found");
        }

        // Get doctor's database user_id
        const userQuery = await db.query(
          "SELECT user_id FROM users WHERE cognito_sub = $1",
          [user.sub]
        );

        if (userQuery.rows.length === 0) {
          return error("User not found in database", 404);
        }

        const doctorId = userQuery.rows[0].user_id;

        // Encrypt diagnosis if provided
        const diagnosisEncrypted = body.diagnosis
          ? encrypt(body.diagnosis)
          : null;

        // Insert medical record
        const query = `
            INSERT INTO medical_records (
              patient_id,
              visit_date,
              chief_complaint,
              diagnosis,
              treatment_plan,
              doctor_notes,
              doctor_id,
              status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING 
              record_id,
              patient_id,
              visit_date,
              chief_complaint,
              treatment_plan,
              doctor_notes,
              status,
              created_at
          `;

        const values = [
          body.patient_id,
          body.visit_date || new Date(),
          body.chief_complaint,
          diagnosisEncrypted,
          body.treatment_plan || null,
          body.doctor_notes || null,
          doctorId,
          "active",
        ];

        const result = await db.query(query, values);
        const record = result.rows[0];

        // Add decrypted diagnosis for response
        if (diagnosisEncrypted) {
          record.diagnosis = body.diagnosis; // Return original (not encrypted)
        }

        return success(record, "Medical record created successfully", 201);
      } catch (err) {
        console.error("Create medical record error:", err);

        if (err.code === "23503") {
          return error("Invalid patient_id", 400);
        }

        return error("Failed to create medical record", 500, err.message);
      }
    })
  )
);

// GET Medical Record by ID
const getById = withAuth(
  requireAnyRole(["doctor", "nurse"])(
    // ✅ BỎ 'admin'
    withAuditLog(
      "READ",
      "medical_records"
    )(async (event) => {
      try {
        const recordId = event.pathParameters?.id;
        const user = event.user;

        if (!recordId) {
          return validationError({ id: "Record ID is required" });
        }

        const query = `
            SELECT 
              mr.record_id,
              mr.patient_id,
              p.full_name as patient_name,
              mr.visit_date,
              mr.chief_complaint,
              mr.diagnosis,
              mr.treatment_plan,
              mr.doctor_notes,
              mr.status,
              mr.created_at,
              mr.updated_at,
              u.full_name as doctor_name,
              u.email as doctor_email
            FROM medical_records mr
            JOIN patients p ON mr.patient_id = p.patient_id
            JOIN users u ON mr.doctor_id = u.user_id
            WHERE mr.record_id = $1
          `;

        const result = await db.query(query, [recordId]);

        if (result.rows.length === 0) {
          return notFound("Medical record not found");
        }

        const record = result.rows[0];

        // ✅ THAY ĐỔI: Xử lý diagnosis theo vai trò
        const {
          canViewFullDiagnosis,
          canViewDiagnosisSummary,
        } = require("../middleware/rbac");

        if (record.diagnosis) {
          const decryptedDiagnosis = decrypt(record.diagnosis);

          if (canViewFullDiagnosis(user)) {
            // Doctor: Xem đầy đủ
            record.diagnosis = decryptedDiagnosis;
          } else if (canViewDiagnosisSummary(user)) {
            // Nurse: Xem summary
            record.diagnosis = createDiagnosisSummary(decryptedDiagnosis);
            record.diagnosis_note =
              "Summary only - Full diagnosis restricted to doctors";
          } else {
            // Không có quyền
            delete record.diagnosis;
          }
        }

        return success(record, "Medical record retrieved successfully");
      } catch (err) {
        console.error("Get medical record error:", err);
        return error("Failed to retrieve medical record", 500, err.message);
      }
    })
  )
);

// GET Medical Records by Patient ID
const getByPatient = withAuth(
  requireAnyRole(["doctor", "nurse"])(
    // ✅ BỎ 'admin'
    withAuditLog(
      "READ",
      "medical_records"
    )(async (event) => {
      try {
        const patientId = event.pathParameters?.patientId;
        const user = event.user;
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

        // Get medical records
        const query = `
            SELECT 
              mr.record_id,
              mr.visit_date,
              mr.chief_complaint,
              mr.diagnosis,
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

        const result = await db.query(query, [patientId, limit, offset]);

        // ✅ THAY ĐỔI: Xử lý diagnosis cho từng record
        const {
          canViewFullDiagnosis,
          canViewDiagnosisSummary,
        } = require("../middleware/rbac");

        result.rows.forEach((record) => {
          if (record.diagnosis) {
            const decryptedDiagnosis = decrypt(record.diagnosis);

            if (canViewFullDiagnosis(user)) {
              // Doctor: Xem đầy đủ
              record.diagnosis = decryptedDiagnosis;
            } else if (canViewDiagnosisSummary(user)) {
              // Nurse: Xem summary
              record.diagnosis = createDiagnosisSummary(decryptedDiagnosis);
            } else {
              delete record.diagnosis;
            }
          }
        });

        // Get total count
        const countResult = await db.query(
          "SELECT COUNT(*) FROM medical_records WHERE patient_id = $1 AND status != 'deleted'",
          [patientId]
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

const createDiagnosisSummary = (fullDiagnosis) => {
  if (!fullDiagnosis) return null;

  // Lấy 100 ký tự đầu hoặc câu đầu tiên
  const maxLength = 100;
  if (fullDiagnosis.length <= maxLength) {
    return fullDiagnosis;
  }

  // Tìm dấu chấm, phẩy hoặc xuống dòng đầu tiên
  const firstSentenceEnd = fullDiagnosis.search(/[.。,，\n]/);
  if (firstSentenceEnd > 0 && firstSentenceEnd <= maxLength) {
    return fullDiagnosis.substring(0, firstSentenceEnd + 1) + " (...)";
  }

  return fullDiagnosis.substring(0, maxLength) + "...";
};

// UPDATE Medical Record (Doctor only)
const update = withAuth(
  requireAnyRole(["doctor"])(
    withAuditLog(
      "UPDATE",
      "medical_records"
    )(async (event) => {
      try {
        const recordId = event.pathParameters?.id;
        const body = JSON.parse(event.body || "{}");

        if (!recordId) {
          return validationError({ id: "Record ID is required" });
        }

        // Check if record exists
        const checkQuery =
          "SELECT record_id FROM medical_records WHERE record_id = $1";
        const checkResult = await db.query(checkQuery, [recordId]);

        if (checkResult.rows.length === 0) {
          return notFound("Medical record not found");
        }

        // Build update query
        const updates = [];
        const values = [];
        let paramCount = 1;

        const allowedFields = [
          "chief_complaint",
          "treatment_plan",
          "doctor_notes",
          "status",
        ];

        allowedFields.forEach((field) => {
          if (body[field] !== undefined) {
            updates.push(`${field} = $${paramCount}`);
            values.push(body[field]);
            paramCount++;
          }
        });

        // Handle encrypted diagnosis
        if (body.diagnosis !== undefined) {
          updates.push(`diagnosis = $${paramCount}`);
          values.push(body.diagnosis ? encrypt(body.diagnosis) : null);
          paramCount++;
        }

        if (updates.length === 0) {
          return validationError({ fields: "No valid fields to update" });
        }

        values.push(recordId);

        const query = `
            UPDATE medical_records
            SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
            WHERE record_id = $${paramCount}
            RETURNING 
              record_id,
              patient_id,
              visit_date,
              chief_complaint,
              treatment_plan,
              doctor_notes,
              status,
              updated_at
          `;

        const result = await db.query(query, values);

        return success(result.rows[0], "Medical record updated successfully");
      } catch (err) {
        console.error("Update medical record error:", err);
        return error("Failed to update medical record", 500, err.message);
      }
    })
  )
);

module.exports = {
  create,
  getById,
  getByPatient,
  createDiagnosisSummary,
  update,
};
