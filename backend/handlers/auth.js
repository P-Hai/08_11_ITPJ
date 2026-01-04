// handlers/auth.js - FIXED VERSION
const AWS = require("aws-sdk");
const db = require("../config/db");
const { success, error, validationError } = require("../utils/response");
const { logAction } = require("../utils/auditLog");

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.REGION,
});

// ✅ NEW: Helper function to normalize group names
const normalizeGroupName = (groupName) => {
  const normalized = groupName.toLowerCase();
  // Remove trailing 's' from plural group names
  // Receptionists → receptionist
  // Doctors → doctor
  // Nurses → nurse
  return normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
};

// Login handler
const login = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { username, password } = body;

    // Validation
    if (!username || !password) {
      console.log("🔴 Validation failed: missing credentials");
      return validationError({
        username: !username ? "Username is required" : undefined,
        password: !password ? "Password is required" : undefined,
      });
    }

    console.log("🔵 Login attempt for username:", username);

    // Validate Cognito credentials
    if (!process.env.USER_POOL_ID || !process.env.CLIENT_ID) {
      console.error("🔴 Missing Cognito configuration");
      return error("Server configuration error", 500);
    }

    // Authenticate with Cognito
    const params = {
      AuthFlow: "ADMIN_NO_SRP_AUTH",
      UserPoolId: process.env.USER_POOL_ID,
      ClientId: process.env.CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    };

    console.log(
      "🔵 Attempting Cognito auth with UserPool:",
      process.env.USER_POOL_ID
    );

    let authResult;
    try {
      authResult = await cognito.adminInitiateAuth(params).promise();
      console.log("✅ Cognito auth successful");
    } catch (authError) {
      console.error(
        "🔴 Cognito authentication error:",
        authError.code,
        authError.message
      );

      // Log failed login attempt
      try {
        await logAction({
          userId: null,
          userEmail: username,
          userRole: null,
          action: "LOGIN",
          resourceType: "auth",
          resourceId: null,
          ipAddress: event.requestContext?.http?.sourceIp || "unknown",
          userAgent: event.headers?.["user-agent"] || "unknown",
          status: "failed",
          errorMessage: authError.code || authError.message,
        });
      } catch (logErr) {
        console.warn("⚠️ Could not log failed attempt:", logErr.message);
      }

      if (authError.code === "NotAuthorizedException") {
        console.log("🔴 Invalid username or password");
        return error("Invalid username or password", 401);
      }

      if (authError.code === "UserNotFoundException") {
        console.log("🔴 User not found");
        return error("Invalid username or password", 401);
      }

      if (authError.code === "UserNotConfirmedException") {
        console.log("🔴 User account not confirmed");
        return error("User account not confirmed", 403);
      }

      console.error("🔴 Unexpected Cognito error:", authError);
      return error("Authentication failed", 500, authError.message);
    }

    // Check if password change is required
    if (authResult.ChallengeName === "NEW_PASSWORD_REQUIRED") {
      console.log("🔵 Password change required");
      return success(
        {
          challengeName: "NEW_PASSWORD_REQUIRED",
          session: authResult.Session,
          message: "Password change required on first login",
        },
        "Password change required",
        200
      );
    }

    // Successful Cognito auth
    const tokens = authResult.AuthenticationResult;
    console.log("✅ Cognito tokens obtained");

    // Get user details from Cognito
    let userDetails;
    try {
      userDetails = await cognito
        .adminGetUser({
          UserPoolId: process.env.USER_POOL_ID,
          Username: username,
        })
        .promise();
      console.log("✅ User details retrieved from Cognito");
    } catch (getUserError) {
      console.error("🔴 Error getting user details:", getUserError);
      return error(
        "Could not retrieve user details",
        500,
        getUserError.message
      );
    }

    // Extract user attributes
    const attributes = {};
    userDetails.UserAttributes.forEach((attr) => {
      attributes[attr.Name] = attr.Value;
    });

    // ✅ Determine user role FIRST (before database operations)
    let userRole = attributes["custom:role"] || "patient";
    console.log("🔵 Initial user role:", userRole);

    // Get user role from Cognito groups
    if (!userRole || userRole === "patient") {
      try {
        const groupsData = await cognito
          .adminListGroupsForUser({
            UserPoolId: process.env.USER_POOL_ID,
            Username: username,
          })
          .promise();

        if (groupsData.Groups.length > 0) {
          const rawGroupName = groupsData.Groups[0].GroupName;
          // ✅ FIX: Normalize group name (remove trailing 's')
          userRole = normalizeGroupName(rawGroupName);
          console.log(
            "✅ User role from groups:",
            userRole,
            "(normalized from:",
            rawGroupName + ")"
          );
        }
      } catch (groupError) {
        console.warn("⚠️ Could not get user groups:", groupError.message);
      }
    }

    // ✅ Get user_id from database
    let dbUser = null;
    try {
      console.log(
        "🔵 Querying database for user with cognito_sub:",
        attributes.sub
      );
      const dbUserQuery = await db.query(
        `SELECT user_id, email, full_name, role, phone 
         FROM users 
         WHERE cognito_sub = $1`,
        [attributes.sub]
      );

      if (dbUserQuery.rows.length > 0) {
        dbUser = dbUserQuery.rows[0];
        console.log("✅ Database user found:", dbUser.user_id);

        // Update last login
        await db.query(
          "UPDATE users SET last_login = NOW() WHERE user_id = $1",
          [dbUser.user_id]
        );
        console.log("✅ Last login updated");
      } else {
        console.warn(
          "⚠️ User not found in database, cognito_sub:",
          attributes.sub
        );

        // ✅ AUTO-CREATE USER IN DATABASE if missing
        console.log("📝 Auto-creating user in database...");
        try {
          const defaultRole = userRole || "patient";

          // Try to insert, but ignore if already exists
          try {
            await db.query(
              `INSERT INTO users (cognito_sub, email, full_name, role, phone, is_active)
               VALUES ($1, $2, $3, $4, $5, true)`,
              [
                attributes.sub,
                attributes.email,
                attributes.name || username,
                defaultRole,
                attributes.phone_number || null,
              ]
            );
            console.log("✅ User created in database");
          } catch (insertErr) {
            // User might already exist, that's OK
            if (insertErr.code !== "23505") {
              // 23505 = unique violation, expected if user exists
              console.warn(
                "⚠️ Insert error (may be expected):",
                insertErr.code,
                insertErr.message
              );
            }
          }

          // Now fetch the user
          const selectResult = await db.query(
            `SELECT user_id, email, full_name, role, phone FROM users WHERE cognito_sub = $1`,
            [attributes.sub]
          );

          if (selectResult.rows && selectResult.rows.length > 0) {
            dbUser = selectResult.rows[0];
            console.log("✅ User retrieved from database:", dbUser.user_id);
          } else {
            console.warn("⚠️ Could not find user after INSERT/SELECT");
          }
        } catch (createError) {
          console.error(
            "⚠️ Could not auto-create user:",
            createError.message,
            createError.code
          );
        }
      }
    } catch (dbError) {
      console.error("🔴 Database query error:", dbError);
      return error("Database error during login", 500, dbError.message);
    }

    // Use database role if available (overrides Cognito)
    if (dbUser && dbUser.role) {
      userRole = dbUser.role;
      console.log("✅ User role from database:", userRole);
    }

    // Log successful login
    try {
      await logAction({
        userId: dbUser ? dbUser.user_id : attributes.sub,
        userEmail: attributes.email,
        userRole: userRole,
        action: "LOGIN",
        resourceType: "auth",
        resourceId: attributes.sub,
        ipAddress: event.requestContext?.http?.sourceIp || "unknown",
        userAgent: event.headers?.["user-agent"] || "unknown",
        status: "success",
      });
      console.log("✅ Login action logged");
    } catch (logError) {
      console.warn("⚠️ Could not log action:", logError.message);
    }

    console.log("✅ Login successful for user:", username);
    return success(
      {
        accessToken: tokens.AccessToken,
        idToken: tokens.IdToken,
        refreshToken: tokens.RefreshToken,
        expiresIn: tokens.ExpiresIn,
        user: {
          // Cognito info
          sub: attributes.sub,
          username: username,
          email: attributes.email,
          name: attributes.name,

          // Database info
          userId: dbUser ? dbUser.user_id : null,
          user_id: dbUser ? dbUser.user_id : null,
          full_name: dbUser ? dbUser.full_name : attributes.name,
          role: userRole, // ✅ Normalized role
          phone: dbUser ? dbUser.phone : null,

          // Cognito custom attributes (fallback)
          employeeId: attributes["custom:employee_id"],
          department: attributes["custom:department"],
        },
      },
      "Login successful"
    );
  } catch (err) {
    console.error("Login error:", err);
    return error("Login failed", 500, err.message);
  }
};

// Change password (for first-time login or password reset)
const changePassword = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { username, session, oldPassword, newPassword } = body;

    // Validation
    if (!username) {
      return validationError({ username: "Username is required" });
    }

    if (!newPassword) {
      return validationError({ newPassword: "New password is required" });
    }

    // Password strength validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return validationError({
        newPassword:
          "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
      });
    }

    // Case 1: First-time login (NEW_PASSWORD_REQUIRED challenge)
    if (session) {
      const params = {
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        ClientId: process.env.CLIENT_ID,
        UserPoolId: process.env.USER_POOL_ID,
        ChallengeResponses: {
          USERNAME: username,
          NEW_PASSWORD: newPassword,
        },
        Session: session,
      };

      const result = await cognito
        .adminRespondToAuthChallenge(params)
        .promise();
      const tokens = result.AuthenticationResult;

      // Get user details
      const userDetails = await cognito
        .adminGetUser({
          UserPoolId: process.env.USER_POOL_ID,
          Username: username,
        })
        .promise();

      const attributes = {};
      userDetails.UserAttributes.forEach((attr) => {
        attributes[attr.Name] = attr.Value;
      });

      // Get user from database
      let dbUser = null;
      try {
        const dbUserQuery = await db.query(
          "SELECT user_id, email, full_name, role FROM users WHERE cognito_sub = $1",
          [attributes.sub]
        );
        dbUser = dbUserQuery.rows[0];
      } catch (dbError) {
        console.error("Database query error:", dbError);
      }

      // Get role
      let userRole = attributes["custom:role"] || "patient";

      if (!userRole || userRole === "patient") {
        try {
          const groupsData = await cognito
            .adminListGroupsForUser({
              UserPoolId: process.env.USER_POOL_ID,
              Username: username,
            })
            .promise();

          if (groupsData.Groups.length > 0) {
            const rawGroupName = groupsData.Groups[0].GroupName;
            // ✅ FIX: Normalize group name
            userRole = normalizeGroupName(rawGroupName);
          }
        } catch (groupError) {
          console.warn("Could not get user groups:", groupError.message);
        }
      }

      if (dbUser && dbUser.role) {
        userRole = dbUser.role;
      }

      // Log password change
      await logAction({
        userId: dbUser ? dbUser.user_id : attributes.sub,
        userEmail: attributes.email,
        userRole: userRole,
        action: "CHANGE_PASSWORD",
        resourceType: "auth",
        resourceId: attributes.sub,
        ipAddress: event.requestContext?.http?.sourceIp || "unknown",
        userAgent: event.headers?.["user-agent"] || "unknown",
        status: "success",
      });

      return success(
        {
          accessToken: tokens.AccessToken,
          idToken: tokens.IdToken,
          refreshToken: tokens.RefreshToken,
          expiresIn: tokens.ExpiresIn,
          user: {
            sub: attributes.sub,
            username: username,
            email: attributes.email,
            name: attributes.name,
            userId: dbUser ? dbUser.user_id : null,
            user_id: dbUser ? dbUser.user_id : null,
            full_name: dbUser ? dbUser.full_name : attributes.name,
            role: userRole,
            employeeId: attributes["custom:employee_id"],
          },
        },
        "Password changed successfully"
      );
    }

    // Case 2: Regular password change (user is already authenticated)
    if (!oldPassword) {
      return validationError({ oldPassword: "Old password is required" });
    }

    // Authenticate first with old password
    const authParams = {
      AuthFlow: "ADMIN_NO_SRP_AUTH",
      UserPoolId: process.env.USER_POOL_ID,
      ClientId: process.env.CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: oldPassword,
      },
    };

    await cognito.adminInitiateAuth(authParams).promise();

    // Change password
    const changeParams = {
      UserPoolId: process.env.USER_POOL_ID,
      Username: username,
      Password: newPassword,
      Permanent: true,
    };

    await cognito.adminSetUserPassword(changeParams).promise();

    return success(
      null,
      "Password changed successfully. Please login with new password."
    );
  } catch (err) {
    console.error("Change password error:", err);

    if (err.code === "NotAuthorizedException") {
      return error("Invalid old password", 401);
    }

    if (err.code === "InvalidPasswordException") {
      return error("Invalid password format", 400, err.message);
    }

    return error("Failed to change password", 500, err.message);
  }
};

// Refresh token
const refreshToken = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { refreshToken } = body;

    if (!refreshToken) {
      return validationError({ refreshToken: "Refresh token is required" });
    }

    const params = {
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: process.env.CLIENT_ID,
      UserPoolId: process.env.USER_POOL_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    };

    const result = await cognito.adminInitiateAuth(params).promise();
    const tokens = result.AuthenticationResult;

    return success(
      {
        accessToken: tokens.AccessToken,
        idToken: tokens.IdToken,
        expiresIn: tokens.ExpiresIn,
      },
      "Token refreshed successfully"
    );
  } catch (err) {
    console.error("Refresh token error:", err);
    return error("Failed to refresh token", 401, err.message);
  }
};

module.exports = {
  login,
  changePassword,
  refreshToken,
};
