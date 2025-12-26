// src/components/VitalSignsList.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../aws-config";

function VitalSignsList() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [vitalSigns, setVitalSigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      fetchVitalSigns(selectedPatient);
    }
  }, [selectedPatient]);

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem("idToken");
      const response = await axios.get(`${API_BASE_URL}/patients/search`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setPatients(response.data.data.patients || []);
      }
    } catch (err) {
      console.error("Error fetching patients:", err);
    }
  };

  const fetchVitalSigns = async (patientId) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("idToken");
      const response = await axios.get(
        `${API_BASE_URL}/vital-signs/patient/${patientId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setVitalSigns(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching vital signs:", err);
      setError("Failed to load vital signs");
      setVitalSigns([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getBloodPressureStatus = (systolic, diastolic) => {
    if (!systolic || !diastolic) return { status: "N/A", color: "gray" };

    if (systolic < 120 && diastolic < 80) {
      return { status: "Normal", color: "green" };
    } else if (systolic < 130 && diastolic < 80) {
      return { status: "Elevated", color: "yellow" };
    } else if (systolic < 140 || diastolic < 90) {
      return { status: "High (Stage 1)", color: "orange" };
    } else {
      return { status: "High (Stage 2)", color: "red" };
    }
  };

  const getTemperatureStatus = (temp) => {
    if (!temp) return { status: "N/A", color: "gray" };

    if (temp < 36.1) {
      return { status: "Low", color: "blue" };
    } else if (temp >= 36.1 && temp <= 37.2) {
      return { status: "Normal", color: "green" };
    } else if (temp < 38) {
      return { status: "Elevated", color: "yellow" };
    } else {
      return { status: "Fever", color: "red" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Patient Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Patient to View Vital Signs
        </label>
        <select
          value={selectedPatient}
          onChange={(e) => setSelectedPatient(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">-- Select a patient --</option>
          {patients.map((patient) => (
            <option key={patient.patient_id} value={patient.patient_id}>
              {patient.full_name} ({patient.patient_id.substring(0, 8)}...)
            </option>
          ))}
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-2 text-gray-600">Loading vital signs...</p>
        </div>
      )}

      {/* Vital Signs List */}
      {!loading && selectedPatient && vitalSigns.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
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
          <p className="text-gray-600">
            No vital signs recorded for this patient yet.
          </p>
        </div>
      )}

      {!loading && selectedPatient && vitalSigns.length > 0 && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-green-600">
                {vitalSigns.length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Latest BP</p>
              <p className="text-xl font-bold text-blue-600">
                {vitalSigns[0]?.blood_pressure_systolic || "--"}/
                {vitalSigns[0]?.blood_pressure_diastolic || "--"}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Latest Temp</p>
              <p className="text-xl font-bold text-orange-600">
                {vitalSigns[0]?.temperature || "--"}°C
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Latest HR</p>
              <p className="text-xl font-bold text-red-600">
                {vitalSigns[0]?.heart_rate || "--"} bpm
              </p>
            </div>
          </div>

          {/* Vital Signs Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Blood Pressure
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Heart Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Temperature
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      SpO2
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Other
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vitalSigns.map((vital, index) => {
                    const bpStatus = getBloodPressureStatus(
                      vital.blood_pressure_systolic,
                      vital.blood_pressure_diastolic
                    );
                    const tempStatus = getTemperatureStatus(vital.temperature);

                    return (
                      <tr
                        key={vital.vital_sign_id || index}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(vital.recorded_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div>
                            <p className="font-medium text-gray-900">
                              {vital.blood_pressure_systolic || "--"}/
                              {vital.blood_pressure_diastolic || "--"}
                            </p>
                            {bpStatus.status !== "N/A" && (
                              <span
                                className={`text-xs px-2 py-1 rounded-full bg-${bpStatus.color}-100 text-${bpStatus.color}-700`}
                              >
                                {bpStatus.status}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vital.heart_rate ? `${vital.heart_rate} bpm` : "--"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div>
                            <p className="font-medium text-gray-900">
                              {vital.temperature
                                ? `${vital.temperature}°C`
                                : "--"}
                            </p>
                            {tempStatus.status !== "N/A" && (
                              <span
                                className={`text-xs px-2 py-1 rounded-full bg-${tempStatus.color}-100 text-${tempStatus.color}-700`}
                              >
                                {tempStatus.status}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vital.oxygen_saturation
                            ? `${vital.oxygen_saturation}%`
                            : "--"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="space-y-1">
                            {vital.respiratory_rate && (
                              <p>RR: {vital.respiratory_rate}/min</p>
                            )}
                            {vital.weight && <p>Weight: {vital.weight} kg</p>}
                            {vital.height && <p>Height: {vital.height} cm</p>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                          {vital.notes || "--"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VitalSignsList;
