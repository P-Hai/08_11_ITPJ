// src/components/MedicalRecordsList.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../aws-config";

function MedicalRecordsList() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem("idToken");

      // Thử gọi API theo từng patient
      // Hoặc tạm thời return empty nếu chưa có API

      // CÁCH 1: Nếu có API get by patient
      // const patientId = 'some-patient-id';
      // const response = await axios.get(
      //   `${API_BASE_URL}/medical-records/patient/${patientId}`,
      //   { headers: { Authorization: `Bearer ${token}` } }
      // );

      // CÁCH 2: Tạm thời set empty (skip API call)
      console.log("Medical records API not available yet - showing empty list");
      setRecords([]);
      setLoading(false);
      return;

      // Uncomment khi có API:
      // if (response.data.success) {
      //   const recordsData = response.data.data?.records || response.data.data || [];
      //   setRecords(Array.isArray(recordsData) ? recordsData : []);
      // }
    } catch (err) {
      console.error("Error fetching records:", err);
      // Không hiển thị error, chỉ log
      console.log("API call failed, showing empty list");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading medical records...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {records.length === 0 ? (
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
            Click "Create New Record" to add a medical record
          </p>
        </div>
      ) : (
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
                      Patient: {record.patient_name || record.patient_id}
                    </h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      {new Date(
                        record.visit_date || record.created_at
                      ).toLocaleDateString()}
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
                      <p className="text-xs text-gray-500">Diagnosis</p>
                      <p className="text-sm text-gray-700">
                        {record.diagnosis?.substring(0, 100)}
                        {record.diagnosis?.length > 100 ? "..." : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      Doctor: {record.doctor_name || record.doctor_id}
                    </span>
                    <span>•</span>
                    <span>
                      Record ID: {record.record_id?.substring(0, 8)}...
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRecord(record);
                  }}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  View Details →
                </button>
              </div>
            </div>
          ))}

          <div className="text-sm text-gray-600 mt-4">
            Showing {records.length} medical record(s)
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg sticky top-0">
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
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  Visit Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Record ID</label>
                    <p className="font-medium text-gray-900">
                      {selectedRecord.record_id}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Visit Date</label>
                    <p className="font-medium text-gray-900">
                      {new Date(
                        selectedRecord.visit_date || selectedRecord.created_at
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Patient ID</label>
                    <p className="font-medium text-gray-900">
                      {selectedRecord.patient_id}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Doctor</label>
                    <p className="font-medium text-gray-900">
                      {selectedRecord.doctor_name || selectedRecord.doctor_id}
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

              {/* Present Illness */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  History of Present Illness
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedRecord.present_illness}
                </p>
              </div>

              {/* Physical Examination */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  Physical Examination
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedRecord.physical_examination}
                </p>
              </div>

              {/* Diagnosis */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  Diagnosis
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedRecord.diagnosis}
                </p>
              </div>

              {/* Treatment Plan */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  Treatment Plan
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedRecord.treatment_plan}
                </p>
              </div>

              {/* Notes */}
              {selectedRecord.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                    Additional Notes
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedRecord.notes}
                  </p>
                </div>
              )}
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

export default MedicalRecordsList;
