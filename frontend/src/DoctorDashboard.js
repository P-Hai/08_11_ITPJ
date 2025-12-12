// Updated DoctorDashboard.js (with corrected Prescriptions Tab)
import React, { useState } from "react";
import PatientsList from "./components/PatientsList";
import CreateMedicalRecordForm from "./components/CreateMedicalRecordForm";
import MedicalRecordsList from "./components/MedicalRecordsList";
import CreatePrescriptionForm from "./components/CreatePrescriptionForm";

function DoctorDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreateRecord, setShowCreateRecord] = useState(false);
  const [refreshRecords, setRefreshRecords] = useState(0);
  const [showCreatePrescription, setShowCreatePrescription] = useState(false);

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
            <h1 className="text-2xl font-bold">
              EHR System - Doctor Dashboard
            </h1>
            <p className="text-sm text-blue-100">Welcome, {user.name}</p>
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
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("patients")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "patients"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Patients
            </button>
            <button
              onClick={() => setActiveTab("records")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "records"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Medical Records
            </button>
            <button
              onClick={() => setActiveTab("prescriptions")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "prescriptions"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Prescriptions
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">
                  Today's Patients
                </h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">12</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">
                  Pending Records
                </h3>
                <p className="text-3xl font-bold text-orange-600 mt-2">5</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">
                  Prescriptions
                </h3>
                <p className="text-3xl font-bold text-green-600 mt-2">8</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">
                  This Month
                </h3>
                <p className="text-3xl font-bold text-purple-600 mt-2">127</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab("patients")}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-left"
                >
                  <div className="font-semibold mb-1">View Patients</div>
                  <div className="text-sm text-blue-100">
                    See all patients list
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("records")}
                  className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-left"
                >
                  <div className="font-semibold mb-1">
                    Create Medical Record
                  </div>
                  <div className="text-sm text-green-100">
                    Add new patient record
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("prescriptions")}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-left"
                >
                  <div className="font-semibold mb-1">Write Prescription</div>
                  <div className="text-sm text-purple-100">
                    Create new prescription
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Recent Activity
              </h2>
              <div className="text-gray-500 text-center py-8">
                <p>No recent activity to display</p>
                <p className="text-sm mt-2">
                  Patient records and prescriptions will appear here
                </p>
              </div>
            </div>
          </>
        )}

        {/* Patients Tab */}
        {activeTab === "patients" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Patients List
            </h2>
            <PatientsList />
          </div>
        )}

        {/* Medical Records Tab */}
        {activeTab === "records" && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                Medical Records
              </h2>
              {!showCreateRecord && (
                <button
                  onClick={() => setShowCreateRecord(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
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

        {/* Prescriptions Tab */}
        {activeTab === "prescriptions" && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Prescriptions</h2>
              {!showCreatePrescription && (
                <button
                  onClick={() => setShowCreatePrescription(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium"
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
              <div className="text-center py-12 text-gray-500">
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
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
                <p className="text-lg mb-2">No prescriptions yet</p>
                <p className="text-sm">
                  Click \"Create New Prescription\" to write a prescription
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default DoctorDashboard;
