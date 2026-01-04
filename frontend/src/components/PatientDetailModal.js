// src/components/PatientDetailModal.js - FIXED VERSION
import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../aws-config";
import UpdatePatientForm from "./UpdatePatientForm";

function PatientDetailModal({ patientId, onClose }) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    getUserRole();
    fetchPatientDetails();
  }, [patientId]);

  const getUserRole = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserRole(user.role || null);
      }
    } catch (err) {
      console.error("Error getting user role:", err);
    }
  };

  const canViewSensitiveData = () => {
    const allowedRoles = ["admin", "doctor", "nurse", "receptionist"];
    return userRole && allowedRoles.includes(userRole.toLowerCase());
  };

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("idToken");

      console.log("🔍 Fetching patient details:", {
        patientId,
        token: token ? "exists" : "missing",
        apiUrl: `${API_BASE_URL}/patients/${patientId}`,
      });

      const response = await axios.get(
        `${API_BASE_URL}/patients/${patientId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("📦 API Response:", response.data);

      if (response.data.success) {
        const patientData = response.data.data;
        console.log("✅ Patient data received:", {
          patient_id: patientData.patient_id,
          full_name: patientData.full_name,
          national_id: patientData.national_id ? "✅ Present" : "❌ Missing",
          insurance_number: patientData.insurance_number
            ? "✅ Present"
            : "❌ Missing",
        });
        setPatient(patientData);
      } else {
        setError("Failed to load patient details");
      }
    } catch (err) {
      console.error("❌ Error fetching patient details:", err);
      setError(err.response?.data?.message || "Failed to load patient details");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSuccess = () => {
    setIsEditing(false);
    fetchPatientDetails();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg sticky top-0">
          <h2 className="text-xl font-bold">
            {isEditing ? "Edit Patient" : "Patient Details"}
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading patient details...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : patient ? (
            <>
              {isEditing ? (
                <UpdatePatientForm
                  patient={patient}
                  onSuccess={handleUpdateSuccess}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-500">
                          Patient ID
                        </label>
                        <p className="font-medium text-gray-900">
                          {patient.patient_id}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">
                          Full Name
                        </label>
                        <p className="font-medium text-gray-900">
                          {patient.full_name}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">
                          Date of Birth
                        </label>
                        <p className="font-medium text-gray-900">
                          {patient.date_of_birth
                            ? new Date(
                                patient.date_of_birth
                              ).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Gender</label>
                        <p className="font-medium text-gray-900 capitalize">
                          {patient.gender || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-500">
                          Phone Number
                        </label>
                        <p className="font-medium text-gray-900">
                          {patient.phone || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Email</label>
                        <p className="font-medium text-gray-900">
                          {patient.email || "N/A"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm text-gray-500">Address</label>
                        <p className="font-medium text-gray-900">
                          {patient.address || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">City</label>
                        <p className="font-medium text-gray-900">
                          {patient.city || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ✅ THÊM MỚI: Thông tin định danh */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                      Thông tin định danh
                      {canViewSensitiveData() && (
                        <span className="text-xs text-green-600 ml-2 bg-green-50 px-2 py-1 rounded">
                          ✓ Dữ liệu đã giải mã
                        </span>
                      )}
                    </h3>

                    {canViewSensitiveData() ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <label className="text-sm text-blue-600 font-semibold block mb-2">
                            🆔 Số CCCD/CMND
                          </label>
                          <p className="font-mono text-lg font-bold text-gray-900">
                            {patient.national_id || (
                              <span className="text-gray-400 text-base font-normal">
                                Chưa có thông tin
                              </span>
                            )}
                          </p>
                          {patient.national_id && (
                            <p className="text-xs text-blue-500 mt-2">
                              ✓ Dữ liệu gốc đã được giải mã từ database
                            </p>
                          )}
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <label className="text-sm text-green-600 font-semibold block mb-2">
                            🏥 Số Bảo hiểm Y tế
                          </label>
                          <p className="font-mono text-lg font-bold text-gray-900">
                            {patient.insurance_number || (
                              <span className="text-gray-400 text-base font-normal">
                                Chưa có thông tin
                              </span>
                            )}
                          </p>
                          {patient.insurance_number && (
                            <p className="text-xs text-green-500 mt-2">
                              ✓ Dữ liệu gốc đã được giải mã từ database
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                          🔒 Bạn không có quyền xem thông tin nhạy cảm (CCCD và
                          BHYT).
                          <br />
                          Chỉ Admin, Doctor, Nurse và Receptionist mới có quyền
                          này.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Cognito Username */}
                  {patient.cognito_username && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <label className="text-sm text-gray-600 font-semibold block mb-1">
                        Tài khoản đăng nhập
                      </label>
                      <p className="font-mono text-gray-900">
                        {patient.cognito_username}
                      </p>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                      Record Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-500">
                          Created At
                        </label>
                        <p className="font-medium text-gray-900">
                          {patient.created_at
                            ? new Date(patient.created_at).toLocaleString()
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">
                          Last Updated
                        </label>
                        <p className="font-medium text-gray-900">
                          {patient.updated_at
                            ? new Date(patient.updated_at).toLocaleString()
                            : "N/A"}
                        </p>
                      </div>
                      {patient.created_by_username && (
                        <div className="col-span-2">
                          <label className="text-sm text-gray-500">
                            Created By
                          </label>
                          <p className="font-medium text-gray-900">
                            {patient.created_by_username}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between rounded-b-lg sticky bottom-0">
          {!isEditing && patient && userRole === "receptionist" && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Edit Patient
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium ml-auto transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PatientDetailModal;
