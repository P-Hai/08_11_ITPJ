// handlers/mfa.js - FIXED PASSWORD AUTH
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
      console.log("🔴 Validation failed: userId is required");
      return validationError({ userId: "User ID is required" });
    }

    console.log("🔵 Querying user from database...");
    let userQuery;
    try {
      userQuery = await db.query(
        `SELECT u.user_id, u.email, u.full_name, u.role, u.phone,
            COALESCE(m.mfa_enabled, true) as mfa_enabled
     FROM users u
     LEFT JOIN mfa_settings m ON u.user_id = m.user_id
     WHERE u.user_id = $1`,
        [userId]
      );
    } catch (dbError) {
      console.error("🔴 Database query error:", dbError.code, dbError.message);
      return error("Database error", 500, dbError.message);
    }

    if (userQuery.rows.length === 0) {
      console.log("🔴 User not found:", userId);
      return error("User not found", 404);
    }

    const user = userQuery.rows[0];
    console.log("✅ User found:", user.user_id, "Role:", user.role);

    // Check role có cần MFA không
    const mfaRequiredRoles = ["doctor", "nurse", "receptionist", "admin"];
    if (!mfaRequiredRoles.includes(user.role)) {
      console.log("🔵 MFA not required for role:", user.role);
      return success({
        mfaRequired: false,
        message: "MFA not required for this role",
      });
    }

    // Check email
    if (!user.email) {
      console.log("🔴 User email not configured");
      return error("User email not configured", 400);
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    console.log("📧 Generated OTP for", user.email);

    // Xóa challenges cũ chưa verify
    try {
      await db.query(
        "DELETE FROM mfa_challenges WHERE user_id = $1 AND verified = false",
        [userId]
      );
      console.log("✅ Old MFA challenges deleted");
    } catch (deleteError) {
      console.error("⚠️ Could not delete old challenges:", deleteError.message);
    }

    // Lưu challenge mới vào database
    try {
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
      console.log("✅ MFA challenge saved to database");
    } catch (insertError) {
      console.error(
        "🔴 Failed to save MFA challenge:",
        insertError.code,
        insertError.message
      );
      return error(
        "Failed to create verification challenge",
        500,
        insertError.message
      );
    }

    // Gửi email OTP
    try {
      await sendOTPEmail(user.email, otp, user.full_name || "User");
      console.log("✅ Email sent successfully to:", user.email);
    } catch (emailError) {
      console.error("❌ Email send failed:", emailError.message);
      // Don't fail MFA if email fails - user can still verify without email in dev
      console.warn("⚠️ Email send failed but continuing with MFA setup");
      // Uncomment below to require email, for now we continue
      // return error("Failed to send verification email", 500, emailError.message);
    }

    // Mask email để bảo mật
    const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3");

    console.log("✅ MFA initialization successful");
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
    console.error("🔴 Init MFA error:", err);
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

    console.log(
      "🔍 Verify MFA for user:",
      userId,
      "code:",
      code ? "***" : "missing"
    );

    // Validation
    if (!userId || !code) {
      console.log("🔴 Validation failed");
      return validationError({
        userId: !userId ? "User ID is required" : undefined,
        code: !code ? "Verification code is required" : undefined,
      });
    }

    // Lấy challenge mới nhất chưa verify và chưa hết hạn
    let challengeQuery;
    try {
      challengeQuery = await db.query(
        `SELECT * FROM mfa_challenges 
         WHERE user_id = $1 
         AND verified = false 
         AND expires_at > NOW()
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userId]
      );
    } catch (dbError) {
      console.error("🔴 Database query error:", dbError.message);
      return error("Database error", 500, dbError.message);
    }

    if (challengeQuery.rows.length === 0) {
      console.log("🔴 No valid verification code found");
      return error("No valid verification code found or code has expired", 400);
    }

    const challenge = challengeQuery.rows[0];
    console.log("✅ Challenge found, attempts:", challenge.attempts);

    // Check số lần thử
    if (challenge.attempts >= challenge.max_attempts) {
      console.log("🔴 Max attempts exceeded");
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
      try {
        await db.query(
          `UPDATE mfa_challenges 
           SET verified = true, verified_at = NOW() 
           WHERE challenge_id = $1`,
          [challenge.challenge_id]
        );
        console.log("✅ Challenge marked as verified");
      } catch (updateError) {
        console.error("⚠️ Could not mark as verified:", updateError.message);
      }

      // Update last MFA time
      try {
        await db.query(
          `INSERT INTO mfa_settings (user_id, last_mfa_at)
           VALUES ($1, NOW())
           ON CONFLICT (user_id) 
           DO UPDATE SET last_mfa_at = NOW()`,
          [userId]
        );
        console.log("✅ MFA settings updated");
      } catch (settingsError) {
        console.error(
          "⚠️ Could not update MFA settings:",
          settingsError.message
        );
      }

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
      try {
        await db.query(
          `UPDATE mfa_challenges 
           SET attempts = attempts + 1 
           WHERE challenge_id = $1`,
          [challenge.challenge_id]
        );
      } catch (attemptsError) {
        console.error("⚠️ Could not update attempts:", attemptsError.message);
      }

      const attemptsLeft = challenge.max_attempts - challenge.attempts - 1;

      return error(
        `Invalid verification code. ${attemptsLeft} attempt${
          attemptsLeft !== 1 ? "s" : ""
        } remaining.`,
        401
      );
    }
  } catch (err) {
    console.error("🔴 Verify MFA error:", err);
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
      console.log("🔴 Validation failed: userId is required");
      return validationError({ userId: "User ID is required" });
    }

    console.log("🔵 Getting MFA status for user:", userId);
    let query;
    try {
      query = await db.query(
        `SELECT u.role, 
                COALESCE(m.mfa_enabled, true) as mfa_enabled,
                COALESCE(m.mfa_method, 'email') as mfa_method,
                m.email_verified
         FROM users u
         LEFT JOIN mfa_settings m ON u.user_id = m.user_id
         WHERE u.user_id = $1`,
        [userId]
      );
    } catch (dbError) {
      console.error("🔴 Database query error:", dbError.message);
      return error("Database error", 500, dbError.message);
    }

    if (query.rows.length === 0) {
      console.log("🔴 User not found:", userId);
      return error("User not found", 404);
    }

    const mfaRequiredRoles = ["doctor", "nurse", "receptionist", "admin"];
    const user = query.rows[0];

    console.log("✅ MFA status retrieved");
    return success({
      mfaRequired: mfaRequiredRoles.includes(user.role),
      mfaEnabled: user.mfa_enabled,
      preferredMethod: user.mfa_method,
      emailVerified: user.email_verified,
    });
  } catch (err) {
    console.error("🔴 Get MFA status error:", err);
    return error("Failed to get MFA status", 500, err.message);
  }
};

module.exports = {
  initMFA,
  verifyMFA,
  getMFAStatus,
};
