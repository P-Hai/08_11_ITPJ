import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL =
  process.env.REACT_APP_API_URL ||
  "https://0lxxigdzgk.execute-api.ap-southeast-1.amazonaws.com";

const PatientFiles = ({ patientId }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState("xray");
  const [description, setDescription] = useState("");

  // Fetch files when component loads
  useEffect(() => {
    if (patientId) {
      fetchFiles();
    }
  }, [patientId]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("idToken");
      const response = await axios.get(
        `${API_URL}/patient-files/patient/${patientId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setFiles(response.data.data);
    } catch (error) {
      console.error("Error fetching files:", error);
      alert("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert("File size exceeds 50MB limit");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file");
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem("idToken");

      // Step 1: Get presigned upload URL
      const urlResponse = await axios.post(
        `${API_URL}/patient-files/upload-url`,
        {
          patientId,
          fileName: selectedFile.name,
          fileType,
          mimeType: selectedFile.type,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const { uploadUrl, s3Key } = urlResponse.data.data;

      // Step 2: Upload file to S3
      await axios.put(uploadUrl, selectedFile, {
        headers: {
          "Content-Type": selectedFile.type,
        },
      });

      // Step 3: Save metadata to database
      await axios.post(
        `${API_URL}/patient-files/metadata`,
        {
          patientId,
          fileName: selectedFile.name,
          fileType,
          mimeType: selectedFile.type,
          fileSize: selectedFile.size,
          s3Key,
          description,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("File uploaded successfully!");

      // Reset form
      setSelectedFile(null);
      setDescription("");
      document.getElementById("fileInput").value = "";

      // Refresh file list
      fetchFiles();
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const token = localStorage.getItem("idToken");
      const response = await axios.get(
        `${API_URL}/patient-files/download/${fileId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const { downloadUrl } = response.data.data;

      // Open download URL in new tab
      window.open(downloadUrl, "_blank");
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download file");
    }
  };

  const handleDelete = async (fileId, fileName) => {
    if (!window.confirm(`Delete ${fileName}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("idToken");
      await axios.delete(`${API_URL}/patient-files/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("File deleted successfully");
      fetchFiles();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete file");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Patient Files</h2>

      {/* Upload Section */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h3>Upload New File</h3>

        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            File Type:
          </label>
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          >
            <option value="xray">X-Ray</option>
            <option value="ct_scan">CT Scan</option>
            <option value="mri">MRI</option>
            <option value="lab_result">Lab Result</option>
            <option value="report">Medical Report</option>
            <option value="prescription">Prescription</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Select File:
          </label>
          <input
            id="fileInput"
            type="file"
            onChange={handleFileSelect}
            accept="image/*,.pdf"
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
          <small style={{ color: "#666" }}>
            Accepted: Images (JPEG, PNG, GIF), PDF. Max size: 50MB
          </small>
        </div>

        {selectedFile && (
          <div
            style={{
              marginBottom: "15px",
              padding: "10px",
              backgroundColor: "#e3f2fd",
              borderRadius: "4px",
            }}
          >
            <strong>Selected:</strong> {selectedFile.name} (
            {formatFileSize(selectedFile.size)})
          </div>
        )}

        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Description (Optional):
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes about this file..."
            rows="3"
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              fontFamily: "inherit",
            }}
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          style={{
            backgroundColor: uploading ? "#ccc" : "#4CAF50",
            color: "white",
            padding: "12px 24px",
            border: "none",
            borderRadius: "4px",
            cursor: uploading ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          {uploading ? "Uploading..." : "Upload File"}
        </button>
      </div>

      {/* Files List */}
      <div>
        <h3>Uploaded Files ({files.length})</h3>

        {loading ? (
          <p>Loading files...</p>
        ) : files.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>
            No files uploaded yet
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #ddd",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f5f5f5" }}>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      border: "1px solid #ddd",
                    }}
                  >
                    File Name
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      border: "1px solid #ddd",
                    }}
                  >
                    Type
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      border: "1px solid #ddd",
                    }}
                  >
                    Size
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      border: "1px solid #ddd",
                    }}
                  >
                    Uploaded By
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      border: "1px solid #ddd",
                    }}
                  >
                    Upload Date
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      border: "1px solid #ddd",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr
                    key={file.file_id}
                    style={{ borderBottom: "1px solid #ddd" }}
                  >
                    <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                      {file.file_name}
                      {file.description && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            marginTop: "4px",
                          }}
                        >
                          {file.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#e3f2fd",
                          fontSize: "12px",
                        }}
                      >
                        {file.file_type.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                      {formatFileSize(file.file_size)}
                    </td>
                    <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                      {file.uploaded_by_name}
                    </td>
                    <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                      {formatDate(file.upload_date)}
                    </td>
                    <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                      <button
                        onClick={() =>
                          handleDownload(file.file_id, file.file_name)
                        }
                        style={{
                          backgroundColor: "#2196F3",
                          color: "white",
                          padding: "6px 12px",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          marginRight: "8px",
                          fontSize: "14px",
                        }}
                      >
                        Download
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(file.file_id, file.file_name)
                        }
                        style={{
                          backgroundColor: "#f44336",
                          color: "white",
                          padding: "6px 12px",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "14px",
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientFiles;
