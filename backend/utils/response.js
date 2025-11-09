// utils/response.js

// Success response
const success = (data, message = "Success", statusCode = 200) => {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    }),
  };
};

// Error response
const error = (message, statusCode = 500, details = null) => {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify({
      success: false,
      message,
      details,
      timestamp: new Date().toISOString(),
    }),
  };
};

// Validation error
const validationError = (errors) => {
  return error("Validation failed", 400, errors);
};

// Unauthorized error
const unauthorized = (message = "Unauthorized") => {
  return error(message, 401);
};

// Forbidden error
const forbidden = (message = "Forbidden - Insufficient permissions") => {
  return error(message, 403);
};

// Not found error
const notFound = (message = "Resource not found") => {
  return error(message, 404);
};

module.exports = {
  success,
  error,
  validationError,
  unauthorized,
  forbidden,
  notFound,
};
