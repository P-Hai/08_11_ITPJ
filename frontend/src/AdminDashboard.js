// src/AdminDashboard.js
import React, { useState } from "react";
import UserManagement from "./components/UserManagement";
import AuditLogs from "./components/AuditLogs";
import BiometricSetup from "./components/BiometricSetup";

function AdminDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [activeTab, setActiveTab] = useState("overview");

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
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

      {/* Navigation Tabs */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            {["overview", "users", "biometric", "audit"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab === "overview" && "Overview"}
                {tab === "users" && "User Management"}
                {tab === "biometric" && "🔐 Biometric Setup"}
                {tab === "audit" && "Audit Logs"}
              </button>
            ))}
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
                  Total Users
                </h3>
                <p className="text-3xl font-bold text-purple-600 mt-2">45</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">
                  Active Sessions
                </h3>
                <p className="text-3xl font-bold text-green-600 mt-2">12</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">
                  Audit Logs
                </h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">1,234</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">
                  System Status
                </h3>
                <p className="text-xl font-bold text-green-600 mt-2">Healthy</p>
              </div>
            </div>
          </>
        )}

        {/* User Management */}
        {activeTab === "users" && (
          <div className="bg-white rounded-lg shadow p-6">
            <UserManagement />
          </div>
        )}

        {/* Biometric Setup */}
        {activeTab === "biometric" && (
          <div className="bg-white rounded-lg shadow p-6">
            <BiometricSetup />
          </div>
        )}

        {/* Audit Logs */}
        {activeTab === "audit" && (
          <div className="bg-white rounded-lg shadow p-6">
            <AuditLogs />
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
