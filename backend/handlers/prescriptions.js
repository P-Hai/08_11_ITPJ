// handlers/prescriptions.js
const db = require("../config/db");
const {
  success,
  error,
  validationError,
  notFound,
  forbidden,
} = require("../utils/response");
const { withAuth } = require("../middleware/auth");
const { requireAnyRole } = require("../middleware/rbac");
const { withAuditLog } = require("../utils/auditLog");

// CREATE Prescription with Medications (Doctor only)
const create = withAuth(
  requireAnyRole(["doctor"])(
    withAuditLog(
      "CREATE",
      "prescriptions"
    )(async (event) => {
      const client = await db.getClient();

      try {
        await client.query("BEGIN");

        const body = JSON.parse(event.body || "{}");
        const user = event.user;

        // Validation
        if (!body.patient_id) {
          await client.query("ROLLBACK");
          return validationError({ patient_id: "Patient ID is required" });
        }

        if (
          !body.medications ||
          !Array.isArray(body.medications) ||
          body.medications.length === 0
        ) {
          await client.query("ROLLBACK");
          return validationError({
            medications: "At least one medication is required",
          });
        }

        // Check if patient exists
        const patientCheck = await client.query(
          "SELECT patient_id FROM patients WHERE patient_id = $1 AND is_active = true",
          [body.patient_id]
        );

        if (patientCheck.rows.length === 0) {
          await client.query("ROLLBACK");
          return notFound("Patient not found");
        }

        // Get doctor's database user_id
        const userQuery = await client.query(
          "SELECT user_id FROM users WHERE cognito_sub = $1",
          [user.sub]
        );

        if (userQuery.rows.length === 0) {
          await client.query("ROLLBACK");
          return error("User not found in database", 404);
        }

        const doctorId = userQuery.rows[0].user_id;

        // Insert prescription
        const prescriptionQuery = `
            INSERT INTO prescriptions (
              patient_id,
              record_id,
              prescribed_by,
              notes,
              status
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING prescription_id, patient_id, prescription_date, notes, status, created_at
          `;

        const prescriptionValues = [
          body.patient_id,
          body.record_id || null,
          doctorId,
          body.notes || null,
          "active",
        ];

        const prescriptionResult = await client.query(
          prescriptionQuery,
          prescriptionValues
        );
        const prescription = prescriptionResult.rows[0];

        // Insert medications
        const medications = [];
        for (const med of body.medications) {
          // Validate medication
          if (!med.medication_name || !med.dosage) {
            await client.query("ROLLBACK");
            return validationError({
              medications:
                "Each medication must have medication_name and dosage",
            });
          }

          const medQuery = `
              INSERT INTO medications (
                prescription_id,
                medication_name,
                dosage,
                frequency,
                duration,
                instructions,
                quantity
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING 
                medication_id,
                medication_name,
                dosage,
                frequency,
                duration,
                instructions,
                quantity,
                created_at
            `;

          const medValues = [
            prescription.prescription_id,
            med.medication_name,
            med.dosage,
            med.frequency || null,
            med.duration || null,
            med.instructions || null,
            med.quantity || null,
          ];

          const medResult = await client.query(medQuery, medValues);
          medications.push(medResult.rows[0]);
        }

        await client.query("COMMIT");

        return success(
          {
            ...prescription,
            medications,
          },
          "Prescription created successfully",
          201
        );
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("Create prescription error:", err);

        if (err.code === "23503") {
          return error("Invalid patient_id or record_id", 400);
        }

        return error("Failed to create prescription", 500, err.message);
      } finally {
        client.release();
      }
    })
  )
);

// GET Prescription by ID
const getById = withAuth(
  requireAnyRole(["doctor", "nurse", "patient"])(
    withAuditLog(
      "READ",
      "prescriptions"
    )(async (event) => {
      try {
        const prescriptionId = event.pathParameters?.id;

        if (!prescriptionId) {
          return validationError({ id: "Prescription ID is required" });
        }

        // Get prescription with medications
        const prescriptionQuery = `
            SELECT 
              p.prescription_id,
              p.patient_id,
              pt.full_name as patient_name,
              p.record_id,
              p.prescription_date,
              p.notes,
              p.status,
              p.created_at,
              u.full_name as doctor_name,
              u.email as doctor_email
            FROM prescriptions p
            JOIN patients pt ON p.patient_id = pt.patient_id
            JOIN users u ON p.prescribed_by = u.user_id
            WHERE p.prescription_id = $1
          `;

        const prescriptionResult = await db.query(prescriptionQuery, [
          prescriptionId,
        ]);

        if (prescriptionResult.rows.length === 0) {
          return notFound("Prescription not found");
        }

        const prescription = prescriptionResult.rows[0];

        // Get medications
        const medicationsQuery = `
            SELECT 
              medication_id,
              medication_name,
              dosage,
              frequency,
              duration,
              instructions,
              quantity,
              created_at
            FROM medications
            WHERE prescription_id = $1
            ORDER BY created_at ASC
          `;

        const medicationsResult = await db.query(medicationsQuery, [
          prescriptionId,
        ]);

        return success(
          {
            ...prescription,
            medications: medicationsResult.rows,
          },
          "Prescription retrieved successfully"
        );
      } catch (err) {
        console.error("Get prescription error:", err);
        return error("Failed to retrieve prescription", 500, err.message);
      }
    })
  )
);

// GET Prescriptions by Patient ID
const getByPatient = withAuth(
  requireAnyRole(["doctor", "nurse", "patient"])(async (event) => {
    try {
      const patientId = event.pathParameters?.patientId;
      const queryParams = event.queryStringParameters || {};
      const limit = parseInt(queryParams.limit) || 20;
      const offset = parseInt(queryParams.offset) || 0;

      if (!patientId) {
        return validationError({ patientId: "Patient ID is required" });
      }

      // Get prescriptions
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
);

module.exports = {
  create,
  getById,
  getByPatient,
};
