// src/aws-config.js
export const API_BASE_URL =
  "https://0lxxigdzgk.execute-api.ap-southeast-1.amazonaws.com";

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
