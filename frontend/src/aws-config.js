// =========================
// AWS Cognito Configuration
// =========================
export const cognitoConfig = {
  region: "ap-southeast-1",
  userPoolId: "ap-southeast-1_KAphl41fW",
  userPoolWebClientId: "56ikumm3gld5ln6utag70vf781",
};

// =========================
// User Roles
// =========================
export const USER_ROLES = {
  ADMIN: "admin",
  DOCTOR: "doctor",
  NURSE: "nurse",
  RECEPTIONIST: "receptionist",
  PATIENT: "patient",
};

// =========================
// Username Prefix (for ID standardization)
// =========================
export const USERNAME_PREFIX = {
  ADMIN: "ADMIN",
  DOCTOR: "DOC",
  NURSE: "NUR",
  RECEPTIONIST: "REC",
  PATIENT: "PAT",
};
