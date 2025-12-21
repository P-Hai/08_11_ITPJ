// src/components/MFAVerification.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../aws-config";

function MFAVerification({ userId, userEmail, onSuccess, onCancel }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    // Initialize MFA challenge khi component mount
    initMFAChallenge();

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError("Verification code has expired. Please request a new code.");
          return 0;
        }

        // Cho phép resend sau 1 phút
        if (prev === 240) {
          setCanResend(true);
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const initMFAChallenge = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await axios.post(`${API_BASE_URL}/mfa/init`, {
        userId: userId,
      });

      if (response.data.success) {
        setSuccess(`Verification code sent to ${response.data.data.email}`);
        console.log("✅ MFA Challenge initiated");
      }
    } catch (err) {
      console.error("❌ Init MFA error:", err);
      setError(
        err.response?.data?.message || "Failed to send verification code"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(`${API_BASE_URL}/mfa/verify`, {
        userId: userId,
        code: code.trim(),
      });

      if (response.data.success) {
        setSuccess("Verification successful! Redirecting...");
        setTimeout(() => {
          onSuccess();
        }, 1000);
      }
    } catch (err) {
      console.error("❌ Verify MFA error:", err);
      setError(err.response?.data?.message || "Invalid verification code");
      setCode(""); // Clear code để nhập lại
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setCode("");
    setError("");
    setSuccess("");
    setCountdown(300);
    setCanResend(false);
    initMFAChallenge();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
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
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Email Verification
        </h2>
        <p className="text-gray-600">
          Enter the 6-digit code sent to your email
        </p>
        {userEmail && (
          <p className="text-sm text-blue-600 mt-2 font-medium">{userEmail}</p>
        )}
      </div>

      {/* Timer */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center space-x-2">
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span
            className={`text-sm font-semibold ${
              countdown < 60 ? "text-red-600" : "text-gray-700"
            }`}
          >
            Code expires in: {formatTime(countdown)}
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleVerify} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
            Verification Code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-3xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="● ● ● ● ● ●"
            maxLength="6"
            required
            autoFocus
            disabled={loading || countdown === 0}
          />
          <p className="text-xs text-gray-500 text-center mt-2">
            Enter the 6-digit code from your email
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-start">
            <svg
              className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start">
            <svg
              className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          <button
            type="submit"
            disabled={loading || code.length !== 6 || countdown === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
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
                Verifying...
              </>
            ) : (
              "Verify Code"
            )}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || loading}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {canResend
              ? "Resend Code"
              : `Resend available in ${formatTime(
                  Math.max(0, 240 - (300 - countdown))
                )}`}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-lg border-2 border-gray-300 transition duration-200"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Help Text */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          📧 Check your email inbox and spam folder.
          <br />
          💡 The code is valid for 5 minutes.
          <br />
          🔄 You can request a new code after 1 minute.
        </p>
      </div>
    </div>
  );
}

export default MFAVerification;
