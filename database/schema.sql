-- =====================================================
-- EHR SYSTEM DATABASE SCHEMA
-- HIPAA-Compliant Design
-- =====================================================

-- Extension cho UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extension cho mã hóa
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- TABLE 1: USERS (Người dùng hệ thống)
-- =====================================================
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cognito_sub VARCHAR(255) UNIQUE NOT NULL, -- AWS Cognito User ID
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist')),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Index để tìm kiếm nhanh
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_cognito ON users(cognito_sub);
CREATE INDEX idx_users_role ON users(role);

-- =====================================================
-- TABLE 2: PATIENTS (Bệnh nhân - Thông tin hành chính)
-- =====================================================
CREATE TABLE patients (
    patient_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Thông tin cơ bản
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    
    -- Thông tin liên hệ
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    
    -- Thông tin định danh (MÃ HÓA)
    national_id_encrypted TEXT, -- CCCD/CMND được mã hóa
    insurance_number_encrypted TEXT, -- Mã BHYT được mã hóa
    
    -- Thông tin hệ thống
    cognito_sub VARCHAR(255) UNIQUE, -- Nếu bệnh nhân có tài khoản đăng nhập
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Index
CREATE INDEX idx_patients_name ON patients(full_name);
CREATE INDEX idx_patients_dob ON patients(date_of_birth);
CREATE INDEX idx_patients_cognito ON patients(cognito_sub);

-- =====================================================
-- TABLE 3: MEDICAL_RECORDS (Hồ sơ y tế)
-- =====================================================
CREATE TABLE medical_records (
    record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    
    -- Thông tin khám
    visit_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    chief_complaint TEXT, -- Lý do khám
    diagnosis TEXT, -- Chẩn đoán (MÃ HÓA khi lưu)
    treatment_plan TEXT, -- Phương án điều trị
    doctor_notes TEXT, -- Ghi chú bác sĩ
    
    -- Người thực hiện
    doctor_id UUID NOT NULL REFERENCES users(user_id),
    
    -- Trạng thái
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX idx_medical_records_doctor ON medical_records(doctor_id);
CREATE INDEX idx_medical_records_date ON medical_records(visit_date);

-- =====================================================
-- TABLE 4: VITAL_SIGNS (Chỉ số sinh tồn)
-- =====================================================
CREATE TABLE vital_signs (
    vital_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    record_id UUID REFERENCES medical_records(record_id) ON DELETE CASCADE,
    
    -- Chỉ số
    temperature DECIMAL(4,1), -- Nhiệt độ (°C)
    blood_pressure_systolic INTEGER, -- Huyết áp tâm thu (mmHg)
    blood_pressure_diastolic INTEGER, -- Huyết áp tâm trương (mmHg)
    heart_rate INTEGER, -- Nhịp tim (bpm)
    respiratory_rate INTEGER, -- Nhịp thở (breaths/min)
    oxygen_saturation DECIMAL(5,2), -- SpO2 (%)
    height DECIMAL(5,2), -- Chiều cao (cm)
    weight DECIMAL(5,2), -- Cân nặng (kg)
    bmi DECIMAL(5,2), -- BMI (tự tính)
    
    -- Thông tin ghi nhận
    notes TEXT,
    measured_by UUID NOT NULL REFERENCES users(user_id), -- Y tá đo
    measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_vital_signs_patient ON vital_signs(patient_id);
CREATE INDEX idx_vital_signs_record ON vital_signs(record_id);
CREATE INDEX idx_vital_signs_date ON vital_signs(measured_at);

-- =====================================================
-- TABLE 5: PRESCRIPTIONS (Đơn thuốc)
-- =====================================================
CREATE TABLE prescriptions (
    prescription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    record_id UUID REFERENCES medical_records(record_id) ON DELETE CASCADE,
    
    -- Thông tin đơn thuốc
    prescribed_by UUID NOT NULL REFERENCES users(user_id), -- Bác sĩ kê đơn
    prescription_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT, -- Ghi chú chung
    
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(prescribed_by);

-- =====================================================
-- TABLE 6: MEDICATIONS (Chi tiết thuốc)
-- =====================================================
CREATE TABLE medications (
    medication_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
    
    -- Thông tin thuốc
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL, -- Liều lượng (VD: 500mg)
    frequency VARCHAR(100), -- Tần suất (VD: 2 lần/ngày)
    duration VARCHAR(100), -- Thời gian (VD: 7 ngày)
    instructions TEXT, -- Hướng dẫn sử dụng
    quantity INTEGER, -- Số lượng
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_medications_prescription ON medications(prescription_id);

-- =====================================================
-- TABLE 7: AUDIT_LOGS (Nhật ký truy cập - HIPAA)
-- =====================================================
CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Ai?
    user_id UUID REFERENCES users(user_id),
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    
    -- Làm gì?
    action VARCHAR(100) NOT NULL, -- CREATE, READ, UPDATE, DELETE
    resource_type VARCHAR(100) NOT NULL, -- patients, medical_records, etc.
    resource_id UUID, -- ID của record được truy cập
    
    -- Chi tiết
    patient_id UUID REFERENCES patients(patient_id), -- Bệnh nhân liên quan
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_data JSONB, -- Dữ liệu request (nếu có)
    
    -- Khi nào?
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Kết quả
    status VARCHAR(20) CHECK (status IN ('success', 'failed', 'denied')),
    error_message TEXT
);

-- Index
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_patient ON audit_logs(patient_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- =====================================================
-- TABLE 8: PATIENT_DOCUMENTS (File đính kèm)
-- =====================================================
CREATE TABLE patient_documents (
    document_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    record_id UUID REFERENCES medical_records(record_id) ON DELETE SET NULL,
    
    -- Thông tin file
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50), -- PDF, JPEG, PNG
    file_size BIGINT, -- bytes
    s3_key TEXT NOT NULL, -- Đường dẫn file trên S3 (mã hóa)
    s3_bucket VARCHAR(255),
    
    -- Metadata
    document_type VARCHAR(100), -- lab_result, xray, prescription_scan, etc.
    description TEXT,
    
    -- Người upload
    uploaded_by UUID NOT NULL REFERENCES users(user_id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Bảo mật
    is_encrypted BOOLEAN DEFAULT true,
    encryption_key_id VARCHAR(255) -- AWS KMS Key ID
);

-- Index
CREATE INDEX idx_documents_patient ON patient_documents(patient_id);
CREATE INDEX idx_documents_record ON patient_documents(record_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function: Tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger cho các bảng cần updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON prescriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (Dữ liệu mẫu để test)
-- =====================================================

-- Insert Admin user mẫu
INSERT INTO users (cognito_sub, email, full_name, role, phone) VALUES
('admin-cognito-sub-123', 'admin@ehrsystem.com', 'System Admin', 'admin', '+84901234567');

-- =====================================================
-- VIEWS (Để query dễ hơn)
-- =====================================================

-- View: Thông tin bệnh nhân đầy đủ (cho Bác sĩ)
CREATE VIEW patient_full_info AS
SELECT 
    p.patient_id,
    p.full_name,
    p.date_of_birth,
    p.gender,
    p.phone,
    p.email,
    p.address,
    p.city,
    p.created_at,
    COUNT(DISTINCT mr.record_id) as total_visits,
    MAX(mr.visit_date) as last_visit
FROM patients p
LEFT JOIN medical_records mr ON p.patient_id = mr.patient_id
GROUP BY p.patient_id;

-- View: Lịch sử khám gần nhất
CREATE VIEW recent_visits AS
SELECT 
    mr.record_id,
    mr.patient_id,
    p.full_name as patient_name,
    mr.visit_date,
    mr.chief_complaint,
    u.full_name as doctor_name,
    mr.status
FROM medical_records mr
JOIN patients p ON mr.patient_id = p.patient_id
JOIN users u ON mr.doctor_id = u.user_id
ORDER BY mr.visit_date DESC;

-- =====================================================
-- SECURITY POLICIES (Row Level Security - Optional)
-- =====================================================

-- Enable RLS (sẽ cấu hình sau khi deploy)
-- ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- COMMENTS (Ghi chú cho developer)
-- =====================================================

COMMENT ON TABLE patients IS 'Bảng lưu thông tin hành chính bệnh nhân. CCCD và BHYT được mã hóa.';
COMMENT ON TABLE medical_records IS 'Hồ sơ y tế - chỉ Bác sĩ được ghi. Diagnosis được mã hóa.';
COMMENT ON TABLE vital_signs IS 'Chỉ số sinh tồn - Y tá nhập liệu.';
COMMENT ON TABLE audit_logs IS 'Nhật ký truy cập tuân thủ HIPAA - KHÔNG được xóa/sửa.';

-- =====================================================
-- END OF SCHEMA
-- =====================================================


