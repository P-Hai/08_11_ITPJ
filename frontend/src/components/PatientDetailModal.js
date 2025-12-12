// src/components/PatientDetailModal.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../aws-config";

function PatientDetailModal({ patientId, onClose }) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPatientDetails();
  }, [patientId]);

  const fetchPatientDetails = async () => {
    try {
      const token = localStorage.getItem("idToken");
      const response = await axios.get(
        `${API_BASE_URL}/patients/${patientId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setPatient(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching patient details:", err);
      setError(err.response?.data?.message || "Failed to load patient details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-xl font-bold">Patient Details</h2>
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
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Patient ID</label>
                    <p className="font-medium text-gray-900">
                      {patient.patient_id}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Full Name</label>
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
                        ? new Date(patient.date_of_birth).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Gender</label>
                    <p className="font-medium text-gray-900">
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
                      {patient.phone_number || "N/A"}
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
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">
                      Contact Name
                    </label>
                    <p className="font-medium text-gray-900">
                      {patient.emergency_contact_name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">
                      Contact Phone
                    </label>
                    <p className="font-medium text-gray-900">
                      {patient.emergency_contact_phone || "N/A"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm text-gray-500">
                      Relationship
                    </label>
                    <p className="font-medium text-gray-900">
                      {patient.emergency_contact_relationship || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  Medical Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Blood Type</label>
                    <p className="font-medium text-gray-900">
                      {patient.blood_type || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Allergies</label>
                    <p className="font-medium text-gray-900">
                      {patient.allergies || "None"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm text-gray-500">
                      Medical History
                    </label>
                    <p className="font-medium text-gray-900">
                      {patient.medical_history || "None"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Insurance Information */}
              {patient.insurance_provider && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                    Insurance Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">
                        Insurance Provider
                      </label>
                      <p className="font-medium text-gray-900">
                        {patient.insurance_provider || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">
                        Insurance Number
                      </label>
                      <p className="font-medium text-gray-900">
                        {patient.insurance_number || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  Record Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Created At</label>
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
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end rounded-b-lg">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PatientDetailModal;
