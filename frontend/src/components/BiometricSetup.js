// src/components/BiometricSetup.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../aws-config";
import {
  startRegistration,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

function BiometricSetup() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [supported, setSupported] = useState(false);
  const [deviceName, setDeviceName] = useState("");

  useEffect(() => {
    checkSupport();
    fetchCredentials();
  }, []);

  const checkSupport = async () => {
    const isSupported = await browserSupportsWebAuthn();
    setSupported(isSupported);
  };

  const fetchCredentials = async () => {
    try {
      const token = localStorage.getItem("idToken");
      const response = await axios.get(`${API_BASE_URL}/webauthn/credentials`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setCredentials(response.data.data.credentials);
      }
    } catch (err) {
      console.error("Error fetching credentials:", err);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("idToken");

      // Step 1: Get registration options
      const optionsResponse = await axios.post(
        `${API_BASE_URL}/webauthn/register/start`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!optionsResponse.data.success) {
        throw new Error(optionsResponse.data.message);
      }

      const options = optionsResponse.data.data;
      console.log("✅ Got registration options:", options);

      // Step 2: Prompt for biometric
      setSuccess("Please use your fingerprint or face...");

      const regResponse = await startRegistration(options);
      console.log("✅ Got registration response:", regResponse);

      // Step 3: Verify with server
      const verifyResponse = await axios.post(
        `${API_BASE_URL}/webauthn/register/finish`,
        {
          ...regResponse,
          deviceName: deviceName || "Biometric Device",
          deviceType: "biometric",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (verifyResponse.data.success) {
        setSuccess("Biometric registered successfully!");
        setDeviceName("");
        fetchCredentials();
      }
    } catch (err) {
      console.error("❌ Registration error:", err);

      if (err.name === "NotAllowedError") {
        setError("Biometric registration cancelled");
      } else {
        setError(
          err.response?.data?.message || err.message || "Registration failed"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (credentialId) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this biometric credential?"
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("idToken");
      const response = await axios.delete(
        `${API_BASE_URL}/webauthn/credentials/${credentialId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setSuccess("Credential removed successfully");
        fetchCredentials();
      }
    } catch (err) {
      setError("Failed to remove credential");
    }
  };

  if (!supported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          Biometric Not Supported
        </h3>
        <p className="text-yellow-700">
          Your device or browser does not support biometric authentication.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Biometric Authentication
        </h2>
        <p className="text-gray-600 mt-1">
          Manage your fingerprint and face recognition login
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Register New Credential */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Register New Biometric
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Device Name (Optional)
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g., iPhone Fingerprint, MacBook Touch ID"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
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
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            {loading ? "Registering..." : "Register Biometric"}
          </button>
        </div>
      </div>

      {/* Registered Credentials */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Registered Biometrics
        </h3>

        {credentials.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No biometric credentials registered yet
          </p>
        ) : (
          <div className="space-y-3">
            {credentials.map((cred) => (
              <div
                key={cred.credential_id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-8 h-8 text-green-600"
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
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {cred.device_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Registered:{" "}
                      {new Date(cred.created_at).toLocaleDateString()}
                      {cred.last_used_at && (
                        <span className="ml-2">
                          • Last used:{" "}
                          {new Date(cred.last_used_at).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(cred.credential_id)}
                  className="text-red-600 hover:text-red-800 font-medium text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BiometricSetup;
