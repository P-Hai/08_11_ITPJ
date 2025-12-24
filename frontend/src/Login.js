// src/Login.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "./aws-config";
import ChangePasswordForm from "./components/ChangePasswordForm";
import MFAVerification from "./components/MFAVerification";
import {
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Biometric support
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [showBiometricOption, setShowBiometricOption] = useState(false);

  // Change Password Flow
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordSession, setChangePasswordSession] = useState(null);

  // MFA Flow
  const [showMFA, setShowMFA] = useState(false);
  const [mfaUserId, setMfaUserId] = useState(null);
  const [mfaUserEmail, setMfaUserEmail] = useState(null);
  const [pendingUserData, setPendingUserData] = useState(null);

  // Check biometric support on mount
  useEffect(() => {
    const checkBiometric = async () => {
      const supported = await browserSupportsWebAuthn();
      setBiometricSupported(supported);
      console.log("🔐 WebAuthn supported:", supported);
    };
    checkBiometric();
  }, []);

  // ===== PASSWORD LOGIN =====
  const handlePasswordLogin = async (e) => {
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

        // CHECK 1: Password change required
        if (data.challengeName === "NEW_PASSWORD_REQUIRED") {
          setChangePasswordSession(data.session);
          setShowChangePassword(true);
          setSuccess("Please set a new password");
          setLoading(false);
          return;
        }

        // CHECK 2: MFA required
        const mfaRequiredRoles = ["doctor", "nurse", "receptionist", "admin"];
        const userRole = data.user.role;

        if (mfaRequiredRoles.includes(userRole)) {
          setPendingUserData(data);
          setMfaUserId(data.user.userId);
          setMfaUserEmail(data.user.email);
          setShowMFA(true);
          setSuccess("Verification required");
          setLoading(false);
          return;
        }

        // No MFA - Complete login
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

  // ===== BIOMETRIC LOGIN =====
  const handleBiometricLogin = async () => {
    if (!username.trim()) {
      setError("Please enter your username first");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("🔐 Starting biometric authentication for:", username);

      // Step 1: Get authentication options from server
      const optionsResponse = await axios.post(
        `${API_BASE_URL}/webauthn/auth/start`,
        { username }
      );

      if (!optionsResponse.data.success) {
        throw new Error(optionsResponse.data.message);
      }

      const options = optionsResponse.data.data;
      console.log("✅ Got authentication options:", options);

      // Step 2: Prompt user for biometric
      setSuccess("Please use your fingerprint or face...");

      const authResponse = await startAuthentication(options);
      console.log("✅ Got biometric response:", authResponse);

      // Step 3: Verify with server
      const verifyResponse = await axios.post(
        `${API_BASE_URL}/webauthn/auth/finish`,
        {
          ...authResponse,
          userId: options.userId,
        }
      );

      if (!verifyResponse.data.success) {
        throw new Error(verifyResponse.data.message);
      }

      const data = verifyResponse.data.data;
      console.log("✅ Biometric verification successful:", data);

      // ✅ WEBAUTHN LOGIN - NO MFA REQUIRED!
      setSuccess("Biometric authentication successful! Logging in...");

      // Store tokens if available
      if (data.idToken) {
        localStorage.setItem("idToken", data.idToken);
        localStorage.setItem("accessToken", data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
        }
      }

      // Store user info
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect by role
      setTimeout(() => {
        redirectByRole(data.user.role);
      }, 1000);
    } catch (err) {
      console.error("❌ Biometric login error:", err);

      if (err.name === "NotAllowedError") {
        setError("Biometric authentication cancelled");
      } else if (err.message?.includes("No biometric credentials")) {
        setError(
          "No biometric credentials found. Please register your fingerprint first."
        );
      } else if (err.message?.includes("User not found")) {
        setError("User not found. Please check your username.");
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Biometric authentication failed"
        );
      }
      setLoading(false);
    }
  };

  const handleMFASuccess = () => {
    console.log("✅ MFA verified successfully");
    if (pendingUserData) {
      completeLogin(pendingUserData);
    }
  };

  const completeLogin = (data) => {
    setSuccess("Login successful!");
    console.log("👤 User data:", data);

    localStorage.setItem("idToken", data.idToken);
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("user", JSON.stringify(data.user));

    setTimeout(() => {
      redirectByRole(data.user.role);
    }, 1500);
  };

  const redirectByRole = (role) => {
    switch (role) {
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
        alert(`Welcome! No dashboard for role: ${role}`);
    }
  };

  const handlePasswordChangeSuccess = (user) => {
    setSuccess("Password changed successfully!");

    const mfaRequiredRoles = ["doctor", "nurse", "receptionist", "admin"];

    if (mfaRequiredRoles.includes(user.role)) {
      setPendingUserData({ user });
      setMfaUserId(user.userId);
      setMfaUserEmail(user.email);
      setShowChangePassword(false);
      setShowMFA(true);
      return;
    }

    setTimeout(() => {
      redirectByRole(user.role);
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
        <form onSubmit={handlePasswordLogin} className="space-y-6">
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

          {/* Show password field or biometric option */}
          {!showBiometricOption ? (
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
          ) : null}

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

          {/* Submit Button - Password */}
          {!showBiometricOption && (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-3"
                    viewBox="0 0 24 24"
                  >
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
                "Login with Password"
              )}
            </button>
          )}

          {/* Biometric Login Button */}
          {biometricSupported && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={loading || !username.trim()}
                className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
                  />
                </svg>
                {loading ? "Authenticating..." : "Login with Biometric"}
              </button>

              {!username.trim() && (
                <p className="text-xs text-gray-500 text-center">
                  Enter your username first to use biometric login
                </p>
              )}
            </>
          )}
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

        {/* Biometric Status */}
        {biometricSupported && (
          <div className="mt-4 text-center">
            <p className="text-xs text-green-600 flex items-center justify-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Biometric authentication available on this device
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
