// middleware/auth.js
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const { error: errorResponse } = require("../utils/response");

// JWKS client for Cognito tokens
const client = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.REGION}.amazonaws.com/${process.env.USER_POOL_ID}/.well-known/jwks.json`,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

/**
 * Verify JWT token (supports both Cognito and WebAuthn custom tokens)
 */
const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    try {
      // Decode token header to check algorithm
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded) {
        reject(new Error("Invalid token format"));
        return;
      }

      const header = decoded.header;
      const payload = decoded.payload;

      console.log("🔍 Token algorithm:", header.alg);
      console.log("🔍 Token issuer:", payload.iss);

      // ✅ CHECK ALGORITHM TO DETERMINE TOKEN TYPE
      if (header.alg === "HS256") {
        // WebAuthn custom token (symmetric key)
        console.log("🔐 Verifying WebAuthn custom token (HS256)");

        try {
          const verified = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ["HS256"],
          });
          console.log("✅ WebAuthn token verified");
          resolve(verified);
        } catch (err) {
          console.error("❌ WebAuthn token verification failed:", err.message);
          reject(err);
        }
      } else if (header.alg === "RS256") {
        // Cognito token (asymmetric key)
        console.log("🔐 Verifying Cognito token (RS256)");

        const cognitoIssuer = `https://cognito-idp.${process.env.REGION}.amazonaws.com/${process.env.USER_POOL_ID}`;

        jwt.verify(
          token,
          getKey,
          {
            issuer: cognitoIssuer,
            audience: process.env.CLIENT_ID,
            algorithms: ["RS256"],
          },
          (err, decoded) => {
            if (err) {
              console.error(
                "❌ Cognito token verification failed:",
                err.message
              );
              reject(err);
            } else {
              console.log("✅ Cognito token verified");
              resolve(decoded);
            }
          }
        );
      } else {
        console.error("❌ Unsupported algorithm:", header.alg);
        reject(new Error(`Unsupported algorithm: ${header.alg}`));
      }
    } catch (err) {
      console.error("❌ Token verification error:", err.message);
      reject(err);
    }
  });
};

/**
 * Auth middleware - supports both Cognito and WebAuthn tokens
 */
const withAuth = (handler) => {
  return async (event) => {
    try {
      // Extract token from Authorization header
      const authHeader =
        event.headers?.authorization || event.headers?.Authorization;

      if (!authHeader) {
        console.error("❌ No authorization header");
        return errorResponse("Unauthorized - No token provided", 401);
      }

      const token = authHeader.replace(/^Bearer\s+/i, "");

      if (!token) {
        console.error("❌ No token in authorization header");
        return errorResponse("Unauthorized - Invalid token format", 401);
      }

      // Verify token (auto-detects Cognito vs WebAuthn)
      const decoded = await verifyToken(token);

      // Attach user info to event
      event.user = {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role || decoded["cognito:groups"]?.[0],
        username: decoded["cognito:username"] || decoded.email,
      };

      console.log(
        "✅ User authenticated:",
        event.user.email,
        "Role:",
        event.user.role
      );

      // Call the actual handler
      return await handler(event);
    } catch (err) {
      console.error("❌ Auth middleware error:", err.message);
      return errorResponse("Unauthorized - Invalid token", 401);
    }
  };
};

/**
 * Role-based access control middleware
 */
const requireRole = (allowedRoles) => {
  return (handler) => {
    return withAuth(async (event) => {
      const userRole = event.user.role;

      if (!allowedRoles.includes(userRole)) {
        console.error(
          `❌ Role ${userRole} not allowed. Required: ${allowedRoles.join(
            ", "
          )}`
        );
        return errorResponse(
          `Access denied. Required role: ${allowedRoles.join(" or ")}`,
          403
        );
      }

      console.log(`✅ Role ${userRole} authorized`);
      return await handler(event);
    });
  };
};

/**
 * Allow any of the specified roles
 */
const requireAnyRole = (allowedRoles) => {
  return (handler) => {
    return withAuth(async (event) => {
      const userRole = event.user.role;

      if (!allowedRoles.includes(userRole)) {
        return errorResponse(
          `Access denied. Required role: ${allowedRoles.join(" or ")}`,
          403
        );
      }

      return await handler(event);
    });
  };
};

module.exports = {
  withAuth,
  requireRole,
  requireAnyRole,
};
