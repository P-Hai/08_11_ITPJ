// src/DoctorDashboard.js
import React from "react";

function DoctorDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
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
            <h3 className="text-gray-500 text-sm font-medium">Prescriptions</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">8</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">This Month</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">127</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-left">
              <div className="font-semibold mb-1">View Patients</div>
              <div className="text-sm text-blue-100">See all patients list</div>
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-left">
              <div className="font-semibold mb-1">Create Medical Record</div>
              <div className="text-sm text-green-100">
                Add new patient record
              </div>
            </button>
            <button className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-left">
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
      </main>
    </div>
  );
}

export default DoctorDashboard;
