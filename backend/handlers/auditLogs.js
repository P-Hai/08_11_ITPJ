// handlers/auditLogs.js
const db = require("../config/db");
const { success, error, validationError } = require("../utils/response");
const { withAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

// GET Audit Logs (Admin only)
const getLogs = withAuth(
  requireRole("admin")(async (event) => {
    try {
      const queryParams = event.queryStringParameters || {};

      const {
        user_email,
        user_role,
        action,
        resource_type,
        status,
        patient_id,
        start_date,
        end_date,
        limit = 50,
        offset = 0,
      } = queryParams;

      // Build query
      let query = `
          SELECT 
            log_id,
            user_email,
            user_role,
            action,
            resource_type,
            resource_id,
            patient_id,
            ip_address,
            timestamp,
            status,
            error_message
          FROM audit_logs
          WHERE 1=1
        `;

      const conditions = [];
      const values = [];
      let paramCount = 1;

      if (user_email) {
        conditions.push(`user_email ILIKE $${paramCount}`);
        values.push(`%${user_email}%`);
        paramCount++;
      }

      if (user_role) {
        conditions.push(`user_role = $${paramCount}`);
        values.push(user_role);
        paramCount++;
      }

      if (action) {
        conditions.push(`action = $${paramCount}`);
        values.push(action);
        paramCount++;
      }

      if (resource_type) {
        conditions.push(`resource_type = $${paramCount}`);
        values.push(resource_type);
        paramCount++;
      }

      if (status) {
        conditions.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;
      }

      if (patient_id) {
        conditions.push(`patient_id = $${paramCount}`);
        values.push(patient_id);
        paramCount++;
      }

      if (start_date) {
        conditions.push(`timestamp >= $${paramCount}`);
        values.push(start_date);
        paramCount++;
      }

      if (end_date) {
        conditions.push(`timestamp <= $${paramCount}`);
        values.push(end_date);
        paramCount++;
      }

      if (conditions.length > 0) {
        query += " AND " + conditions.join(" AND ");
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramCount} OFFSET $${
        paramCount + 1
      }`;
      values.push(parseInt(limit), parseInt(offset));

      const result = await db.query(query, values);

      // Get total count
      let countQuery = "SELECT COUNT(*) FROM audit_logs WHERE 1=1";
      if (conditions.length > 0) {
        countQuery += " AND " + conditions.join(" AND ");
      }
      const countResult = await db.query(countQuery, values.slice(0, -2));
      const total = parseInt(countResult.rows[0].count);

      // Get summary statistics
      const statsQuery = `
          SELECT 
            COUNT(*) as total_logs,
            COUNT(DISTINCT user_email) as unique_users,
            COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_actions,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_actions,
            COUNT(CASE WHEN status = 'denied' THEN 1 END) as denied_actions
          FROM audit_logs
          WHERE timestamp >= NOW() - INTERVAL '24 hours'
        `;
      const statsResult = await db.query(statsQuery);

      return success(
        {
          logs: result.rows,
          statistics: statsResult.rows[0],
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: parseInt(offset) + result.rows.length < total,
          },
        },
        "Audit logs retrieved successfully"
      );
    } catch (err) {
      console.error("Get audit logs error:", err);
      return error("Failed to retrieve audit logs", 500, err.message);
    }
  })
);

module.exports = {
  getLogs,
};
