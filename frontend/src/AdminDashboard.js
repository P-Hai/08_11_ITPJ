// src/AdminDashboard.js
import React from "react";

function AdminDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">EHR System - Admin Dashboard</h1>
            <p className="text-sm text-purple-100">Welcome, {user.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-purple-700 hover:bg-purple-800 px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">Total Users</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">45</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">
              Active Sessions
            </h3>
            <p className="text-3xl font-bold text-green-600 mt-2">12</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">Audit Logs</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">1,234</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">System Status</h3>
            <p className="text-xl font-bold text-green-600 mt-2">Healthy</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Admin Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-left">
              <div className="font-semibold mb-1">Manage Users</div>
              <div className="text-sm text-purple-100">
                Create, update, disable users
              </div>
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-left">
              <div className="font-semibold mb-1">View Audit Logs</div>
              <div className="text-sm text-blue-100">
                Security and access logs
              </div>
            </button>
            <button className="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-lg text-left">
              <div className="font-semibold mb-1">System Settings</div>
              <div className="text-sm text-gray-100">Configure system</div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Recent Admin Activity
          </h2>
          <div className="text-gray-500 text-center py-8">
            <p>No recent admin activity</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
