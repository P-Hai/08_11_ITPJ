// src/components/MyMedicalRecords.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../aws-config";

function MyMedicalRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetchMyRecords();
  }, []);

  const fetchMyRecords = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("idToken");

      const response = await axios.get(`${API_BASE_URL}/medical-records/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        const recordsData = response.data.data?.records || [];
        setRecords(Array.isArray(recordsData) ? recordsData : []);
      }
    } catch (err) {
      console.error("Error fetching medical records:", err);
      setError(err.response?.data?.message || "Failed to load medical records");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-2 text-gray-600">Loading your medical records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <svg
          className="w-16 h-16 mx-auto mb-4 text-gray-300"
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
        <p className="text-gray-500 text-lg">No medical records found</p>
        <p className="text-gray-400 text-sm mt-2">
          Your medical records will appear here after your visits
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {records.map((record) => (
          <div
            key={record.record_id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition cursor-pointer"
            onClick={() => setSelectedRecord(record)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Visit on {new Date(record.visit_date).toLocaleDateString()}
                  </h3>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                    {record.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Chief Complaint</p>
                    <p className="text-sm text-gray-700">
                      {record.chief_complaint}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Doctor</p>
                    <p className="text-sm text-gray-700">
                      {record.doctor_name}
                    </p>
                  </div>
                </div>

                {record.treatment_plan && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500">Treatment Plan</p>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {record.treatment_plan}
                    </p>
                  </div>
                )}
              </div>

              <button className="text-indigo-600 hover:text-indigo-800 font-medium text-sm ml-4">
                View Details →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg sticky top-0">
              <h2 className="text-xl font-bold">Medical Record Details</h2>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-white hover:text-gray-200"
              >
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
            <div className="p-6 space-y-6">
              {/* Visit Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  Visit Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Visit Date</label>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedRecord.visit_date).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Doctor</label>
                    <p className="font-medium text-gray-900">
                      {selectedRecord.doctor_name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chief Complaint */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  Chief Complaint
                </h3>
                <p className="text-gray-700">
                  {selectedRecord.chief_complaint}
                </p>
              </div>

              {/* Treatment Plan */}
              {selectedRecord.treatment_plan && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                    Treatment Plan
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedRecord.treatment_plan}
                  </p>
                </div>
              )}

              {/* Note about diagnosis */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Detailed diagnosis information is only
                  available to your healthcare providers. Please consult with
                  your doctor for complete medical information.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end rounded-b-lg sticky bottom-0">
              <button
                onClick={() => setSelectedRecord(null)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyMedicalRecords;
