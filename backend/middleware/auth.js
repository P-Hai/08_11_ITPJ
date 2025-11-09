// middleware/auth.js
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const { unauthorized } = require("../utils/response");

// JWKS client để verify Cognito JWT
const client = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.REGION}.amazonaws.com/${process.env.USER_POOL_ID}/.well-known/jwks.json`,
});

// Get signing key
const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.getPublicKey();
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

// Extract token from Authorization header
const extractToken = (event) => {
  const authHeader =
    event.headers?.Authorization || event.headers?.authorization;

  if (!authHeader) {
    return null;
  }

  // Format: "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
};

// ✅ THÊM: Check token type
const getTokenType = (decoded) => {
  return decoded.token_use; // "id" hoặc "access"
};

// Middleware: Authenticate request
const authenticate = async (event) => {
  try {
    const token = extractToken(event);

    if (!token) {
      throw new Error("No token provided");
    }

    const decoded = await verifyToken(token);

    // ✅ THÊM: Validate token type
    const tokenType = getTokenType(decoded);

    if (tokenType !== "id") {
      throw new Error(
        "Invalid token type. Please use ID token instead of access token."
      );
    }

    // Extract user info from token
    const user = {
      sub: decoded.sub,
      username: decoded["cognito:username"],
      email: decoded.email,
      name: decoded.name,
      role: decoded["custom:role"], // ← ID Token có field này
      employeeId: decoded["custom:employee_id"],
      department: decoded["custom:department"],
      groups: decoded["cognito:groups"] || [],
    };

    // ✅ THÊM: Validate role exists
    if (!user.role) {
      console.warn(`User ${user.username} does not have custom:role attribute`);
    }

    return { authenticated: true, user };
  } catch (error) {
    console.error("Authentication error:", error.message);
    return { authenticated: false, error: error.message };
  }
};

// Wrapper for authenticated handlers
const withAuth = (handler) => {
  return async (event) => {
    const authResult = await authenticate(event);

    if (!authResult.authenticated) {
      return unauthorized("Invalid or expired token");
    }

    // Attach user to event
    event.user = authResult.user;

    // Call actual handler
    return handler(event);
  };
};

module.exports = {
  authenticate,
  verifyToken,
  extractToken,
  withAuth,
  getTokenType, // ✅ Export thêm helper function
};
