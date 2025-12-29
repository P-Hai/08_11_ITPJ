// handlers/patientFiles.js
const AWS = require("aws-sdk");
const db = require("../config/db");
const { success, error, validationError } = require("../utils/response");
const { withAuth, requireAnyRole } = require("../middleware/auth");
const { logAction } = require("../utils/auditLog");
const { v4: uuidv4 } = require("uuid");

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.PATIENT_FILES_BUCKET;

// ============================================================
// 1. GENERATE PRESIGNED UPLOAD URL
// ============================================================
const getUploadUrl = withAuth(
  requireAnyRole(["doctor", "nurse"])(async (event) => {
    try {
      const { patientId, fileName, fileType, mimeType } = JSON.parse(
        event.body || "{}"
      );

      // Validation
      if (!patientId || !fileName || !fileType || !mimeType) {
        return validationError({
          patientId: !patientId ? "Patient ID is required" : undefined,
          fileName: !fileName ? "File name is required" : undefined,
          fileType: !fileType ? "File type is required" : undefined,
          mimeType: !mimeType ? "MIME type is required" : undefined,
        });
      }

      // Verify patient exists
      const patientCheck = await db.query(
        "SELECT patient_id FROM patients WHERE patient_id = $1",
        [patientId]
      );

      if (patientCheck.rows.length === 0) {
        return error("Patient not found", 404);
      }

      // Generate unique S3 key
      const fileExtension = fileName.split(".").pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const s3Key = `patients/${patientId}/${fileType}/${uniqueFileName}`;

      // Generate presigned URL (expires in 15 minutes)
      const uploadUrl = s3.getSignedUrl("putObject", {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        ContentType: mimeType,
        Expires: 900,
      });

      return success({
        uploadUrl,
        s3Key,
        bucket: BUCKET_NAME,
      });
    } catch (err) {
      console.error("Get upload URL error:", err);
      return error("Failed to generate upload URL", 500, err.message);
    }
  })
);

// ============================================================
// 2. SAVE FILE METADATA
// ============================================================
const saveFileMetadata = withAuth(
  requireAnyRole(["doctor", "nurse"])(async (event) => {
    try {
      const {
        patientId,
        fileName,
        fileType,
        mimeType,
        fileSize,
        s3Key,
        description,
      } = JSON.parse(event.body || "{}");

      // Get user from database
      const userQuery = await db.query(
        "SELECT user_id FROM users WHERE cognito_sub = $1",
        [event.user.sub]
      );

      if (userQuery.rows.length === 0) {
        return error("User not found", 404);
      }

      const uploadedBy = userQuery.rows[0].user_id;

      // Insert file metadata
      const result = await db.query(
        `INSERT INTO patient_files 
        (patient_id, uploaded_by, file_name, file_type, mime_type, file_size, s3_key, s3_bucket, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          patientId,
          uploadedBy,
          fileName,
          fileType,
          mimeType,
          fileSize || 0,
          s3Key,
          BUCKET_NAME,
          description || null,
        ]
      );

      await logAction({
        userId: uploadedBy,
        userEmail: event.user.email,
        userRole: event.user.role,
        action: "UPLOAD_FILE",
        resourceType: "patient_file",
        resourceId: result.rows[0].file_id,
        details: { patientId, fileName, fileType },
        ipAddress: event.requestContext?.http?.sourceIp,
        userAgent: event.headers?.["user-agent"],
        status: "success",
      });

      return success(result.rows[0], "File uploaded successfully");
    } catch (err) {
      console.error("Save file metadata error:", err);
      return error("Failed to save file metadata", 500, err.message);
    }
  })
);

// ============================================================
// 3. GET FILES BY PATIENT
// ============================================================
const getFilesByPatient = withAuth(
  requireAnyRole(["doctor", "nurse"])(async (event) => {
    try {
      const patientId = event.pathParameters?.patientId;

      if (!patientId) {
        return validationError({ patientId: "Patient ID is required" });
      }

      const result = await db.query(
        `SELECT 
          pf.*,
          u.full_name as uploaded_by_name,
          u.email as uploaded_by_email
        FROM patient_files pf
        JOIN users u ON pf.uploaded_by = u.user_id
        WHERE pf.patient_id = $1 AND pf.is_deleted = false
        ORDER BY pf.upload_date DESC`,
        [patientId]
      );

      return success(result.rows, "Files retrieved successfully");
    } catch (err) {
      console.error("Get files error:", err);
      return error("Failed to retrieve files", 500, err.message);
    }
  })
);

// ============================================================
// 4. GET DOWNLOAD URL
// ============================================================
const getDownloadUrl = withAuth(
  requireAnyRole(["doctor", "nurse"])(async (event) => {
    try {
      const fileId = event.pathParameters?.fileId;

      if (!fileId) {
        return validationError({ fileId: "File ID is required" });
      }

      // Get file metadata
      const result = await db.query(
        "SELECT * FROM patient_files WHERE file_id = $1 AND is_deleted = false",
        [fileId]
      );

      if (result.rows.length === 0) {
        return error("File not found", 404);
      }

      const file = result.rows[0];

      // Generate presigned download URL (expires in 5 minutes)
      const downloadUrl = s3.getSignedUrl("getObject", {
        Bucket: file.s3_bucket,
        Key: file.s3_key,
        Expires: 300,
      });

      return success({
        downloadUrl,
        fileName: file.file_name,
        fileType: file.file_type,
        mimeType: file.mime_type,
      });
    } catch (err) {
      console.error("Get download URL error:", err);
      return error("Failed to generate download URL", 500, err.message);
    }
  })
);

// ============================================================
// 5. DELETE FILE
// ============================================================
const deleteFile = withAuth(
  requireAnyRole(["doctor"])(async (event) => {
    try {
      const fileId = event.pathParameters?.fileId;

      if (!fileId) {
        return validationError({ fileId: "File ID is required" });
      }

      // Get file metadata
      const fileResult = await db.query(
        "SELECT * FROM patient_files WHERE file_id = $1 AND is_deleted = false",
        [fileId]
      );

      if (fileResult.rows.length === 0) {
        return error("File not found", 404);
      }

      const file = fileResult.rows[0];

      // Soft delete in database
      await db.query(
        "UPDATE patient_files SET is_deleted = true WHERE file_id = $1",
        [fileId]
      );

      // Delete from S3
      await s3
        .deleteObject({
          Bucket: file.s3_bucket,
          Key: file.s3_key,
        })
        .promise();

      await logAction({
        userId: event.user.sub,
        userEmail: event.user.email,
        userRole: event.user.role,
        action: "DELETE_FILE",
        resourceType: "patient_file",
        resourceId: fileId,
        details: { fileName: file.file_name },
        ipAddress: event.requestContext?.http?.sourceIp,
        userAgent: event.headers?.["user-agent"],
        status: "success",
      });

      return success(null, "File deleted successfully");
    } catch (err) {
      console.error("Delete file error:", err);
      return error("Failed to delete file", 500, err.message);
    }
  })
);

module.exports = {
  getUploadUrl,
  saveFileMetadata,
  getFilesByPatient,
  getDownloadUrl,
  deleteFile,
};
