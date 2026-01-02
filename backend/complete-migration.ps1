# complete-migration.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EHR Database Migration Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$password = "EHRdb#2025Secure!"
$host = "ehr-system-db.c1keewkss49f.ap-southeast-1.rds.amazonaws.com"
$dbname = "ehr_production"
$user = "postgres"  # CORRECTED USERNAME
$migrationFile = "migrations/004_add_patient_cognito_fields.sql"

# Set password
$env:PGPASSWORD = $password

# Step 1: Check RDS status
Write-Host "[STEP 1] Checking RDS status..." -ForegroundColor Yellow
$status = aws rds describe-db-instances `
  --db-instance-identifier ehr-system-db `
  --region ap-southeast-1 `
  --query 'DBInstances[0].DBInstanceStatus' `
  --output text

Write-Host "         Status: $status" -ForegroundColor Green

if ($status -ne "available") {
    Write-Host "         RDS is not available. Waiting 60 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 60
}

Write-Host ""

# Step 2: Test connection
Write-Host "[STEP 2] Testing database connection..." -ForegroundColor Yellow
$connectionString = "host=$host port=5432 dbname=$dbname user=$user sslmode=require"

$testResult = psql $connectionString -c "SELECT current_database(), current_user, version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "         Connection successful!" -ForegroundColor Green
    Write-Host ""
    
    # Step 3: Check if migration already applied
    Write-Host "[STEP 3] Checking if migration already applied..." -ForegroundColor Yellow
    
    $columnCheck = psql $connectionString -c "\d patients" 2>&1 | Select-String "cognito_sub"
    
    if ($columnCheck) {
        Write-Host "         Migration already applied! Columns exist." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "[INFO] Showing current patients table structure:" -ForegroundColor Cyan
        psql $connectionString -c "\d patients"
    } else {
        Write-Host "         Migration not applied yet. Running migration..." -ForegroundColor Yellow
        Write-Host ""
        
        # Step 4: Run migration
        Write-Host "[STEP 4] Running migration..." -ForegroundColor Yellow
        Write-Host "         File: $migrationFile" -ForegroundColor Cyan
        Write-Host ""
        
        psql $connectionString -f $migrationFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "[SUCCESS] Migration completed successfully!" -ForegroundColor Green
            Write-Host ""
            
            # Verify
            Write-Host "[VERIFY] Checking updated table structure..." -ForegroundColor Cyan
            psql $connectionString -c "\d patients"
        } else {
            Write-Host ""
            Write-Host "[ERROR] Migration failed!" -ForegroundColor Red
        }
    }
} else {
    Write-Host "         Connection failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "[ERROR] Cannot connect to database." -ForegroundColor Red
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "  1. RDS is still applying password change" -ForegroundColor Yellow
    Write-Host "  2. Password is incorrect" -ForegroundColor Yellow
    Write-Host "  3. Network/SSL issue" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Try again in 2-3 minutes." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan