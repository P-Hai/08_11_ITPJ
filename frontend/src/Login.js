// src/Login.js
import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "./aws-config";
import ChangePasswordForm from "./components/ChangePasswordForm";
import MFAVerification from "./components/MFAVerification";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Change Password Flow
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordSession, setChangePasswordSession] = useState(null);

  // MFA Flow
  const [showMFA, setShowMFA] = useState(false);
  const [mfaUserId, setMfaUserId] = useState(null);
  const [mfaUserEmail, setMfaUserEmail] = useState(null);
  const [pendingUserData, setPendingUserData] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password,
      });

      if (response.data.success) {
        const data = response.data.data;

        // CHECK 1: Nếu cần đổi mật khẩu
        if (data.challengeName === "NEW_PASSWORD_REQUIRED") {
          setChangePasswordSession(data.session);
          setShowChangePassword(true);
          setSuccess("Please set a new password");
          setLoading(false);
          return;
        }

        // CHECK 2: Kiểm tra xem role có cần MFA không
        const mfaRequiredRoles = ["doctor", "nurse", "receptionist", "admin"];
        const userRole = data.user.role;

        if (mfaRequiredRoles.includes(userRole)) {
          // Cần MFA
          console.log("🔐 MFA required for role:", userRole);

          // Lưu user data tạm thời
          setPendingUserData(data);

          // Lưu userId và email để gửi OTP
          setMfaUserId(data.user.userId); // user_id from database
          setMfaUserEmail(data.user.email); // email để hiển thị

          setShowMFA(true);
          setSuccess("Verification required");
          setLoading(false);
          return;
        }

        // Không cần MFA - Login thành công luôn
        completeLogin(data);
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.details ||
          "Login failed. Please try again."
      );
      setLoading(false);
    }
  };

  const handleMFASuccess = () => {
    console.log("✅ MFA verified successfully");

    // Complete login với user data đã lưu
    if (pendingUserData) {
      completeLogin(pendingUserData);
    }
  };

  const completeLogin = (data) => {
    setSuccess("Login successful!");
    console.log("👤 User data:", data);

    // Lưu token vào localStorage
    localStorage.setItem("idToken", data.idToken);
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("user", JSON.stringify(data.user));

    const userRole = data.user.role;

    setTimeout(() => {
      switch (userRole) {
        case "doctor":
          window.location.href = "/doctor";
          break;
        case "receptionist":
          window.location.href = "/receptionist";
          break;
        case "admin":
          window.location.href = "/admin";
          break;
        case "patient":
          window.location.href = "/patient";
          break;
        case "nurse":
          window.location.href = "/nurse";
          break;
        default:
          alert(
            `Welcome ${data.user.name}! No dashboard for role: ${userRole}`
          );
      }
    }, 1500);
  };

  const handlePasswordChangeSuccess = (user) => {
    setSuccess("Password changed successfully!");

    // Sau khi đổi password, check MFA
    const mfaRequiredRoles = ["doctor", "nurse", "receptionist", "admin"];

    if (mfaRequiredRoles.includes(user.role)) {
      setPendingUserData({ user });
      setMfaUserId(user.userId);
      setMfaUserEmail(user.email);
      setShowChangePassword(false);
      setShowMFA(true);
      return;
    }

    // Không cần MFA
    setTimeout(() => {
      switch (user.role) {
        case "doctor":
          window.location.href = "/doctor";
          break;
        case "receptionist":
          window.location.href = "/receptionist";
          break;
        case "admin":
          window.location.href = "/admin";
          break;
        case "patient":
          window.location.href = "/patient";
          break;
        case "nurse":
          window.location.href = "/nurse";
          break;
        default:
          alert(`Welcome! No dashboard for role: ${user.role}`);
      }
    }, 1500);
  };

  // RENDER: MFA Verification Screen
  if (showMFA) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <MFAVerification
          userId={mfaUserId}
          userEmail={mfaUserEmail}
          onSuccess={handleMFASuccess}
          onCancel={() => {
            setShowMFA(false);
            setPendingUserData(null);
            setMfaUserId(null);
            setMfaUserEmail(null);
          }}
        />
      </div>
    );
  }

  // RENDER: Change Password Screen
  if (showChangePassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center p-4">
        <ChangePasswordForm
          username={username}
          session={changePasswordSession}
          onSuccess={handlePasswordChangeSuccess}
        />
      </div>
    );
  }

  // RENDER: Login Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">EHR System</h1>
          <p className="text-gray-600">Electronic Health Records</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Logging in...
              </span>
            ) : (
              "Login"
            )}
          </button>
        </form>

        {/* Demo Accounts */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-3">
            Demo accounts:
          </p>
          <div className="space-y-2 text-sm">
            <div className="bg-gray-50 px-3 py-2 rounded">
              <span className="font-medium text-gray-700">Doctor:</span>
              <span className="text-gray-600 ml-2">doc001 / Doctor123!@#</span>
            </div>
            <div className="bg-gray-50 px-3 py-2 rounded">
              <span className="font-medium text-gray-700">Patient:</span>
              <span className="text-gray-600 ml-2">
                patient12345 / Patient123!@#
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
