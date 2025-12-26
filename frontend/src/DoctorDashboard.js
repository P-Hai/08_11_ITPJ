import React, { useState } from "react";
import PatientsList from "./components/PatientsList";
import CreateMedicalRecordForm from "./components/CreateMedicalRecordForm";
import MedicalRecordsList from "./components/MedicalRecordsList";
import CreatePrescriptionForm from "./components/CreatePrescriptionForm";
import BiometricSetup from "./components/BiometricSetup"; // ⭐ NEW IMPORT

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
            {[
              ["overview", "Overview"],
              ["patients", "Patients"],
              ["records", "Medical Records"],
              ["prescriptions", "Prescriptions"],
              ["biometric", "🔐 Biometric Setup"], // ⭐ NEW TAB
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
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

        {/* ⭐ BIOMETRIC SETUP */}
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
