// handlers/patients.js
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
const { requireAnyRole, canAccessPatient } = require("../middleware/rbac");
const { withAuditLog } = require("../utils/auditLog");

// Encryption helper
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

// CREATE Patient (Receptionist only) - ✅ FIX BUG 2: Removed 'admin'
const create = withAuth(
  requireAnyRole(["receptionist"])(
    withAuditLog(
      "CREATE",
      "patients"
    )(async (event) => {
      try {
        const body = JSON.parse(event.body || "{}");
        const user = event.user;

        // Validation
        const required = ["full_name", "date_of_birth", "gender"];
        const missing = required.filter((field) => !body[field]);

        if (missing.length > 0) {
          return validationError(
            missing.reduce((acc, field) => {
              acc[field] = `${field} is required`;
              return acc;
            }, {})
          );
        }

        // Validate gender
        if (!["male", "female", "other"].includes(body.gender)) {
          return validationError({
            gender: "Gender must be male, female, or other",
          });
        }

        // Lấy user_id từ cognito_sub
        const userQuery = await db.query(
          "SELECT user_id FROM users WHERE cognito_sub = $1",
          [user.sub]
        );

        if (userQuery.rows.length === 0) {
          console.error("User not found in database:", {
            cognito_sub: user.sub,
            username: user.username,
            email: user.email,
          });
          return error(
            "User not found in database. Please contact administrator.",
            404,
            "User record missing in users table"
          );
        }

        const userId = userQuery.rows[0].user_id;
        console.log("Creating patient with user_id:", userId);

        // Encrypt sensitive data
        const nationalIdEncrypted = body.national_id
          ? encrypt(body.national_id)
          : null;
        const insuranceNumberEncrypted = body.insurance_number
          ? encrypt(body.insurance_number)
          : null;

        // Insert patient
        const query = `
            INSERT INTO patients (
              full_name,
              date_of_birth,
              gender,
              phone,
              email,
              address,
              city,
              national_id_encrypted,
              insurance_number_encrypted,
              created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING patient_id, full_name, date_of_birth, gender, phone, email, address, city, created_at
          `;

        const values = [
          body.full_name,
          body.date_of_birth,
          body.gender,
          body.phone || null,
          body.email || null,
          body.address || null,
          body.city || null,
          nationalIdEncrypted,
          insuranceNumberEncrypted,
          userId,
        ];

        const result = await db.query(query, values);
        const patient = result.rows[0];

        return success(patient, "Patient created successfully", 201);
      } catch (err) {
        console.error("Create patient error:", err);

        if (err.code === "23505") {
          return error("Patient with this information already exists", 409);
        }

        if (err.code === "23503") {
          return error("Foreign key constraint violation", 400, err.message);
        }

        return error("Failed to create patient", 500, err.message);
      }
    })
  )
);

// GET Patient by ID - ✅ Admin removed
const getById = withAuth(
  requireAnyRole(["receptionist", "nurse", "doctor"])(
    withAuditLog(
      "READ",
      "patients"
    )(async (event) => {
      try {
        const patientId = event.pathParameters?.id;
        const user = event.user;

        if (!patientId) {
          return validationError({ id: "Patient ID is required" });
        }

        // Authorization check
        if (!canAccessPatient(user, patientId)) {
          return forbidden("You do not have permission to access this patient");
        }

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
            WHERE patient_id = $1 AND is_active = true
          `;

        const result = await db.query(query, [patientId]);

        if (result.rows.length === 0) {
          return notFound("Patient not found");
        }

        const patient = result.rows[0];

        // Giải mã cho Doctor, Nurse, Receptionist
        const { canViewSensitiveID } = require("../middleware/rbac");

        if (patient.national_id_encrypted && canViewSensitiveID(user)) {
          patient.national_id = decrypt(patient.national_id_encrypted);
          delete patient.national_id_encrypted;
        } else {
          delete patient.national_id_encrypted;
        }

        if (patient.insurance_number_encrypted && canViewSensitiveID(user)) {
          patient.insurance_number = decrypt(
            patient.insurance_number_encrypted
          );
          delete patient.insurance_number_encrypted;
        } else {
          delete patient.insurance_number_encrypted;
        }

        return success(patient, "Patient retrieved successfully");
      } catch (err) {
        console.error("Get patient error:", err);
        return error("Failed to retrieve patient", 500, err.message);
      }
    })
  )
);

// SEARCH Patients - ✅ Admin removed
const search = withAuth(
  requireAnyRole(["receptionist", "nurse", "doctor"])(
    withAuditLog(
      "SEARCH",
      "patients"
    )(async (event) => {
      try {
        const user = event.user;
        const queryParams = event.queryStringParameters || {};

        const {
          name,
          phone,
          national_id,
          insurance_number,
          limit = 20,
          offset = 0,
        } = queryParams;

        // Build search query
        let query = `
            SELECT 
              patient_id,
              full_name,
              date_of_birth,
              gender,
              phone,
              email,
              city,
              created_at
            FROM patients
            WHERE is_active = true
          `;

        const conditions = [];
        const values = [];
        let paramCount = 1;

        if (name) {
          conditions.push(`full_name ILIKE $${paramCount}`);
          values.push(`%${name}%`);
          paramCount++;
        }

        if (phone) {
          conditions.push(`phone LIKE $${paramCount}`);
          values.push(`%${phone}%`);
          paramCount++;
        }

        const { canViewSensitiveID } = require("../middleware/rbac");

        if (national_id && canViewSensitiveID(user)) {
          const encrypted = encrypt(national_id);
          conditions.push(`national_id_encrypted = $${paramCount}`);
          values.push(encrypted);
          paramCount++;
        }

        if (insurance_number && canViewSensitiveID(user)) {
          const encrypted = encrypt(insurance_number);
          conditions.push(`insurance_number_encrypted = $${paramCount}`);
          values.push(encrypted);
          paramCount++;
        }

        if (conditions.length > 0) {
          query += " AND " + conditions.join(" AND ");
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${
          paramCount + 1
        }`;
        values.push(parseInt(limit), parseInt(offset));

        const result = await db.query(query, values);

        // Get total count
        let countQuery = `SELECT COUNT(*) FROM patients WHERE is_active = true`;
        if (conditions.length > 0) {
          countQuery += " AND " + conditions.join(" AND ");
        }
        const countResult = await db.query(countQuery, values.slice(0, -2));
        const total = parseInt(countResult.rows[0].count);

        return success(
          {
            patients: result.rows,
            pagination: {
              total,
              limit: parseInt(limit),
              offset: parseInt(offset),
              hasMore: parseInt(offset) + result.rows.length < total,
            },
          },
          "Patients retrieved successfully"
        );
      } catch (err) {
        console.error("Search patients error:", err);
        return error("Failed to search patients", 500, err.message);
      }
    })
  )
);

// UPDATE Patient (Receptionist only)
const update = withAuth(
  requireAnyRole(["receptionist"])(
    withAuditLog(
      "UPDATE",
      "patients"
    )(async (event) => {
      try {
        const patientId = event.pathParameters?.id;
        const body = JSON.parse(event.body || "{}");
        const user = event.user;

        if (!patientId) {
          return validationError({ id: "Patient ID is required" });
        }

        // Check if patient exists
        const checkQuery =
          "SELECT patient_id FROM patients WHERE patient_id = $1 AND is_active = true";
        const checkResult = await db.query(checkQuery, [patientId]);

        if (checkResult.rows.length === 0) {
          return notFound("Patient not found");
        }

        // Build update query
        const updates = [];
        const values = [];
        let paramCount = 1;

        const allowedFields = [
          "full_name",
          "date_of_birth",
          "gender",
          "phone",
          "email",
          "address",
          "city",
        ];

        allowedFields.forEach((field) => {
          if (body[field] !== undefined) {
            updates.push(`${field} = $${paramCount}`);
            values.push(body[field]);
            paramCount++;
          }
        });

        // Handle encrypted fields
        if (body.national_id !== undefined) {
          updates.push(`national_id_encrypted = $${paramCount}`);
          values.push(body.national_id ? encrypt(body.national_id) : null);
          paramCount++;
        }

        if (body.insurance_number !== undefined) {
          updates.push(`insurance_number_encrypted = $${paramCount}`);
          values.push(
            body.insurance_number ? encrypt(body.insurance_number) : null
          );
          paramCount++;
        }

        if (updates.length === 0) {
          return validationError({ fields: "No valid fields to update" });
        }

        values.push(patientId);

        const query = `
            UPDATE patients
            SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
            WHERE patient_id = $${paramCount}
            RETURNING patient_id, full_name, date_of_birth, gender, phone, email, address, city, updated_at
          `;

        const result = await db.query(query, values);

        return success(result.rows[0], "Patient updated successfully");
      } catch (err) {
        console.error("Update patient error:", err);
        return error("Failed to update patient", 500, err.message);
      }
    })
  )
);

module.exports = {
  create,
  getById,
  search,
  update,
};
