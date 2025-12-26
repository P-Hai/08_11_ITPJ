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
/**
 * POST /users
 * Create new user (Admin only)
 */
const createUser = requireRole(["admin"])(
  withAuditLog(
    "CREATE",
    "users"
  )(async (event) => {
    try {
      const body = JSON.parse(event.body || "{}");
      const { username, email, fullName, role } = body;

      // Validation
      if (!username || !email || !fullName || !role) {
        return validationError({
          username: !username ? "Username is required" : undefined,
          email: !email ? "Email is required" : undefined,
          fullName: !fullName ? "Full name is required" : undefined,
          role: !role ? "Role is required" : undefined,
        });
      }

      const validRoles = [
        "admin",
        "doctor",
        "nurse",
        "receptionist",
        "patient",
      ];
      if (!validRoles.includes(role)) {
        return validationError({
          role: `Role must be one of: ${validRoles.join(", ")}`,
        });
      }

      // ✅ GENERATE RANDOM 6-CHARACTER PASSWORD
      const generateRandomPassword = () => {
        const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const lowercase = "abcdefghijklmnopqrstuvwxyz";
        const numbers = "0123456789";
        const special = "!@#$%";
        const allChars = uppercase + lowercase + numbers + special;

        let password = "";
        // Ensure at least 1 of each type
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += special[Math.floor(Math.random() * special.length)];

        // Fill remaining 2 characters
        for (let i = 0; i < 2; i++) {
          password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        // Shuffle password
        return password
          .split("")
          .sort(() => Math.random() - 0.5)
          .join("");
      };

      const temporaryPassword = generateRandomPassword();

      console.log("🔐 Generated password:", temporaryPassword); // For logging only

      // Create user in Cognito
      const createParams = {
        UserPoolId: process.env.USER_POOL_ID,
        Username: username,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
          { Name: "name", Value: fullName },
        ],
        TemporaryPassword: temporaryPassword,
        MessageAction: "SUPPRESS", // Don't send email from Cognito
      };

      const cognitoResponse = await cognito
        .adminCreateUser(createParams)
        .promise();

      const cognitoSub = cognitoResponse.User.Attributes.find(
        (attr) => attr.Name === "sub"
      ).Value;

      // Add user to role group
      await cognito
        .adminAddUserToGroup({
          UserPoolId: process.env.USER_POOL_ID,
          Username: username,
          GroupName: role,
        })
        .promise();

      // Insert into database
      const insertResult = await db.query(
        `INSERT INTO users (user_id, cognito_sub, cognito_username, email, full_name, role, created_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, NOW())
         RETURNING user_id, cognito_username, email, full_name, role, created_at`,
        [cognitoSub, username, email, fullName, role]
      );

      const newUser = insertResult.rows[0];

      // ✅ SEND EMAIL WITH PASSWORD VIA SES
      const ses = new AWS.SES({ region: process.env.REGION });

      const emailParams = {
        Source: "no-reply@ehr-system.com", // Must be verified in SES
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Subject: {
            Data: "Welcome to EHR System - Your Account Details",
          },
          Body: {
            Html: {
              Data: `
                <html>
                  <head>
                    <style>
                      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                      .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
                      .password { font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; font-family: monospace; }
                      .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
                      .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1>🏥 Welcome to EHR System</h1>
                      </div>
                      <div class="content">
                        <p>Hello <strong>${fullName}</strong>,</p>
                        
                        <p>Your account has been created successfully! You can now access the EHR System.</p>
                        
                        <div class="credentials">
                          <p><strong>Your Login Credentials:</strong></p>
                          <p>👤 <strong>Username:</strong> ${username}</p>
                          <p>🔑 <strong>Temporary Password:</strong></p>
                          <p class="password">${temporaryPassword}</p>
                          <p>👔 <strong>Role:</strong> ${
                            role.charAt(0).toUpperCase() + role.slice(1)
                          }</p>
                        </div>
                        
                        <div class="warning">
                          <p><strong>⚠️ Important:</strong></p>
                          <ul>
                            <li>This is a temporary password</li>
                            <li>You will be required to change it on first login</li>
                            <li>Keep this password secure and do not share it</li>
                          </ul>
                        </div>
                        
                        <p><strong>Login URL:</strong> <a href="http://localhost:3000">http://localhost:3000</a></p>
                        
                        <p>If you have any questions, please contact your administrator.</p>
                        
                        <p>Best regards,<br><strong>EHR System Team</strong></p>
                      </div>
                      <div class="footer">
                        <p>This is an automated message. Please do not reply to this email.</p>
                      </div>
                    </div>
                  </body>
                </html>
              `,
            },
          },
        },
      };

      try {
        await ses.sendEmail(emailParams).promise();
        console.log("✅ Password email sent to:", email);
      } catch (emailError) {
        console.error("❌ Failed to send email:", emailError);
        // Continue even if email fails
      }

      return success(
        {
          user: newUser,
          temporaryPassword: temporaryPassword, // ✅ Return in response for admin to see
        },
        "User created successfully. Temporary password has been sent to the user's email."
      );
    } catch (err) {
      console.error("Create user error:", err);

      if (err.code === "UsernameExistsException") {
        return error("Username already exists", 409);
      }

      return error("Failed to create user", 500, err.message);
    }
  })
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
