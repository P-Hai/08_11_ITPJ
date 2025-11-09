// handlers/auth.js
const AWS = require("aws-sdk");
const { success, error, validationError } = require("../utils/response");
const { logAction } = require("../utils/auditLog");

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.REGION,
});

// Login handler
const login = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { username, password } = body;

    // Validation
    if (!username || !password) {
      return validationError({
        username: !username ? "Username is required" : undefined,
        password: !password ? "Password is required" : undefined,
      });
    }

    console.log("Login attempt for username:", username);

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

    try {
      const authResult = await cognito.adminInitiateAuth(params).promise();

      // Check if password change is required
      if (authResult.ChallengeName === "NEW_PASSWORD_REQUIRED") {
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

      // Successful login
      const tokens = authResult.AuthenticationResult;

      // Get user details
      const userDetails = await cognito
        .adminGetUser({
          UserPoolId: process.env.USER_POOL_ID,
          Username: username,
        })
        .promise();

      // Extract user attributes
      const attributes = {};
      userDetails.UserAttributes.forEach((attr) => {
        attributes[attr.Name] = attr.Value;
      });

      // Log successful login
      await logAction({
        userId: attributes.sub,
        userEmail: attributes.email,
        userRole: attributes["custom:role"],
        action: "LOGIN",
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
            username: username,
            email: attributes.email,
            name: attributes.name,
            role: attributes["custom:role"],
            employeeId: attributes["custom:employee_id"],
            department: attributes["custom:department"],
          },
        },
        "Login successful"
      );
    } catch (authError) {
      console.error("Cognito authentication error:", authError);

      // Log failed login attempt
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

      if (authError.code === "NotAuthorizedException") {
        return error("Invalid username or password", 401);
      }

      if (authError.code === "UserNotFoundException") {
        return error("Invalid username or password", 401);
      }

      if (authError.code === "UserNotConfirmedException") {
        return error("User account not confirmed", 403);
      }

      throw authError;
    }
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

      // Log password change
      await logAction({
        userId: attributes.sub,
        userEmail: attributes.email,
        userRole: attributes["custom:role"],
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
            username: username,
            email: attributes.email,
            name: attributes.name,
            role: attributes["custom:role"],
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
