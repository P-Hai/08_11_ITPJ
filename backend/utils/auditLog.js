// utils/auditLog.js
const db = require("../config/db");

// Log user action to audit_logs table
const logAction = async ({
  userId,
  userEmail,
  userRole,
  action,
  resourceType,
  resourceId,
  patientId = null,
  ipAddress = null,
  userAgent = null,
  requestData = null,
  status = "success",
  errorMessage = null,
}) => {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Audit log timeout after 3s")), 3000)
    );

    // ✅ FIX: Nếu userId là Cognito sub, convert sang database user_id
    let dbUserId = userId;

    if (userId && userId.length > 36) {
      // Cognito sub format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-xxxxxxxxxx (dài hơn UUID)
      // Hoặc check nếu userId không phải UUID format chuẩn
      const userQuery = await db.query(
        "SELECT user_id FROM users WHERE cognito_sub = $1",
        [userId]
      );

      if (userQuery.rows.length > 0) {
        dbUserId = userQuery.rows[0].user_id;
      } else {
        console.warn("User not found in database for cognito_sub:", userId);
        dbUserId = null; // Cho phép null nếu không tìm thấy
      }
    }

    const queryText = `
      INSERT INTO audit_logs (
        user_id,
        user_email,
        user_role,
        action,
        resource_type,
        resource_id,
        patient_id,
        ip_address,
        user_agent,
        request_data,
        status,
        error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING log_id, timestamp
    `;

    const values = [
      dbUserId, // ✅ Dùng database user_id thay vì cognito_sub
      userEmail,
      userRole,
      action,
      resourceType,
      resourceId,
      patientId,
      ipAddress,
      userAgent,
      requestData ? JSON.stringify(requestData) : null,
      status,
      errorMessage,
    ];

    const logPromise = db.query(queryText, values);
    const result = await Promise.race([logPromise, timeoutPromise]);

    return result.rows[0];
  } catch (error) {
    console.error("Failed to log audit entry:", error.message);
    return null;
  }
};

// Extract IP address from event
const getIpAddress = (event) => {
  return (
    event.requestContext?.http?.sourceIp ||
    event.requestContext?.identity?.sourceIp ||
    "unknown"
  );
};

// Extract User Agent from event
const getUserAgent = (event) => {
  return (
    event.headers?.["user-agent"] || event.headers?.["User-Agent"] || "unknown"
  );
};

// ✅ FIX: Wrapper tự động lấy user_id từ database
const withAuditLog = (action, resourceType) => {
  return (handler) => {
    return async (event) => {
      const user = event.user;
      const startTime = Date.now();

      let result;
      let status = "success";
      let errorMessage = null;
      let resourceId = null;
      let dbUserId = null;

      try {
        // ✅ Lấy database user_id trước khi chạy handler
        if (user?.sub) {
          const userQuery = await db.query(
            "SELECT user_id FROM users WHERE cognito_sub = $1",
            [user.sub]
          );

          if (userQuery.rows.length > 0) {
            dbUserId = userQuery.rows[0].user_id;
          }
        }

        result = await handler(event);

        // Extract resource ID from response if available
        if (result.statusCode === 200 || result.statusCode === 201) {
          try {
            const body = JSON.parse(result.body);
            resourceId =
              body.data?.id ||
              body.data?.patient_id ||
              body.data?.record_id ||
              body.data?.vital_id ||
              body.data?.prescription_id;
          } catch (e) {
            // Ignore parsing errors
          }
        } else {
          status = "failed";
        }
      } catch (error) {
        status = "failed";
        errorMessage = error.message;
        throw error;
      } finally {
        // Log action (non-blocking)
        logAction({
          userId: dbUserId, // ✅ Dùng database user_id
          userEmail: user?.email,
          userRole: user?.role,
          action,
          resourceType,
          resourceId,
          patientId: event.pathParameters?.patientId || null,
          ipAddress: getIpAddress(event),
          userAgent: getUserAgent(event),
          requestData: {
            method: event.requestContext?.http?.method,
            path: event.requestContext?.http?.path,
            duration: Date.now() - startTime,
          },
          status,
          errorMessage,
        }).catch((err) => {
          console.error("Audit log failed:", err.message);
        });
      }

      return result;
    };
  };
};

module.exports = {
  logAction,
  getIpAddress,
  getUserAgent,
  withAuditLog,
};
