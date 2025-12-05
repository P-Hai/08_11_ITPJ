// src/ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles }) {
  // Lấy thông tin user từ localStorage
  const userStr = localStorage.getItem("user");
  const token = localStorage.getItem("idToken");

  // Nếu chưa login → redirect về trang login
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);

  // Nếu role không được phép → redirect về trang không có quyền
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500">
            Your role: <strong>{user.role}</strong>
          </p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Nếu OK → hiển thị component
  return children;
}

export default ProtectedRoute;
