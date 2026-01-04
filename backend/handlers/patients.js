// handlers/patients.js - COMPLETE VERSION
const db = require("../config/db");
const crypto = require("crypto");
const AWS = require("aws-sdk");
const { success, error, validationError } = require("../utils/response");
const { withAuth } = require("../middleware/auth");
const { requireAnyRole } = require("../middleware/rbac");
const { withAuditLog } = require("../utils/auditLog");

// Initialize Cognito client
const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.REGION || "ap-southeast-1",
});

// ===========================
// ENCRYPTION HELPERS
// ===========================
const encrypt = (text) => {
  if (!text) return null;
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

const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  try {
    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(
      process.env.DB_PASSWORD || "secret",
      "salt",
      32
    );
    const textParts = encryptedText.split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encrypted = textParts.join(":");
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Decryption error:", err);
    return null;
  }
};

// ===========================
// PATIENT USERNAME GENERATOR
// ===========================
const generatePatientUsername = async () => {
  const prefix = "patient";
  const random = Math.floor(10000 + Math.random() * 90000); // 5 digits
  const username = `${prefix}${random}`;

  // Check if exists in database
  const existCheck = await db.query(
    "SELECT patient_id FROM patients WHERE cognito_username = $1",
    [username]
  );

  if (existCheck.rows.length > 0) {
    // Recursive retry if username exists
    return generatePatientUsername();
  }

  return username;
};

// ===========================
// PASSWORD GENERATOR
// ===========================
const generateRandomPassword = () => {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%";
  const allChars = uppercase + lowercase + numbers + special;

  let password = "";
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Add 4 more random characters
  for (let i = 0; i < 4; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

// ===========================
// CREATE PATIENT WITH COGNITO ACCOUNT
// ===========================
const create = withAuth(
  requireAnyRole(["receptionist"])(
    withAuditLog(
      "CREATE",
      "patients"
    )(async (event) => {
      try {
        const body = JSON.parse(event.body || "{}");
        const user = event.user;

        // ===========================
        // VALIDATION
        // ===========================
        const required = ["full_name", "date_of_birth", "gender", "email"];
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
        const validGenders = ["male", "female", "other"];
        if (!validGenders.includes(body.gender)) {
          return validationError({
            gender: "Gender must be male, female, or other",
          });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
          return validationError({
            email: "Invalid email format",
          });
        }

        // Validate date of birth
        const dob = new Date(body.date_of_birth);
        if (isNaN(dob.getTime())) {
          return validationError({
            date_of_birth: "Invalid date format",
          });
        }

        // Check if email already exists
        const emailCheck = await db.query(
          "SELECT patient_id FROM patients WHERE email = $1",
          [body.email]
        );

        if (emailCheck.rows.length > 0) {
          return error("Email already registered", 409);
        }

        // ===========================
        // GET RECEPTIONIST USER ID
        // ===========================
        const userQuery = await db.query(
          "SELECT user_id FROM users WHERE cognito_sub = $1",
          [user.sub]
        );

        if (userQuery.rows.length === 0) {
          return error("User not found in database", 404);
        }

        const userId = userQuery.rows[0].user_id;

        // ===========================
        // CREATE COGNITO USER
        // ===========================
        const patientUsername = await generatePatientUsername();
        const temporaryPassword = generateRandomPassword();

        console.log("🔐 Creating Cognito user:", patientUsername);

        let cognitoSub;
        try {
          // Create user in Cognito
          const createUserResponse = await cognito
            .adminCreateUser({
              UserPoolId: process.env.USER_POOL_ID,
              Username: patientUsername,
              UserAttributes: [
                { Name: "email", Value: body.email },
                { Name: "email_verified", Value: "true" },
                { Name: "name", Value: body.full_name },
              ],
              TemporaryPassword: temporaryPassword,
              MessageAction: "SUPPRESS", // Don't send auto email
            })
            .promise();

          // Extract cognito sub
          cognitoSub = createUserResponse.User.Attributes.find(
            (attr) => attr.Name === "sub"
          ).Value;

          console.log("✅ Cognito user created with sub:", cognitoSub);

          // Add to Patients group
          await cognito
            .adminAddUserToGroup({
              UserPoolId: process.env.USER_POOL_ID,
              Username: patientUsername,
              GroupName: "patient",
            })
            .promise();

          console.log("✅ Added to Patients group");
        } catch (cognitoError) {
          console.error("❌ Cognito error:", cognitoError);

          if (cognitoError.code === "UsernameExistsException") {
            return error("Email already registered in the system", 409);
          }

          if (cognitoError.code === "ResourceNotFoundException") {
            return error(
              "Patients group not found. Please contact administrator.",
              500
            );
          }

          return error(
            "Failed to create patient account",
            500,
            cognitoError.message
          );
        }

        // ===========================
        // ENCRYPT SENSITIVE DATA
        // ===========================
        const nationalIdEncrypted = body.national_id
          ? encrypt(body.national_id)
          : null;
        const insuranceNumberEncrypted = body.insurance_number
          ? encrypt(body.insurance_number)
          : null;

        // ===========================
        // INSERT PATIENT INTO DATABASE
        // ===========================
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
            cognito_sub,
            cognito_username,
            created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING 
            patient_id, 
            full_name, 
            date_of_birth, 
            gender, 
            phone, 
            email, 
            address, 
            city,
            cognito_username,
            created_at
        `;

        const values = [
          body.full_name,
          body.date_of_birth,
          body.gender,
          body.phone || null,
          body.email,
          body.address || null,
          body.city || null,
          nationalIdEncrypted,
          insuranceNumberEncrypted,
          cognitoSub,
          patientUsername,
          userId,
        ];

        const result = await db.query(query, values);
        const patient = result.rows[0];

        console.log("✅ Patient created in database:", patient.patient_id);

        // ===========================
        // SEND EMAIL WITH CREDENTIALS
        // ===========================
        const { sendPatientCredentialsEmail } = require("../utils/email");

        try {
          await sendPatientCredentialsEmail(
            body.email,
            body.full_name,
            patientUsername,
            temporaryPassword
          );
          console.log("✅ Credentials email sent to:", body.email);
        } catch (emailError) {
          console.error("⚠️ Email send failed:", emailError);
          // Don't fail the transaction if email fails
          // Patient can still get credentials from response
        }

        // ===========================
        // RETURN SUCCESS RESPONSE
        // ===========================
        return success(
          {
            patient,
            credentials: {
              username: patientUsername,
              temporaryPassword: temporaryPassword,
              note: "Patient must change password on first login",
              emailSent: true,
            },
          },
          "Patient created successfully with login credentials",
          201
        );
      } catch (err) {
        console.error("Create patient error:", err);

        // Handle database unique constraint violations
        if (err.code === "23505") {
          return error("Patient with this information already exists", 409);
        }

        return error("Failed to create patient", 500, err.message);
      }
    })
  )
);

// ===========================
// GET PATIENT BY ID
// ===========================
const getById = withAuth(
  requireAnyRole(["receptionist", "doctor", "nurse", "patient"])(
    async (event) => {
      try {
        const { id } = event.pathParameters;
        const user = event.user;

        // If user is patient, only allow viewing own record
        if (user.role === "patient") {
          const patientCheck = await db.query(
            "SELECT patient_id FROM patients WHERE cognito_sub = $1",
            [user.sub]
          );

          if (
            patientCheck.rows.length === 0 ||
            patientCheck.rows[0].patient_id !== parseInt(id)
          ) {
            return error("Unauthorized to view this patient record", 403);
          }
        }

        const query = `
          SELECT 
            p.patient_id,
            p.full_name,
            p.date_of_birth,
            p.gender,
            p.phone,
            p.email,
            p.address,
            p.city,
            p.national_id_encrypted,
            p.insurance_number_encrypted,
            p.cognito_username,
            p.created_at,
            p.updated_at,
            u.cognito_username as created_by_username
          FROM patients p
          LEFT JOIN users u ON p.created_by = u.user_id
          WHERE p.patient_id = $1
        `;

        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
          return error("Patient not found", 404);
        }

        const patient = result.rows[0];

        // Decrypt sensitive data for authorized roles
        if (["receptionist", "doctor", "nurse"].includes(user.role)) {
          patient.national_id = decrypt(patient.national_id_encrypted);
          patient.insurance_number = decrypt(
            patient.insurance_number_encrypted
          );
        }

        // Remove encrypted fields
        delete patient.national_id_encrypted;
        delete patient.insurance_number_encrypted;

        return success(patient, "Patient retrieved successfully");
      } catch (err) {
        console.error("Get patient error:", err);
        return error("Failed to retrieve patient", 500, err.message);
      }
    }
  )
);

// ===========================
// SEARCH PATIENTS
// ===========================
const search = withAuth(
  requireAnyRole(["receptionist", "doctor", "nurse"])(async (event) => {
    try {
      const queryParams = event.queryStringParameters || {};
      const searchTerm = queryParams.search || "";
      const page = parseInt(queryParams.page) || 1;
      const limit = parseInt(queryParams.limit) || 20;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          p.patient_id,
          p.full_name,
          p.date_of_birth,
          p.gender,
          p.phone,
          p.email,
          p.city,
          p.cognito_username,
          p.created_at
        FROM patients p
        WHERE 1=1
      `;

      const values = [];

      if (searchTerm) {
        query += ` AND (
          p.full_name ILIKE $${values.length + 1} OR
          p.email ILIKE $${values.length + 1} OR
          p.phone ILIKE $${values.length + 1}
        )`;
        values.push(`%${searchTerm}%`);
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT .+ FROM/,
        "SELECT COUNT(*) FROM"
      );
      const countResult = await db.query(countQuery, values);
      const totalCount = parseInt(countResult.rows[0].count);

      // Add pagination
      query += ` ORDER BY p.created_at DESC LIMIT $${
        values.length + 1
      } OFFSET $${values.length + 2}`;
      values.push(limit, offset);

      const result = await db.query(query, values);

      return success(
        {
          patients: result.rows,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
        "Patients retrieved successfully"
      );
    } catch (err) {
      console.error("Search patients error:", err);
      return error("Failed to search patients", 500, err.message);
    }
  })
);

// ===========================
// UPDATE PATIENT
// ===========================
const update = withAuth(
  requireAnyRole(["receptionist", "patient"])(
    withAuditLog(
      "UPDATE",
      "patients"
    )(async (event) => {
      try {
        const { id } = event.pathParameters;
        const body = JSON.parse(event.body || "{}");
        const user = event.user;

        // If user is patient, only allow updating own record
        if (user.role === "patient") {
          const patientCheck = await db.query(
            "SELECT patient_id FROM patients WHERE cognito_sub = $1",
            [user.sub]
          );

          if (
            patientCheck.rows.length === 0 ||
            patientCheck.rows[0].patient_id !== parseInt(id)
          ) {
            return error("Unauthorized to update this patient record", 403);
          }

          // Patients can only update limited fields
          const allowedFields = ["phone", "address", "city"];
          const requestedFields = Object.keys(body);
          const unauthorizedFields = requestedFields.filter(
            (field) => !allowedFields.includes(field)
          );

          if (unauthorizedFields.length > 0) {
            return error(
              `Patients can only update: ${allowedFields.join(", ")}`,
              403
            );
          }
        }

        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramCount = 1;

        const allowedUpdates = {
          full_name: body.full_name,
          date_of_birth: body.date_of_birth,
          gender: body.gender,
          phone: body.phone,
          email: body.email,
          address: body.address,
          city: body.city,
        };

        for (const [key, value] of Object.entries(allowedUpdates)) {
          if (value !== undefined) {
            updates.push(`${key} = $${paramCount}`);
            values.push(value);
            paramCount++;
          }
        }

        // Handle encrypted fields for receptionists only
        if (user.role === "receptionist") {
          if (body.national_id !== undefined) {
            updates.push(`national_id_encrypted = $${paramCount}`);
            values.push(encrypt(body.national_id));
            paramCount++;
          }

          if (body.insurance_number !== undefined) {
            updates.push(`insurance_number_encrypted = $${paramCount}`);
            values.push(encrypt(body.insurance_number));
            paramCount++;
          }
        }

        if (updates.length === 0) {
          return validationError({ message: "No fields to update" });
        }

        // Add updated_at
        updates.push(`updated_at = NOW()`);

        // Add patient_id to values
        values.push(id);

        const query = `
          UPDATE patients 
          SET ${updates.join(", ")}
          WHERE patient_id = $${paramCount}
          RETURNING 
            patient_id,
            full_name,
            date_of_birth,
            gender,
            phone,
            email,
            address,
            city,
            cognito_username,
            updated_at
        `;

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
          return error("Patient not found", 404);
        }

        return success(result.rows[0], "Patient updated successfully");
      } catch (err) {
        console.error("Update patient error:", err);
        return error("Failed to update patient", 500, err.message);
      }
    })
  )
);

// ===========================
// GET MY PROFILE (FOR PATIENTS)
// ===========================
const getMyProfile = withAuth(
  requireAnyRole(["patient"])(async (event) => {
    try {
      const user = event.user;

      const query = `
        SELECT 
          p.patient_id,
          p.full_name,
          p.date_of_birth,
          p.gender,
          p.phone,
          p.email,
          p.address,
          p.city,
          p.cognito_username,
          p.created_at,
          p.updated_at
        FROM patients p
        WHERE p.cognito_sub = $1
      `;

      const result = await db.query(query, [user.sub]);

      if (result.rows.length === 0) {
        return error("Patient profile not found", 404);
      }

      return success(result.rows[0], "Profile retrieved successfully");
    } catch (err) {
      console.error("Get profile error:", err);
      return error("Failed to retrieve profile", 500, err.message);
    }
  })
);

// ===========================
// EXPORTS
// ===========================
module.exports = {
  create,
  getById,
  search,
  update,
  getMyProfile,
};
