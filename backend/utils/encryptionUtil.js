// utils/encryptionUtil.js - Centralized encryption/decryption
const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";

// Get encryption key from environment
const getEncryptionKey = () => {
  return crypto.scryptSync(process.env.DB_PASSWORD || "secret", "salt", 32);
};

/**
 * Encrypt sensitive data
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text in format "iv:encryptedData"
 */
const encrypt = (text) => {
  if (!text) return null;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
};

/**
 * Decrypt sensitive data
 * @param {string} text - Encrypted text in format "iv:encryptedData"
 * @returns {string|null} - Decrypted plain text or null if decryption fails
 */
const decrypt = (text) => {
  if (!text) return null;

  try {
    const key = getEncryptionKey();
    const parts = text.split(":");

    if (parts.length !== 2) {
      console.error("Invalid encrypted data format");
      return null;
    }

    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = Buffer.from(parts[1], "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
};

/**
 * Encrypt multiple fields in an object
 * @param {Object} data - Object containing fields to encrypt
 * @param {Array<string>} fields - Array of field names to encrypt
 * @returns {Object} - Object with encrypted fields
 */
const encryptFields = (data, fields) => {
  const result = { ...data };

  fields.forEach((field) => {
    if (result[field]) {
      result[`${field}_encrypted`] = encrypt(result[field]);
      delete result[field];
    }
  });

  return result;
};

/**
 * Decrypt multiple fields in an object
 * @param {Object} data - Object containing encrypted fields
 * @param {Array<string>} fields - Array of field names to decrypt (without _encrypted suffix)
 * @returns {Object} - Object with decrypted fields
 */
const decryptFields = (data, fields) => {
  const result = { ...data };

  fields.forEach((field) => {
    const encryptedField = `${field}_encrypted`;
    if (result[encryptedField]) {
      result[field] = decrypt(result[encryptedField]);
      delete result[encryptedField];
    }
  });

  return result;
};

module.exports = {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
};
