// src/aws-config.js
export const API_BASE_URL =
  "https://0lxxigdzgk.execute-api.ap-southeast-1.amazonaws.com";

// 🔐 WebAuthn Configuration - Dynamic based on current origin
// Support both localhost development and S3 production deployment
export const getWebAuthnConfig = () => {
  if (typeof window === "undefined") {
    // Server-side fallback
    return {
      rpId: "localhost",
      origin: "http://localhost:3000",
    };
  }

  const currentOrigin = window.location.origin;

  // Determine RP ID based on current origin
  let rpId = "localhost";

  if (currentOrigin.includes("s3-website")) {
    rpId = "ehr-frontend-9266.s3-website-ap-southeast-1.amazonaws.com";
  } else if (
    currentOrigin.includes("localhost") ||
    currentOrigin.includes("127.0.0.1")
  ) {
    rpId = "localhost";
  }

  return {
    rpId: rpId,
    origin: currentOrigin,
  };
};

// For convenience, export a static config that works with localhost
export const WEBAUTHN_CONFIG = {
  rpId: "localhost",
  origin: "http://localhost:3000",
};

export const cognitoConfig = {
  region: "ap-southeast-1",
  userPoolId: "ap-southeast-1_KAphl41fW",
  userPoolWebClientId: "56ikumm3gld5ln6utag70vf781",
};

export const USER_ROLES = {
  ADMIN: "admin",
  DOCTOR: "doctor",
  NURSE: "nurse",
  RECEPTIONIST: "receptionist",
  PATIENT: "patient",
};
