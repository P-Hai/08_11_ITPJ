// src/ReceptionistDashboard.js
import React, { useState } from "react";
import PatientsList from "./components/PatientsList";
import CreatePatientForm from "./components/CreatePatientForm";

function ReceptionistDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [refreshPatients, setRefreshPatients] = useState(0);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-green-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              EHR System - Receptionist Dashboard
            </h1>
            <p className="text-sm text-green-100">Welcome, {user.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-green-700 hover:bg-green-800 px-4 py-2 rounded"
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
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("patients")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "patients"
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Patients
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">
                  Total Patients
                </h3>
                <p className="text-3xl font-bold text-green-600 mt-2">-</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">New Today</h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">-</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">
                  Appointments
                </h3>
                <p className="text-3xl font-bold text-orange-600 mt-2">-</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab("patients")}
                  className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-left"
                >
                  <div className="font-semibold mb-1">Register New Patient</div>
                  <div className="text-sm text-green-100">
                    Add patient information
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("patients")}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-left"
                >
                  <div className="font-semibold mb-1">Search Patient</div>
                  <div className="text-sm text-blue-100">
                    Find patient records
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Recent Registrations
              </h2>
              <div className="text-gray-500 text-center py-8">
                <p>No recent registrations</p>
              </div>
            </div>
          </>
        )}

        {/* Patients Tab */}
        {activeTab === "patients" && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                Patient Management
              </h2>
              {!showCreatePatient && (
                <button
                  onClick={() => setShowCreatePatient(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  + Register New Patient
                </button>
              )}
            </div>

            {showCreatePatient ? (
              <CreatePatientForm
                onSuccess={() => {
                  setShowCreatePatient(false);
                  setRefreshPatients((prev) => prev + 1);
                  alert("Patient registered successfully!");
                }}
                onCancel={() => setShowCreatePatient(false)}
              />
            ) : (
              <PatientsList key={refreshPatients} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default ReceptionistDashboard;
