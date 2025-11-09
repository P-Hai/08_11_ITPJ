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
  // Admin, Doctor, Nurse can access all patients
  if (["admin", "doctor", "nurse"].includes(user.role)) {
    return true;
  }

  // Receptionist can access administrative data
  if (user.role === "receptionist") {
    return true;
  }

  // Patient can only access their own data
  if (user.role === "patient") {
    // Check if patientId matches user's patient_id
    // (This requires linking Cognito sub to patient_id in DB)
    return user.sub === patientId || user.employeeId === patientId;
  }

  return false;
};

// Check if user can modify medical records
const canModifyMedicalRecord = (user) => {
  return ["doctor", "admin"].includes(user.role);
};

// Check if user can modify vital signs
const canModifyVitalSigns = (user) => {
  return ["nurse", "doctor", "admin"].includes(user.role);
};

// Check if user can view medical data
const canViewMedicalData = (user) => {
  return ["doctor", "nurse", "admin"].includes(user.role);
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
};
