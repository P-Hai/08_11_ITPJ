// handlers/users.js - Admin User Management APIs
const AWS = require("aws-sdk");
const db = require("../config/db");
const {
  success,
  error,
  validationError,
  notFound,
} = require("../utils/response");
const { withAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { withAuditLog } = require("../utils/auditLog");

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.REGION,
});

// POST /users - Create new user (Doctor, Nurse, Receptionist)
const createUser = withAuth(
  requireRole("admin")(
    withAuditLog(
      "CREATE",
      "users"
    )(async (event) => {
      try {
        const body = JSON.parse(event.body || "{}");

        // Validation
        const required = ["username", "email", "full_name", "role"];
        const missing = required.filter((field) => !body[field]);

        if (missing.length > 0) {
          return validationError(
            missing.reduce((acc, field) => {
              acc[field] = `${field} is required`;
              return acc;
            }, {})
          );
        }

        // Validate role
        const allowedRoles = ["doctor", "nurse", "receptionist"];
        if (!allowedRoles.includes(body.role)) {
          return validationError({
            role: `Role must be one of: ${allowedRoles.join(", ")}`,
          });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
          return validationError({ email: "Invalid email format" });
        }

        // Generate temporary password
        const tempPassword = body.temporary_password || "TempPass@2025!";

        // 1. Create user in Cognito
        const cognitoParams = {
          UserPoolId: process.env.USER_POOL_ID,
          Username: body.username,
          TemporaryPassword: tempPassword,
          MessageAction: "SUPPRESS",
          UserAttributes: [
            { Name: "email", Value: body.email },
            { Name: "email_verified", Value: "true" },
            { Name: "name", Value: body.full_name },
            { Name: "custom:role", Value: body.role },
            { Name: "custom:employee_id", Value: body.username },
            {
              Name: "custom:department",
              Value: body.department || body.role,
            },
          ],
        };

        if (body.phone) {
          cognitoParams.UserAttributes.push({
            Name: "phone_number",
            Value: body.phone,
          });
        }

        const cognitoResult = await cognito
          .adminCreateUser(cognitoParams)
          .promise();
        const cognitoSub = cognitoResult.User.Attributes.find(
          (attr) => attr.Name === "sub"
        ).Value;

        // 2. Add user to Cognito group
        const groupName =
          body.role === "doctor"
            ? "Doctors"
            : body.role === "nurse"
            ? "nurse"
            : "Receptionists";

        await cognito
          .adminAddUserToGroup({
            UserPoolId: process.env.USER_POOL_ID,
            Username: body.username,
            GroupName: groupName,
          })
          .promise();

        // 3. Insert into database
        const dbQuery = `
            INSERT INTO users (
              cognito_sub,
              email,
              full_name,
              role,
              phone
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING user_id, email, full_name, role, created_at
          `;

        const dbResult = await db.query(dbQuery, [
          cognitoSub,
          body.email,
          body.full_name,
          body.role,
          body.phone || null,
        ]);

        return success(
          {
            user: dbResult.rows[0],
            temporary_password: tempPassword,
            username: body.username,
            note: "User must change password on first login",
          },
          "User created successfully",
          201
        );
      } catch (err) {
        console.error("Create user error:", err);

        if (err.code === "UsernameExistsException") {
          return error("Username already exists", 409);
        }

        if (err.code === "InvalidParameterException") {
          return error("Invalid user parameters", 400, err.message);
        }

        if (err.code === "23505") {
          return error("Email already exists in database", 409);
        }

        return error("Failed to create user", 500, err.message);
      }
    })
  )
);

// GET /users - List all users (with pagination)
const listUsers = withAuth(
  requireRole("admin")(
    withAuditLog(
      "READ",
      "users"
    )(async (event) => {
      try {
        const queryParams = event.queryStringParameters || {};
        const limit = parseInt(queryParams.limit) || 20;
        const offset = parseInt(queryParams.offset) || 0;
        const role = queryParams.role;
        const search = queryParams.search;

        // Build query
        let query = `
            SELECT 
              user_id,
              email,
              full_name,
              role,
              phone,
              is_active,
              created_at,
              last_login
            FROM users
            WHERE 1=1
          `;

        const conditions = [];
        const values = [];
        let paramCount = 1;

        if (role) {
          conditions.push(`role = $${paramCount}`);
          values.push(role);
          paramCount++;
        }

        if (search) {
          conditions.push(
            `(full_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`
          );
          values.push(`%${search}%`);
          paramCount++;
        }

        if (conditions.length > 0) {
          query += " AND " + conditions.join(" AND ");
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${
          paramCount + 1
        }`;
        values.push(limit, offset);

        const result = await db.query(query, values);

        // Get total count
        let countQuery = "SELECT COUNT(*) FROM users WHERE 1=1";
        if (conditions.length > 0) {
          countQuery += " AND " + conditions.join(" AND ");
        }
        const countResult = await db.query(countQuery, values.slice(0, -2));
        const total = parseInt(countResult.rows[0].count);

        // Get statistics
        const statsQuery = `
            SELECT 
              role,
              COUNT(*) as count,
              COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
            FROM users
            GROUP BY role
          `;
        const statsResult = await db.query(statsQuery);

        return success(
          {
            users: result.rows,
            statistics: statsResult.rows,
            pagination: {
              total,
              limit,
              offset,
              hasMore: offset + result.rows.length < total,
            },
          },
          "Users retrieved successfully"
        );
      } catch (err) {
        console.error("List users error:", err);
        return error("Failed to retrieve users", 500, err.message);
      }
    })
  )
);

// PUT /users/{id}/disable - Disable user account
const disableUser = withAuth(
  requireRole("admin")(
    withAuditLog(
      "UPDATE",
      "users"
    )(async (event) => {
      try {
        const userId = event.pathParameters?.id;

        if (!userId) {
          return validationError({ id: "User ID is required" });
        }

        // Get user from database
        const userQuery =
          "SELECT cognito_sub, email, role FROM users WHERE user_id = $1";
        const userResult = await db.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
          return notFound("User not found");
        }

        const user = userResult.rows[0];

        // Prevent disabling admin accounts
        if (user.role === "admin") {
          return error("Cannot disable admin accounts", 403);
        }

        // Get Cognito username
        const cognitoUser = await cognito
          .adminGetUser({
            UserPoolId: process.env.USER_POOL_ID,
            Username: user.cognito_sub,
          })
          .promise();

        const username = cognitoUser.Username;

        // Disable in Cognito
        await cognito
          .adminDisableUser({
            UserPoolId: process.env.USER_POOL_ID,
            Username: username,
          })
          .promise();

        // Update database
        const dbQuery =
          "UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING user_id, email, is_active";
        const dbResult = await db.query(dbQuery, [userId]);

        return success(dbResult.rows[0], "User disabled successfully");
      } catch (err) {
        console.error("Disable user error:", err);

        if (err.code === "UserNotFoundException") {
          return notFound("User not found in Cognito");
        }

        return error("Failed to disable user", 500, err.message);
      }
    })
  )
);

// POST /users/{id}/reset-password - Reset user password
const resetPassword = withAuth(
  requireRole("admin")(
    withAuditLog(
      "UPDATE",
      "users"
    )(async (event) => {
      try {
        const userId = event.pathParameters?.id;
        const body = JSON.parse(event.body || "{}");

        if (!userId) {
          return validationError({ id: "User ID is required" });
        }

        // Get user from database
        const userQuery =
          "SELECT cognito_sub, email FROM users WHERE user_id = $1";
        const userResult = await db.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
          return notFound("User not found");
        }

        const user = userResult.rows[0];

        // Get Cognito username
        const cognitoUser = await cognito
          .adminGetUser({
            UserPoolId: process.env.USER_POOL_ID,
            Username: user.cognito_sub,
          })
          .promise();

        const username = cognitoUser.Username;

        // Generate new temporary password
        const tempPassword = body.temporary_password || "ResetPass@2025!";

        // Reset password in Cognito
        await cognito
          .adminSetUserPassword({
            UserPoolId: process.env.USER_POOL_ID,
            Username: username,
            Password: tempPassword,
            Permanent: false, // User must change on next login
          })
          .promise();

        return success(
          {
            username: username,
            email: user.email,
            temporary_password: tempPassword,
            note: "User must change password on next login",
          },
          "Password reset successfully"
        );
      } catch (err) {
        console.error("Reset password error:", err);

        if (err.code === "UserNotFoundException") {
          return notFound("User not found in Cognito");
        }

        return error("Failed to reset password", 500, err.message);
      }
    })
  )
);

module.exports = {
  createUser,
  listUsers,
  disableUser,
  resetPassword,
};
