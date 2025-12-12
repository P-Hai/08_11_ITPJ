// src/components/CreateMedicalRecordForm.js
import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../aws-config";

function CreateMedicalRecordForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    patientId: "",
    chiefComplaint: "",
    presentIllness: "",
    physicalExamination: "",
    diagnosis: "",
    treatmentPlan: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("idToken");
      const user = JSON.parse(localStorage.getItem("user"));

      const response = await axios.post(
        `${API_BASE_URL}/medical-records`,
        {
          patient_id: formData.patientId,
          chief_complaint: formData.chiefComplaint,
          present_illness: formData.presentIllness,
          physical_examination: formData.physicalExamination,
          diagnosis: formData.diagnosis,
          treatment_plan: formData.treatmentPlan,
          notes: formData.notes,
          doctor_id: user.employeeId || user.username,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        alert("Medical record created successfully!");
        onSuccess();
      }
    } catch (err) {
      console.error("Error creating medical record:", err);
      setError(
        err.response?.data?.message || "Failed to create medical record"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Create Medical Record
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Patient ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="patientId"
            value={formData.patientId}
            onChange={handleChange}
            required
            placeholder="Enter patient ID or UUID"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            You can copy the Patient ID from the Patients list
          </p>
        </div>

        {/* Chief Complaint */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chief Complaint <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="chiefComplaint"
            value={formData.chiefComplaint}
            onChange={handleChange}
            required
            placeholder="e.g., Headache for 3 days"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Present Illness */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            History of Present Illness <span className="text-red-500">*</span>
          </label>
          <textarea
            name="presentIllness"
            value={formData.presentIllness}
            onChange={handleChange}
            required
            rows="4"
            placeholder="Describe the patient's current illness, symptoms, duration, severity..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Physical Examination */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Physical Examination <span className="text-red-500">*</span>
          </label>
          <textarea
            name="physicalExamination"
            value={formData.physicalExamination}
            onChange={handleChange}
            required
            rows="4"
            placeholder="Record physical examination findings: vital signs, general appearance, systems review..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Diagnosis */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Diagnosis <span className="text-red-500">*</span>
          </label>
          <textarea
            name="diagnosis"
            value={formData.diagnosis}
            onChange={handleChange}
            required
            rows="3"
            placeholder="Primary diagnosis and differential diagnoses..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Treatment Plan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Treatment Plan <span className="text-red-500">*</span>
          </label>
          <textarea
            name="treatmentPlan"
            value={formData.treatmentPlan}
            onChange={handleChange}
            required
            rows="4"
            placeholder="Medications, procedures, follow-up plans, patient education..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            placeholder="Any additional observations or notes..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Creating...
              </span>
            ) : (
              "Create Medical Record"
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateMedicalRecordForm;
