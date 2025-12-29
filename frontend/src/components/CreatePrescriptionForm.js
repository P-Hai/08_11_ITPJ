// src/components/CreatePrescriptionForm.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../aws-config";

function CreatePrescriptionForm({ onSuccess, onCancel }) {
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [formData, setFormData] = useState({
    patientId: "",
    medicalRecordId: "",
    medications: [
      {
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
      },
    ],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch patients on mount
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoadingPatients(true);
      const token = localStorage.getItem("idToken");
      const response = await axios.get(`${API_BASE_URL}/patients/search`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const patientsData =
          response.data.data?.patients || response.data.data || [];
        setPatients(Array.isArray(patientsData) ? patientsData : []);
      }
    } catch (err) {
      console.error("Error fetching patients:", err);
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMedicationChange = (index, field, value) => {
    const newMedications = [...formData.medications];
    newMedications[index][field] = value;
    setFormData((prev) => ({
      ...prev,
      medications: newMedications,
    }));
  };

  const addMedication = () => {
    setFormData((prev) => ({
      ...prev,
      medications: [
        ...prev.medications,
        { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
      ],
    }));
  };

  const removeMedication = (index) => {
    if (formData.medications.length > 1) {
      const newMedications = formData.medications.filter((_, i) => i !== index);
      setFormData((prev) => ({
        ...prev,
        medications: newMedications,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("idToken");
      const user = JSON.parse(localStorage.getItem("user"));

      // Format payload
      const payload = {
        patient_id: formData.patientId,
        doctor_id: user.employeeId || user.username,
        medications: formData.medications.filter((med) => med.name.trim()),
      };

      // Only add medical_record_id if provided
      if (formData.medicalRecordId && formData.medicalRecordId.trim()) {
        payload.medical_record_id = formData.medicalRecordId;
      }

      console.log(
        "Sending prescription payload:",
        JSON.stringify(payload, null, 2)
      );

      const response = await axios.post(
        `${API_BASE_URL}/prescriptions`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Response:", response.data);

      if (response.data.success) {
        alert("Prescription created successfully!");
        onSuccess();
      }
    } catch (err) {
      console.error("Error creating prescription:", err);
      console.error("Error response:", err.response?.data);

      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.details ||
        err.response?.data?.error ||
        "Failed to create prescription. Please check console for details.";

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Create Prescription
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Patient <span className="text-red-500">*</span>
          </label>
          {loadingPatients ? (
            <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
              Loading patients...
            </div>
          ) : (
            <select
              name="patientId"
              value={formData.patientId}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">-- Select a patient --</option>
              {patients.map((patient) => (
                <option key={patient.patient_id} value={patient.patient_id}>
                  {patient.full_name} - DOB:{" "}
                  {patient.date_of_birth
                    ? new Date(patient.date_of_birth).toLocaleDateString()
                    : "N/A"}{" "}
                  - Phone: {patient.phone || "N/A"}
                </option>
              ))}
            </select>
          )}
          {patients.length === 0 && !loadingPatients && (
            <p className="text-sm text-gray-500 mt-1">
              No patients found. Please register patients first.
            </p>
          )}
        </div>

        {/* Medical Record ID (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medical Record ID (Optional)
          </label>
          <input
            type="text"
            name="medicalRecordId"
            value={formData.medicalRecordId}
            onChange={handleChange}
            placeholder="Link to medical record (optional)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave blank if not linking to a specific medical record
          </p>
        </div>

        {/* Medications */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Medications</h3>
            <button
              type="button"
              onClick={addMedication}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              + Add Medication
            </button>
          </div>

          <div className="space-y-6">
            {formData.medications.map((med, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 relative"
              >
                {formData.medications.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMedication(index)}
                    className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}

                <h4 className="font-medium text-gray-700 mb-3">
                  Medication #{index + 1}
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medication Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={med.name}
                      onChange={(e) =>
                        handleMedicationChange(index, "name", e.target.value)
                      }
                      required
                      placeholder="e.g., Paracetamol"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dosage <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) =>
                        handleMedicationChange(index, "dosage", e.target.value)
                      }
                      required
                      placeholder="e.g., 500mg"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={med.frequency}
                      onChange={(e) =>
                        handleMedicationChange(
                          index,
                          "frequency",
                          e.target.value
                        )
                      }
                      required
                      placeholder="e.g., 3 times daily"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={med.duration}
                      onChange={(e) =>
                        handleMedicationChange(
                          index,
                          "duration",
                          e.target.value
                        )
                      }
                      required
                      placeholder="e.g., 7 days"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instructions
                    </label>
                    <input
                      type="text"
                      value={med.instructions}
                      onChange={(e) =>
                        handleMedicationChange(
                          index,
                          "instructions",
                          e.target.value
                        )
                      }
                      placeholder="e.g., Take after meals"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || patients.length === 0}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Prescription"}
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

export default CreatePrescriptionForm;
