// middleware/rbac.js
const { forbidden } = require("../utils/response");

// Role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
  patient: 1,
  receptionist: 2,
  nurse: 3,
  doctor: 4,
  admin: 5,
};

// Check if user has required role
const hasRole = (user, requiredRole) => {
  const userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] || 0;

  return userRoleLevel >= requiredRoleLevel;
};

// Check if user has any of the required roles
const hasAnyRole = (user, requiredRoles) => {
  return requiredRoles.some((role) => user.role === role);
};

// Middleware: Require specific role
const requireRole = (requiredRole) => {
  return (handler) => {
    return async (event) => {
      const user = event.user;

      if (!user) {
        return forbidden("User not authenticated");
      }

      if (!hasRole(user, requiredRole)) {
        return forbidden(`Access denied. Required role: ${requiredRole}`);
      }

      return handler(event);
    };
  };
};

// Middleware: Require any of specified roles
const requireAnyRole = (requiredRoles) => {
  return (handler) => {
    return async (event) => {
      const user = event.user;

      if (!user) {
        return forbidden("User not authenticated");
      }

      if (!hasAnyRole(user, requiredRoles)) {
        return forbidden(
          `Access denied. Required roles: ${requiredRoles.join(", ")}`
        );
      }

      return handler(event);
    };
  };
};

// Check if user can access patient data
const canAccessPatient = (user, patientId) => {
  // Doctor, Nurse, Receptionist can access all patients
  if (["doctor", "nurse", "receptionist"].includes(user.role)) {
    return true;
  }

  // Patient can only access their own data
  if (user.role === "patient") {
    return user.sub === patientId || user.employeeId === patientId;
  }

  // ✅ THAY ĐỔI: Admin KHÔNG được truy cập patient data trực tiếp
  return false;
};

// Check if user can modify medical records
const canModifyMedicalRecord = (user) => {
  // ✅ THAY ĐỔI: Chỉ Doctor, KHÔNG bao gồm Admin
  return user.role === "doctor";
};

// Check if user can modify vital signs
const canModifyVitalSigns = (user) => {
  // ✅ THAY ĐỔI: Nurse và Doctor, KHÔNG bao gồm Admin
  return ["nurse", "doctor"].includes(user.role);
};

// Check if user can view medical data
const canViewMedicalData = (user) => {
  // ✅ THAY ĐỔI: Doctor và Nurse, KHÔNG bao gồm Admin
  return ["doctor", "nurse"].includes(user.role);
};

// ✅ MỚI: Check if user can view full diagnosis
const canViewFullDiagnosis = (user) => {
  // Chỉ Doctor mới xem được chẩn đoán đầy đủ
  return user.role === "doctor";
};

// ✅ MỚI: Check if user can view diagnosis summary
const canViewDiagnosisSummary = (user) => {
  // Doctor xem full, Nurse xem summary
  return ["doctor", "nurse"].includes(user.role);
};

// ✅ MỚI: Check if user can view sensitive ID (CCCD/BHYT)
const canViewSensitiveID = (user) => {
  // Doctor, Nurse, Receptionist đều xem được
  return ["doctor", "nurse", "receptionist"].includes(user.role);
};

module.exports = {
  hasRole,
  hasAnyRole,
  requireRole,
  requireAnyRole,
  canAccessPatient,
  canModifyMedicalRecord,
  canModifyVitalSigns,
  canViewMedicalData,
  canViewFullDiagnosis,
  canViewDiagnosisSummary,
  canViewSensitiveID,
};
