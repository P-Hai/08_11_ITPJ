// handlers/debug.js - DEBUG ENDPOINT để kiểm tra database state
const db = require("../config/db");
const { success, error } = require("../utils/response");

/**
 * GET /debug/users
 * Xem tất cả users trong database (chỉ dùng cho debug)
 */
const getAllUsers = async (event) => {
  try {
    console.log("[DEBUG] ===== getAllUsers called =====");
    console.log("[DEBUG] Fetching all users from database...");

    const result = await db.query(
      `SELECT user_id, cognito_sub, email, full_name, role, is_active, created_at, last_login 
       FROM users 
       ORDER BY created_at DESC`
    );

    console.log(
      `[DEBUG] ✅ Query succeeded! Found ${result.rows.length} users`
    );

    return success(
      {
        count: result.rows.length,
        users: result.rows.map((u) => ({
          user_id: u.user_id.substring(0, 8) + "...",
          cognito_sub: u.cognito_sub.substring(0, 8) + "...",
          email: u.email,
          full_name: u.full_name,
          role: u.role,
          is_active: u.is_active,
          created_at: u.created_at,
          last_login: u.last_login,
        })),
      },
      "Users fetched successfully"
    );
  } catch (err) {
    console.error("[DEBUG] Error fetching users:", err);
    return error("Failed to fetch users", 500, err.message);
  }
};

/**
 * GET /debug/user/{username}
 * Kiểm tra user cụ thể
 */
const getUserByEmail = async (event) => {
  try {
    const email =
      event.pathParameters?.email || event.queryStringParameters?.email;

    if (!email) {
      return error("Email required", 400);
    }

    console.log("[DEBUG] Looking for user with email:", email);

    const result = await db.query(
      `SELECT user_id, cognito_sub, email, full_name, role, is_active, phone, created_at, last_login 
       FROM users 
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (result.rows.length === 0) {
      return success(
        { found: false, message: `No user found with email: ${email}` },
        "User not found"
      );
    }

    const user = result.rows[0];
    return success(
      {
        found: true,
        user: {
          user_id: user.user_id,
          cognito_sub: user.cognito_sub,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          is_active: user.is_active,
          phone: user.phone,
          created_at: user.created_at,
          last_login: user.last_login,
        },
      },
      "User found"
    );
  } catch (err) {
    console.error("[DEBUG] Error fetching user:", err);
    return error("Failed to fetch user", 500, err.message);
  }
};

/**
 * GET /debug/cognito-sub/{cognito_sub}
 * Kiểm tra user bằng cognito_sub
 */
const getUserByCognitoSub = async (event) => {
  try {
    const cognito_sub = event.pathParameters?.cognito_sub;

    if (!cognito_sub) {
      return error("cognito_sub required", 400);
    }

    console.log("[DEBUG] Looking for user with cognito_sub:", cognito_sub);

    const result = await db.query(
      `SELECT user_id, cognito_sub, email, full_name, role, is_active, created_at, last_login 
       FROM users 
       WHERE cognito_sub = $1`,
      [cognito_sub]
    );

    if (result.rows.length === 0) {
      return success(
        {
          found: false,
          message: `No user found with cognito_sub: ${cognito_sub}`,
        },
        "User not found"
      );
    }

    const user = result.rows[0];
    return success(
      {
        found: true,
        user: {
          user_id: user.user_id,
          cognito_sub: user.cognito_sub,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
          last_login: user.last_login,
        },
      },
      "User found"
    );
  } catch (err) {
    console.error("[DEBUG] Error fetching user:", err);
    return error("Failed to fetch user", 500, err.message);
  }
};

/**
 * DELETE /debug/truncate-users
 * XÓA TẤT CẢ USERS (chỉ dùng test!)
 */
const truncateUsers = async (event) => {
  try {
    console.log("[DEBUG] TRUNCATING users table...");

    await db.query("DELETE FROM users");

    return success({ deleted: true }, "All users deleted");
  } catch (err) {
    console.error("[DEBUG] Error truncating:", err);
    return error("Failed to truncate", 500, err.message);
  }
};

module.exports = {
  getAllUsers,
  getUserByEmail,
  getUserByCognitoSub,
  truncateUsers,
};
