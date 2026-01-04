// src/DoctorDashboard.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PatientsList from "./components/PatientsList";
import CreateMedicalRecordForm from "./components/CreateMedicalRecordForm";
import MedicalRecordsList from "./components/MedicalRecordsList";
import CreatePrescriptionForm from "./components/CreatePrescriptionForm";
import BiometricSetup from "./components/BiometricSetup";
import VitalSignsForm from "./components/VitalSignsForm";
import VitalSignsList from "./components/VitalSignsList";
import PatientFiles from "./components/PatientFiles";

function DoctorDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patients, setPatients] = useState([]);
  const [showCreateRecord, setShowCreateRecord] = useState(false);
  const [refreshRecords, setRefreshRecords] = useState(0);
  const [showCreatePrescription, setShowCreatePrescription] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const navigate = useNavigate();

  const API_URL =
    process.env.REACT_APP_API_URL ||
    "https://0lxxigdzgk.execute-api.ap-southeast-1.amazonaws.com";

  // ✅ Check user authentication
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/");
    }
  }, [navigate]);

  // ✅ Fetch patients when tab changes to patientFiles
  useEffect(() => {
    if (activeTab === "patientFiles") {
      fetchPatients();
    }
  }, [activeTab]);

  // ✅ FINAL FIXED - Fetch patients function (CLEANED)
  const fetchPatients = async () => {
    setLoadingPatients(true);
    try {
      console.log("🔍 Fetching patients from:", `${API_URL}/patients/search`);
      const token = localStorage.getItem("idToken");

      if (!token) {
        console.error("❌ No token found");
        setPatients([]);
        setLoadingPatients(false);
        return;
      }

      const response = await fetch(`${API_URL}/patients/search`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error("❌ Failed to fetch patients:", response.status);
        setPatients([]);
        setLoadingPatients(false);
        return;
      }

      const data = await response.json();
      console.log("📦 API Response:", data);

      // ✅ Extract patients array based on response structure
      let patientsArray = [];

      if (data.success) {
        // Case 1: data.data is already an array
        if (Array.isArray(data.data)) {
          patientsArray = data.data;
          console.log("✅ Case 1: data.data is array");
        }
        // Case 2: data.data.patients is an array ✅ YOUR CASE
        else if (data.data && Array.isArray(data.data.patients)) {
          patientsArray = data.data.patients;
          console.log("✅ Case 2: data.data.patients is array");
        }
        // Case 3: data.data.results is an array
        else if (data.data && Array.isArray(data.data.results)) {
          patientsArray = data.data.results;
          console.log("✅ Case 3: data.data.results is array");
        }
        // Case 4: data itself is the array
        else if (Array.isArray(data)) {
          patientsArray = data;
          console.log("✅ Case 4: data is array");
        }
        // Fallback: empty array
        else {
          console.warn("⚠️ Unknown response structure, setting empty array");
          patientsArray = [];
        }

        console.log("👥 Extracted patients:", patientsArray.length, "patients");
        setPatients(patientsArray);
      } else {
        console.error("❌ API returned success: false");
        setPatients([]);
      }
    } catch (error) {
      console.error("❌ Error fetching patients:", error);
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">DOCTOR DASHBOARD</h1>
            <p className="text-sm text-blue-100">
              Xin chào, {user?.full_name || user?.name || "Doctor"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              ["overview", "Overview"],
              ["patients", "Patients"],
              ["records", "Medical Records"],
              ["prescriptions", "Prescriptions"],
              ["vitals", "Record Vital Signs"],
              ["vitals-history", "Vital Signs History"],
              ["patientFiles", "Patient Files"],
              ["biometric", "Biometric Setup"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview */}
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                ["Today's Patients", "12", "text-blue-600"],
                ["Pending Records", "5", "text-orange-600"],
                ["Prescriptions", "8", "text-green-600"],
                ["This Month", "127", "text-purple-600"],
              ].map(([title, value, color]) => (
                <div key={title} className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
                  <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Patients */}
        {activeTab === "patients" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Patients List
            </h2>
            <PatientsList />
          </div>
        )}

        {/* Medical Records */}
        {activeTab === "records" && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                Medical Records
              </h2>
              {!showCreateRecord && (
                <button
                  onClick={() => setShowCreateRecord(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
                >
                  + Create New Record
                </button>
              )}
            </div>

            {showCreateRecord ? (
              <CreateMedicalRecordForm
                onSuccess={() => {
                  setShowCreateRecord(false);
                  setRefreshRecords((prev) => prev + 1);
                  alert("Medical record created successfully!");
                }}
                onCancel={() => setShowCreateRecord(false)}
              />
            ) : (
              <MedicalRecordsList key={refreshRecords} />
            )}
          </div>
        )}

        {/* Prescriptions */}
        {activeTab === "prescriptions" && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Prescriptions</h2>
              {!showCreatePrescription && (
                <button
                  onClick={() => setShowCreatePrescription(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
                >
                  + Create New Prescription
                </button>
              )}
            </div>

            {showCreatePrescription ? (
              <CreatePrescriptionForm
                onSuccess={() => {
                  setShowCreatePrescription(false);
                  alert("Prescription created successfully!");
                }}
                onCancel={() => setShowCreatePrescription(false)}
              />
            ) : (
              <p className="text-center text-gray-500 py-12">
                No prescriptions yet
              </p>
            )}
          </div>
        )}

        {/* Record Vital Signs */}
        {activeTab === "vitals" && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="text-blue-700">
                <strong>Record Vital Signs:</strong> Record patient vital signs
                including blood pressure, heart rate, temperature, and more.
              </p>
            </div>
            <VitalSignsForm />
          </div>
        )}

        {/* Vital Signs History */}
        {activeTab === "vitals-history" && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="text-blue-700">
                <strong>Vital Signs History:</strong> View and track patient
                vital signs over time.
              </p>
            </div>
            <VitalSignsList />
          </div>
        )}

        {/* ✅ FINAL FIXED - Patient Files Tab */}
        {activeTab === "patientFiles" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Patient Files Manager
            </h2>
            <p className="text-gray-600 mb-6">
              Select a patient to view and upload their medical files (X-rays,
              CT scans, lab results, etc.)
            </p>

            {/* Loading Indicator */}
            {loadingPatients && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-700 text-center">Loading patients...</p>
              </div>
            )}

            {/* No patients warning */}
            {!loadingPatients && patients.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-700 text-center">
                  No patients available. Please check your login credentials or
                  contact support.
                </p>
              </div>
            )}

            {/* Success message */}
            {!loadingPatients && patients.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-700 text-center">
                  Found {patients.length} patient
                  {patients.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}

            {/* Patient Selection */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Patient:
              </label>
              <select
                value={selectedPatientId || ""}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                disabled={loadingPatients || patients.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingPatients
                    ? "Loading..."
                    : patients.length === 0
                    ? "No patients available"
                    : "-- Choose a patient --"}
                </option>
                {Array.isArray(patients) &&
                  patients.length > 0 &&
                  patients.map((patient) => (
                    <option key={patient.patient_id} value={patient.patient_id}>
                      {patient.full_name} - MRN: {patient.medical_record_number}
                    </option>
                  ))}
              </select>
            </div>

            {/* Show PatientFiles component when patient is selected */}
            {selectedPatientId && (
              <PatientFiles patientId={selectedPatientId} />
            )}

            {!selectedPatientId && !loadingPatients && patients.length > 0 && (
              <p className="text-center text-gray-400 italic py-12">
                Please select a patient to view their files
              </p>
            )}
          </div>
        )}

        {/* Biometric Setup */}
        {activeTab === "biometric" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Biometric Authentication Setup
            </h2>
            <BiometricSetup />
          </div>
        )}
      </main>
    </div>
  );
}

export default DoctorDashboard;
