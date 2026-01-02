-- migrations/004_add_patient_cognito_fields.sql
-- Add Cognito integration fields to patients table

-- Add cognito_sub column (stores Cognito user sub/UUID)
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS cognito_sub VARCHAR(255);

-- Add cognito_username column (stores username like patient12345)
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS cognito_username VARCHAR(255);

-- Add unique constraints
ALTER TABLE patients 
ADD CONSTRAINT unique_cognito_sub UNIQUE (cognito_sub);

ALTER TABLE patients 
ADD CONSTRAINT unique_cognito_username UNIQUE (cognito_username);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_patients_cognito_sub 
ON patients(cognito_sub);

CREATE INDEX IF NOT EXISTS idx_patients_cognito_username 
ON patients(cognito_username);

-- Add comments for documentation
COMMENT ON COLUMN patients.cognito_sub IS 'AWS Cognito User ID (sub claim from JWT token)';
COMMENT ON COLUMN patients.cognito_username IS 'Cognito username for patient login (e.g., patient12345)';

-- Display table structure
\d patients;

-- Show affected rows
SELECT 
  COUNT(*) as total_patients,
  COUNT(cognito_sub) as with_cognito_account,
  COUNT(*) - COUNT(cognito_sub) as without_cognito_account
FROM patients;
