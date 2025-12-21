// src/PatientPortal.js
import React, { useState } from "react";
import MyMedicalRecords from "./components/MyMedicalRecords";
function PatientPortal() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [activeTab, setActiveTab] = useState("profile");

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">EHR System - Patient Portal</h1>
            <p className="text-sm text-indigo-100">Welcome, {user.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded"
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
              onClick={() => setActiveTab("profile")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "profile"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              My Profile
            </button>
            <button
              onClick={() => setActiveTab("records")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "records"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Medical Records
            </button>
            <button
              onClick={() => setActiveTab("prescriptions")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "prescriptions"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Prescriptions
            </button>
            <button
              onClick={() => setActiveTab("vitals")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "vitals"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Vital Signs
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* My Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">My Profile</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  Email
                </label>
                <p className="text-gray-900 font-medium">
                  {user.email || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  Username
                </label>
                <p className="text-gray-900 font-medium">
                  {user.username || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  Full Name
                </label>
                <p className="text-gray-900 font-medium">
                  {user.name || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  Role
                </label>
                <p className="text-gray-900 font-medium capitalize">
                  {user.role || "N/A"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Medical Records Tab */}
        {activeTab === "records" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              My Medical Records
            </h2>
            <MyMedicalRecords />
          </div>
        )}

        {/* Prescriptions Tab */}
        {activeTab === "prescriptions" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              My Prescriptions
            </h2>
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
              <p className="text-lg mb-2">No prescriptions found</p>
              <p className="text-sm">Your prescriptions will appear here</p>
            </div>
          </div>
        )}

        {/* Vital Signs Tab */}
        {activeTab === "vitals" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              My Vital Signs
            </h2>
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
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <p className="text-lg mb-2">No vital signs recorded</p>
              <p className="text-sm">
                Your vital signs measurements will appear here
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default PatientPortal;
