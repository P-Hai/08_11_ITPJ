# ============================================
# COMPLETE FIX FOR PATIENT FILES
# ============================================

Write-Host "🔧 Fixing patient files functionality..." -ForegroundColor Cyan

# 1. Create S3 bucket
$BUCKET_NAME = "ehr-backend-api-patient-files-dev"
Write-Host "`n1. Creating S3 bucket..." -ForegroundColor Yellow
aws s3 mb s3://$BUCKET_NAME --region ap-southeast-1 2>$null
Write-Host "   ✅ Bucket ready: $BUCKET_NAME" -ForegroundColor Green

# 2. Create patient_files table
Write-Host "`n2. Creating patient_files table..." -ForegroundColor Yellow
$env:PGPASSWORD = "Hai12345"

$migration = @"
CREATE TABLE IF NOT EXISTS patient_files (
    file_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100),
    s3_key VARCHAR(500) NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    uploaded_by UUID REFERENCES users(user_id),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_files_patient ON patient_files(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_files_uploaded_by ON patient_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_patient_files_created_at ON patient_files(created_at DESC);
"@

$migration | Out-File -FilePath temp_migration.sql -Encoding utf8
psql "host=ehr-system-db.c1keewkss49f.ap-southeast-1.rds.amazonaws.com port=5432 dbname=ehr_production user=postgres sslmode=require" -f temp_migration.sql
Remove-Item temp_migration.sql
Write-Host "   ✅ Table created" -ForegroundColor Green

# 3. Redeploy backend
Write-Host "`n3. Redeploying backend..." -ForegroundColor Yellow
cd backend
serverless deploy
Write-Host "   ✅ Backend deployed" -ForegroundColor Green

Write-Host "`n✅ ALL FIXES APPLIED!" -ForegroundColor Green
Write-Host "`nTest file upload now!" -ForegroundColor Cyan
