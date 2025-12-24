// handlers/webauthn.js
const db = require("../config/db");
const { success, error, validationError } = require("../utils/response");
const { withAuth } = require("../middleware/auth");
const { logAction } = require("../utils/auditLog");

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");

// WebAuthn configuration
const rpName = "EHR System";
const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
const origin = process.env.WEBAUTHN_ORIGIN || "http://localhost:3000";

console.log("🔐 WebAuthn handler loaded with config:", { rpID, origin });

/**
 * POST /webauthn/register/start
 * Start biometric credential registration
 */
const startRegistration = withAuth(async (event) => {
  try {
    const user = event.user;

    const userQuery = await db.query(
      "SELECT user_id, email, full_name FROM users WHERE cognito_sub = $1",
      [user.sub]
    );

    if (userQuery.rows.length === 0) {
      return error("User not found", 404);
    }

    const dbUser = userQuery.rows[0];

    const existingCreds = await db.query(
      "SELECT credential_id FROM webauthn_credentials WHERE user_id = $1 AND is_active = true",
      [dbUser.user_id]
    );

    const excludeCredentials = existingCreds.rows.map((row) => {
      return {
        id: Buffer.from(row.credential_id, "base64"),
        type: "public-key",
        transports: ["internal", "hybrid"],
      };
    });

    const options = await generateRegistrationOptions({
      rpName: rpName,
      rpID: rpID,
      userID: dbUser.user_id,
      userName: dbUser.email,
      userDisplayName: dbUser.full_name,
      attestationType: "none",
      excludeCredentials: excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        requireResidentKey: false,
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    await db.query(
      `INSERT INTO webauthn_challenges (user_id, challenge, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
       ON CONFLICT (user_id) 
       DO UPDATE SET challenge = $2, expires_at = NOW() + INTERVAL '5 minutes'`,
      [dbUser.user_id, options.challenge]
    );

    return success(options, "Registration options generated");
  } catch (err) {
    console.error("Start registration error:", err);
    return error("Failed to start registration", 500, err.message);
  }
});

/**
 * POST /webauthn/register/finish
 * Complete biometric credential registration
 */
const finishRegistration = withAuth(async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const user = event.user;

    const userQuery = await db.query(
      "SELECT user_id FROM users WHERE cognito_sub = $1",
      [user.sub]
    );

    if (userQuery.rows.length === 0) {
      return error("User not found", 404);
    }

    const dbUser = userQuery.rows[0];

    const challengeQuery = await db.query(
      "SELECT challenge FROM webauthn_challenges WHERE user_id = $1 AND expires_at > NOW()",
      [dbUser.user_id]
    );

    if (challengeQuery.rows.length === 0) {
      return error("Challenge expired or not found", 400);
    }

    const expectedChallenge = challengeQuery.rows[0].challenge;

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified) {
      return error("Registration verification failed", 400);
    }

    const registrationInfo = verification.registrationInfo;

    await db.query(
      `INSERT INTO webauthn_credentials (
        credential_id,
        user_id,
        public_key,
        counter,
        device_type,
        device_name,
        aaguid,
        credential_public_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        Buffer.from(registrationInfo.credentialID).toString("base64"),
        dbUser.user_id,
        Buffer.from(registrationInfo.credentialPublicKey).toString("base64"),
        registrationInfo.counter,
        body.deviceType || "biometric",
        body.deviceName || "Biometric Device",
        Buffer.from(registrationInfo.aaguid).toString("hex"),
        Buffer.from(registrationInfo.credentialPublicKey).toString("base64"),
      ]
    );

    await db.query("DELETE FROM webauthn_challenges WHERE user_id = $1", [
      dbUser.user_id,
    ]);

    await logAction({
      userId: dbUser.user_id,
      userEmail: user.email,
      userRole: user.role,
      action: "WEBAUTHN_REGISTER",
      resourceType: "webauthn_credentials",
      ipAddress: event.requestContext?.http?.sourceIp || "unknown",
      userAgent: event.headers?.["user-agent"] || "unknown",
      status: "success",
    });

    return success(
      { verified: true },
      "Biometric credential registered successfully"
    );
  } catch (err) {
    console.error("Finish registration error:", err);
    return error("Failed to complete registration", 500, err.message);
  }
});

/**
 * POST /webauthn/auth/start
 * Start biometric authentication
 */
const startAuthentication = async (event) => {
  try {
    console.log("📥 WebAuthn auth start request");

    const body = JSON.parse(event.body || "{}");
    const username = body.username;

    if (!username) {
      console.error("❌ No username provided");
      return validationError({ username: "Username is required" });
    }

    console.log("🔍 Looking for user:", username);

    // Try to find user by cognito_username or email
    let userQuery;

    try {
      userQuery = await db.query(
        `SELECT u.user_id, u.email, u.full_name, u.role, u.cognito_sub
         FROM users u 
         WHERE u.cognito_username = $1 OR u.email = $1
         LIMIT 1`,
        [username]
      );
    } catch (dbError) {
      console.error(
        "❌ Database query error, trying fallback:",
        dbError.message
      );

      // Fallback: try email only
      userQuery = await db.query(
        `SELECT u.user_id, u.email, u.full_name, u.role, u.cognito_sub
         FROM users u 
         WHERE u.email = $1
         LIMIT 1`,
        [username]
      );
    }

    if (userQuery.rows.length === 0) {
      console.error("❌ User not found:", username);
      return error("User not found", 404);
    }

    const user = userQuery.rows[0];
    console.log("✅ User found:", user.user_id);

    const credsQuery = await db.query(
      "SELECT credential_id FROM webauthn_credentials WHERE user_id = $1 AND is_active = true",
      [user.user_id]
    );

    if (credsQuery.rows.length === 0) {
      console.error("❌ No biometric credentials for user");
      return error(
        "No biometric credentials found. Please register your biometric first.",
        404
      );
    }

    console.log("✅ Found", credsQuery.rows.length, "credentials");

    const allowCredentials = credsQuery.rows.map((row) => {
      return {
        id: Buffer.from(row.credential_id, "base64"),
        type: "public-key",
        transports: ["internal", "hybrid"],
      };
    });

    const options = await generateAuthenticationOptions({
      rpID: rpID,
      allowCredentials: allowCredentials,
      userVerification: "preferred",
    });

    await db.query(
      `INSERT INTO webauthn_challenges (user_id, challenge, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
       ON CONFLICT (user_id) 
       DO UPDATE SET challenge = $2, expires_at = NOW() + INTERVAL '5 minutes'`,
      [user.user_id, options.challenge]
    );

    console.log("✅ Challenge saved, returning options");

    return success(
      {
        ...options,
        userId: user.user_id,
        userEmail: user.email,
        userName: user.full_name,
        userRole: user.role,
      },
      "Authentication options generated"
    );
  } catch (err) {
    console.error("❌ Start authentication error:", err);
    console.error("Error stack:", err.stack);
    return error("Failed to start authentication", 500, err.message);
  }
};

/**
 * POST /webauthn/auth/finish
 * Complete biometric authentication
 */
const finishAuthentication = async (event) => {
  try {
    console.log("📥 WebAuthn auth finish request");

    const body = JSON.parse(event.body || "{}");
    const userId = body.userId;

    if (!userId) {
      return validationError({ userId: "User ID is required" });
    }

    const userQuery = await db.query(
      "SELECT user_id, email, full_name, role, cognito_sub FROM users WHERE user_id = $1",
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return error("User not found", 404);
    }

    const user = userQuery.rows[0];

    const challengeQuery = await db.query(
      "SELECT challenge FROM webauthn_challenges WHERE user_id = $1 AND expires_at > NOW()",
      [userId]
    );

    if (challengeQuery.rows.length === 0) {
      return error("Challenge expired or not found", 400);
    }

    const expectedChallenge = challengeQuery.rows[0].challenge;

    const credentialId = Buffer.from(body.id, "base64").toString("base64");
    const credQuery = await db.query(
      "SELECT credential_id, public_key, counter FROM webauthn_credentials WHERE credential_id = $1 AND user_id = $2 AND is_active = true",
      [credentialId, userId]
    );

    if (credQuery.rows.length === 0) {
      return error("Credential not found", 404);
    }

    const credential = credQuery.rows[0];

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(credential.credential_id, "base64"),
        credentialPublicKey: Buffer.from(credential.public_key, "base64"),
        counter: parseInt(credential.counter),
      },
    });

    if (!verification.verified) {
      await logAction({
        userId: user.user_id,
        userEmail: user.email,
        userRole: user.role,
        action: "WEBAUTHN_LOGIN",
        resourceType: "auth",
        ipAddress: event.requestContext?.http?.sourceIp || "unknown",
        userAgent: event.headers?.["user-agent"] || "unknown",
        status: "failed",
        errorMessage: "Biometric verification failed",
      });

      return error("Authentication verification failed", 401);
    }

    await db.query(
      "UPDATE webauthn_credentials SET counter = $1, last_used_at = NOW() WHERE credential_id = $2",
      [verification.authenticationInfo.newCounter, credentialId]
    );

    await db.query("DELETE FROM webauthn_challenges WHERE user_id = $1", [
      userId,
    ]);

    await db.query("UPDATE users SET last_login = NOW() WHERE user_id = $1", [
      userId,
    ]);

    await logAction({
      userId: user.user_id,
      userEmail: user.email,
      userRole: user.role,
      action: "WEBAUTHN_LOGIN",
      resourceType: "auth",
      ipAddress: event.requestContext?.http?.sourceIp || "unknown",
      userAgent: event.headers?.["user-agent"] || "unknown",
      status: "success",
    });

    // Generate JWT tokens
    const jwt = require("jsonwebtoken");
    const crypto = require("crypto");

    const tokenPayload = {
      sub: user.cognito_sub,
      email: user.email,
      email_verified: true,
      name: user.full_name,
      "cognito:username": user.cognito_sub,
      "cognito:groups": [user.role],
      role: user.role,
      auth_time: Math.floor(Date.now() / 1000),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const idToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "EHR_SYSTEM_SECRET_KEY_2025",
      {
        algorithm: "HS256",
        issuer: `https://cognito-idp.${process.env.REGION}.amazonaws.com/${process.env.USER_POOL_ID}`,
        audience: process.env.CLIENT_ID,
      }
    );

    const accessToken = jwt.sign(
      {
        sub: user.cognito_sub,
        client_id: process.env.CLIENT_ID,
        username: user.cognito_sub,
        token_use: "access",
        scope: "aws.cognito.signin.user.admin",
        auth_time: Math.floor(Date.now() / 1000),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      process.env.JWT_SECRET || "EHR_SYSTEM_SECRET_KEY_2025",
      {
        algorithm: "HS256",
      }
    );

    const refreshToken = crypto.randomBytes(64).toString("base64");

    console.log("✅ Tokens generated successfully");

    return success(
      {
        verified: true,
        user: {
          userId: user.user_id,
          user_id: user.user_id,
          sub: user.cognito_sub,
          email: user.email,
          name: user.full_name,
          full_name: user.full_name,
          role: user.role,
        },
        idToken: idToken,
        accessToken: accessToken,
        refreshToken: refreshToken,
        requiresMFA: false,
        expiresIn: 3600,
      },
      "Biometric authentication successful"
    );
  } catch (err) {
    console.error("❌ Finish authentication error:", err);
    console.error("Error stack:", err.stack);
    return error("Failed to complete authentication", 500, err.message);
  }
};

/**
 * GET /webauthn/credentials
 * Get list of registered biometric credentials
 */
const getCredentials = withAuth(async (event) => {
  try {
    const user = event.user;

    const userQuery = await db.query(
      "SELECT user_id FROM users WHERE cognito_sub = $1",
      [user.sub]
    );

    if (userQuery.rows.length === 0) {
      return error("User not found", 404);
    }

    const dbUser = userQuery.rows[0];

    const credsQuery = await db.query(
      `SELECT 
        credential_id,
        device_type,
        device_name,
        last_used_at,
        created_at,
        is_active
       FROM webauthn_credentials 
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [dbUser.user_id]
    );

    return success(
      { credentials: credsQuery.rows },
      "Credentials retrieved successfully"
    );
  } catch (err) {
    console.error("Get credentials error:", err);
    return error("Failed to get credentials", 500, err.message);
  }
});

/**
 * DELETE /webauthn/credentials/{id}
 * Delete biometric credential
 */
const deleteCredential = withAuth(async (event) => {
  try {
    const credentialId = event.pathParameters?.id;
    const user = event.user;

    if (!credentialId) {
      return validationError({ id: "Credential ID is required" });
    }

    const userQuery = await db.query(
      "SELECT user_id FROM users WHERE cognito_sub = $1",
      [user.sub]
    );

    if (userQuery.rows.length === 0) {
      return error("User not found", 404);
    }

    const dbUser = userQuery.rows[0];

    const result = await db.query(
      "UPDATE webauthn_credentials SET is_active = false WHERE credential_id = $1 AND user_id = $2 RETURNING credential_id",
      [credentialId, dbUser.user_id]
    );

    if (result.rows.length === 0) {
      return error("Credential not found", 404);
    }

    await logAction({
      userId: dbUser.user_id,
      userEmail: user.email,
      userRole: user.role,
      action: "WEBAUTHN_DELETE",
      resourceType: "webauthn_credentials",
      resourceId: credentialId,
      ipAddress: event.requestContext?.http?.sourceIp || "unknown",
      userAgent: event.headers?.["user-agent"] || "unknown",
      status: "success",
    });

    return success(null, "Credential deleted successfully");
  } catch (err) {
    console.error("Delete credential error:", err);
    return error("Failed to delete credential", 500, err.message);
  }
});

// ✅ EXPORT AT THE END - AFTER ALL FUNCTIONS ARE DEFINED
module.exports = {
  startRegistration,
  finishRegistration,
  startAuthentication,
  finishAuthentication,
  getCredentials,
  deleteCredential,
};
