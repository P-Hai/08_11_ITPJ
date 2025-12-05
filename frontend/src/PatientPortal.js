// src/PatientPortal.js
import React from "react";

function PatientPortal() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-100">
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            My Health Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-lg text-left">
              <div className="font-semibold mb-1">View My Profile</div>
              <div className="text-sm text-indigo-100">
                Personal information
              </div>
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-left">
              <div className="font-semibold mb-1">Medical History</div>
              <div className="text-sm text-blue-100">
                Past visits and records
              </div>
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-left">
              <div className="font-semibold mb-1">Prescriptions</div>
              <div className="text-sm text-green-100">My medications</div>
            </button>
            <button className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-lg text-left">
              <div className="font-semibold mb-1">Vital Signs</div>
              <div className="text-sm text-orange-100">Health measurements</div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Recent Activity
          </h2>
          <div className="text-gray-500 text-center py-8">
            <p>No recent activity</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PatientPortal;
