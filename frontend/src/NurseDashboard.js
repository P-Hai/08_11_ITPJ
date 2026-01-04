// src/NurseDashboard.js
import React, { useState, useEffect } from "react";
import PatientsList from "./components/PatientsList";
import MedicalRecordsList from "./components/MedicalRecordsList";
import VitalSignsForm from "./components/VitalSignsForm";
import BiometricSetup from "./components/BiometricSetup";
import VitalSignsList from "./components/VitalSignsList"; // ⭐ NEW IMPORT

function NurseDashboard() {
  const [activeTab, setActiveTab] = useState("patients");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-green-600 text-white shadow-lg">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <h1 className="text-2xl font-bold">NURSE DASHBOARD</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">
              XIN CHÀO, <strong>{user?.name || user?.email}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow-lg">
          {/* Tabs */}
          <div className="flex border-b overflow-x-auto">
            {/* Patients */}
            <button
              onClick={() => setActiveTab("patients")}
              className={`px-6 py-3 font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === "patients"
                  ? "bg-white text-green-600 border-b-2 border-green-600"
                  : "text-gray-600 hover:text-green-600 hover:bg-gray-50"
              }`}
            >
              Patients
            </button>

            {/* Records */}
            <button
              onClick={() => setActiveTab("records")}
              className={`px-6 py-3 font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === "records"
                  ? "bg-white text-green-600 border-b-2 border-green-600"
                  : "text-gray-600 hover:text-green-600 hover:bg-gray-50"
              }`}
            >
              Medical Records
            </button>

            {/* Record Vitals */}
            <button
              onClick={() => setActiveTab("vitals")}
              className={`px-6 py-3 font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === "vitals"
                  ? "bg-white text-green-600 border-b-2 border-green-600"
                  : "text-gray-600 hover:text-green-600 hover:bg-gray-50"
              }`}
            >
              Record Vital Signs
            </button>

            {/* ⭐ View History */}
            <button
              onClick={() => setActiveTab("vitals-history")}
              className={`px-6 py-3 font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === "vitals-history"
                  ? "bg-white text-green-600 border-b-2 border-green-600"
                  : "text-gray-600 hover:text-green-600 hover:bg-gray-50"
              }`}
            >
              📊 View History
            </button>

            {/* Biometric */}
            <button
              onClick={() => setActiveTab("biometric")}
              className={`px-6 py-3 font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === "biometric"
                  ? "bg-white text-green-600 border-b-2 border-green-600"
                  : "text-gray-600 hover:text-green-600 hover:bg-gray-50"
              }`}
            >
              Biometric Setup
            </button>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {activeTab === "patients" && <PatientsList />}

            {activeTab === "records" && <MedicalRecordsList />}

            {activeTab === "vitals" && <VitalSignsForm />}

            {/* ⭐ NEW CONTENT */}
            {activeTab === "vitals-history" && (
              <div className="space-y-4">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                  <p className="text-blue-700">
                    <strong>Vital Signs History:</strong> View and track patient
                    vital signs over time.
                  </p>
                </div>
                <VitalSignsList />
              </div>
            )}

            {activeTab === "biometric" && <BiometricSetup />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NurseDashboard;
