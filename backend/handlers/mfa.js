// handlers/mfa.js
const db = require("../config/db");
const { success, error, validationError } = require("../utils/response");
const { sendOTPEmail } = require("../utils/email");

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * POST /mfa/init
 * Khởi tạo MFA challenge - Gửi OTP qua email
 */
const initMFA = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { userId } = body;

    console.log("🔐 Init MFA for user:", userId);

    if (!userId) {
      return validationError({ userId: "User ID is required" });
    }

    const userQuery = await db.query(
      `SELECT u.user_id, u.email, u.full_name, u.role, u.phone,
          COALESCE(m.mfa_enabled, true) as mfa_enabled
   FROM users u
   LEFT JOIN mfa_settings m ON u.user_id = m.user_id
   WHERE u.user_id = $1`,
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return error("User not found", 404);
    }

    const user = userQuery.rows[0];

    // Check role có cần MFA không
    const mfaRequiredRoles = ["doctor", "nurse", "receptionist", "admin"];
    if (!mfaRequiredRoles.includes(user.role)) {
      return success({
        mfaRequired: false,
        message: "MFA not required for this role",
      });
    }

    // Check email
    if (!user.email) {
      return error("User email not configured", 400);
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    console.log("📧 Generated OTP:", otp, "for", user.email);

    // Xóa challenges cũ chưa verify
    await db.query(
      "DELETE FROM mfa_challenges WHERE user_id = $1 AND verified = false",
      [userId]
    );

    // Lưu challenge mới vào database
    await db.query(
      `INSERT INTO mfa_challenges 
       (user_id, challenge_type, challenge_code, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        "email",
        otp,
        expiresAt,
        event.requestContext?.http?.sourceIp || "unknown",
        event.headers?.["user-agent"] || "unknown",
      ]
    );

    // Gửi email OTP
    try {
      await sendOTPEmail(user.email, otp, user.full_name || "User");
      console.log("✅ Email sent successfully to:", user.email);
    } catch (emailError) {
      console.error("❌ Email send failed:", emailError);
      return error(
        "Failed to send verification email",
        500,
        emailError.message
      );
    }

    // Mask email để bảo mật
    const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3");

    return success(
      {
        mfaRequired: true,
        method: "email",
        email: maskedEmail,
        expiresIn: 300, // 5 minutes = 300 seconds
        message: `Verification code sent to ${maskedEmail}`,
      },
      "MFA challenge created successfully"
    );
  } catch (err) {
    console.error("❌ Init MFA error:", err);
    return error("Failed to initialize MFA", 500, err.message);
  }
};

/**
 * POST /mfa/verify
 * Xác thực OTP code
 */
const verifyMFA = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { userId, code } = body;

    console.log("🔍 Verify MFA for user:", userId, "code:", code);

    // Validation
    if (!userId || !code) {
      return validationError({
        userId: !userId ? "User ID is required" : undefined,
        code: !code ? "Verification code is required" : undefined,
      });
    }

    // Lấy challenge mới nhất chưa verify và chưa hết hạn
    const challengeQuery = await db.query(
      `SELECT * FROM mfa_challenges 
       WHERE user_id = $1 
       AND verified = false 
       AND expires_at > NOW()
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );

    if (challengeQuery.rows.length === 0) {
      return error("No valid verification code found or code has expired", 400);
    }

    const challenge = challengeQuery.rows[0];

    // Check số lần thử
    if (challenge.attempts >= challenge.max_attempts) {
      return error(
        "Maximum verification attempts exceeded. Please request a new code.",
        429
      );
    }

    // Verify OTP
    const isValid = code.trim() === challenge.challenge_code.trim();

    if (isValid) {
      console.log("✅ OTP verified successfully!");

      // Mark challenge as verified
      await db.query(
        `UPDATE mfa_challenges 
         SET verified = true, verified_at = NOW() 
         WHERE challenge_id = $1`,
        [challenge.challenge_id]
      );

      // Update last MFA time
      await db.query(
        `INSERT INTO mfa_settings (user_id, last_mfa_at)
         VALUES ($1, NOW())
         ON CONFLICT (user_id) 
         DO UPDATE SET last_mfa_at = NOW()`,
        [userId]
      );

      return success(
        {
          verified: true,
          message: "MFA verification successful",
        },
        "Verification successful"
      );
    } else {
      console.log("❌ Invalid OTP code");

      // Tăng số lần thử
      await db.query(
        `UPDATE mfa_challenges 
         SET attempts = attempts + 1 
         WHERE challenge_id = $1`,
        [challenge.challenge_id]
      );

      const attemptsLeft = challenge.max_attempts - challenge.attempts - 1;

      return error(
        `Invalid verification code. ${attemptsLeft} attempt${
          attemptsLeft !== 1 ? "s" : ""
        } remaining.`,
        401
      );
    }
  } catch (err) {
    console.error("❌ Verify MFA error:", err);
    return error("Failed to verify MFA", 500, err.message);
  }
};

/**
 * GET /mfa/status/{userId}
 * Kiểm tra MFA status của user
 */
const getMFAStatus = async (event) => {
  try {
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return validationError({ userId: "User ID is required" });
    }

    const query = await db.query(
      `SELECT u.role, 
              COALESCE(m.mfa_enabled, true) as mfa_enabled,
              COALESCE(m.mfa_method, 'email') as mfa_method,
              m.email_verified
       FROM users u
       LEFT JOIN mfa_settings m ON u.user_id = m.user_id
       WHERE u.user_id = $1`,
      [userId]
    );

    if (query.rows.length === 0) {
      return error("User not found", 404);
    }

    const mfaRequiredRoles = ["doctor", "nurse", "receptionist", "admin"];
    const user = query.rows[0];

    return success({
      mfaRequired: mfaRequiredRoles.includes(user.role),
      mfaEnabled: user.mfa_enabled,
      preferredMethod: user.mfa_method,
      emailVerified: user.email_verified,
    });
  } catch (err) {
    console.error("❌ Get MFA status error:", err);
    return error("Failed to get MFA status", 500, err.message);
  }
};

module.exports = {
  initMFA,
  verifyMFA,
  getMFAStatus,
};
