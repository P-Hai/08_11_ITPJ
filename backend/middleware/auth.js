// middleware/auth.js - FIXED VERSION WITH GROUP NAME NORMALIZATION
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const { error } = require("../utils/response");

// JWKS client for Cognito
const client = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.REGION}.amazonaws.com/${process.env.USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000,
});

// ✅ NEW: Helper function to normalize group names
// Converts: Receptionists → receptionist, Doctors → doctor, Nurses → nurse, Admins → admin
const normalizeGroupName = (groupName) => {
  const normalized = groupName.toLowerCase();
  // Remove trailing 's' from plural group names
  return normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
};

// Get signing key
const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
};

// Verify JWT token
const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        issuer: `https://cognito-idp.${process.env.REGION}.amazonaws.com/${process.env.USER_POOL_ID}`,
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      }
    );
  });
};

// Auth middleware
const withAuth = (handler) => {
  return async (event, context) => {
    try {
      // Get token from Authorization header
      const authHeader =
        event.headers?.authorization || event.headers?.Authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return error("Missing or invalid authorization header", 401);
      }

      const token = authHeader.substring(7);

      // Verify token
      let decoded;
      try {
        decoded = await verifyToken(token);
      } catch (err) {
        console.error("Token verification failed:", err.message);
        return error("Invalid or expired token", 401);
      }

      // ✅ FIX: Extract and normalize role from cognito:groups
      let userRole = "patient"; // default

      if (decoded["cognito:groups"] && decoded["cognito:groups"].length > 0) {
        const rawGroupName = decoded["cognito:groups"][0];
        userRole = normalizeGroupName(rawGroupName);
        console.log(
          `✅ User role from groups: ${userRole} (normalized from: ${rawGroupName})`
        );
      } else if (decoded["custom:role"]) {
        userRole = decoded["custom:role"].toLowerCase();
        console.log(`✅ User role from custom attribute: ${userRole}`);
      }

      // Add user info to event
      event.user = {
        sub: decoded.sub,
        email: decoded.email,
        username: decoded["cognito:username"],
        role: userRole, // ✅ Normalized role
        groups: decoded["cognito:groups"] || [],
      };

      console.log(
        `✅ Authenticated user: ${event.user.username} (${event.user.role})`
      );

      // Call handler
      return await handler(event, context);
    } catch (err) {
      console.error("Auth middleware error:", err);
      return error("Authentication failed", 500, err.message);
    }
  };
};

// RBAC middleware
const requireAnyRole = (allowedRoles) => {
  return (handler) => {
    return async (event, context) => {
      const userRole = event.user?.role;

      if (!userRole) {
        console.error("❌ No role found in event.user");
        return error("Access denied. No role found.", 403);
      }

      if (!allowedRoles.includes(userRole)) {
        console.error(
          `❌ Access denied. User role: ${userRole}, Required: ${allowedRoles.join(
            ", "
          )}`
        );
        return error(
          `Access denied. Required roles: ${allowedRoles.join(", ")}`,
          403
        );
      }

      console.log(`✅ RBAC check passed. User role: ${userRole}`);
      return await handler(event, context);
    };
  };
};

// Admin-only middleware
const requireAdmin = (handler) => {
  return requireAnyRole(["admin"])(handler);
};

module.exports = {
  withAuth,
  requireAnyRole,
  requireAdmin,
};
