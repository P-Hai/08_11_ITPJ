// src/components/CreatePatientForm.js - COMPLETE VERSION
import React, { useState } from "react";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

function CreatePatientForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    email: "", // ✅ BẮT BUỘC
    address: "",
    city: "",
    nationalId: "",
    insuranceNumber: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (
      !formData.fullName ||
      !formData.dateOfBirth ||
      !formData.gender ||
      !formData.email
    ) {
      setError(
        "Please fill in all required fields (Full Name, Date of Birth, Gender, Email)"
      );
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("idToken");

      const response = await axios.post(
        `${API_BASE_URL}/patients`,
        {
          full_name: formData.fullName,
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender,
          phone: formData.phone || null,
          email: formData.email,
          address: formData.address || null,
          city: formData.city || null,
          national_id: formData.nationalId || null,
          insurance_number: formData.insuranceNumber || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        // ✅ Store credentials to display
        setCreatedCredentials(response.data.data.credentials);

        // Don't close form immediately - show credentials first
      }
    } catch (err) {
      console.error("Error creating patient:", err);

      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).join(
          ", "
        );
        setError(errorMessages);
      } else {
        setError("Failed to create patient. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    setCreatedCredentials(null);
    setFormData({
      fullName: "",
      dateOfBirth: "",
      gender: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      nationalId: "",
      insuranceNumber: "",
    });
    onSuccess(); // Close form and refresh list
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">➕ Create New Patient</h2>
            <button
              onClick={onCancel}
              className="text-white hover:text-gray-200 text-2xl font-bold"
              disabled={loading}
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* ✅ SUCCESS MESSAGE WITH CREDENTIALS */}
          {createdCredentials && (
            <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-6 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="w-6 h-6 text-green-500 mt-1 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-green-800 mb-2">
                    ✅ Patient Created Successfully!
                  </h4>
                  <p className="text-green-700 mb-4">
                    Login credentials have been sent to:{" "}
                    <strong className="font-mono">{formData.email}</strong>
                  </p>

                  {/* Credentials Display */}
                  <div className="bg-white border-2 border-green-300 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-3 font-semibold">
                      🔑 Patient Login Credentials:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Username:
                          </p>
                          <p className="text-lg font-mono font-bold text-purple-600">
                            {createdCredentials.username}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              createdCredentials.username
                            );
                            alert("Username copied!");
                          }}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          📋
                        </button>
                      </div>
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Temporary Password:
                          </p>
                          <p className="text-lg font-mono font-bold text-purple-600">
                            {createdCredentials.temporaryPassword}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              createdCredentials.temporaryPassword
                            );
                            alert("Password copied!");
                          }}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 rounded">
                    <div className="flex">
                      <span className="text-yellow-600 mr-2">⚠️</span>
                      <div>
                        <p className="text-sm text-yellow-800 font-semibold mb-1">
                          Important:
                        </p>
                        <p className="text-sm text-yellow-700">
                          {createdCredentials.note}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4 rounded">
                    <div className="flex">
                      <span className="text-blue-600 mr-2">ℹ️</span>
                      <div>
                        <p className="text-sm text-blue-800">
                          The patient can now login at{" "}
                          <strong>http://localhost:3000</strong> and will be
                          able to:
                        </p>
                        <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc">
                          <li>View their medical records</li>
                          <li>Check prescriptions</li>
                          <li>Monitor vital signs</li>
                          <li>Update contact information</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleDone}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-md"
                    >
                      Done - Close Form
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ERROR MESSAGE */}
          {error && !createdCredentials && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
              <div className="flex">
                <svg
                  className="w-5 h-5 text-red-500 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* FORM - Hide when credentials shown */}
          {!createdCredentials && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter full name"
                  required
                />
              </div>

              {/* Date of Birth & Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Email - REQUIRED */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="patient@example.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  ℹ️ Required for login credentials
                </p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="+84 xxx xxx xxx"
                />
              </div>

              {/* Address & City */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="City"
                  />
                </div>
              </div>

              {/* National ID & Insurance */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    National ID
                  </label>
                  <input
                    type="text"
                    name="nationalId"
                    value={formData.nationalId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="ID number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Insurance Number
                  </label>
                  <input
                    type="text"
                    name="insuranceNumber"
                    value={formData.insuranceNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Insurance #"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 font-semibold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
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
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    "Create Patient"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreatePatientForm;
