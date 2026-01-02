# File: backend/db-connect.ps1
# Database Connection Helper Script

param(
    [switch]$AddIP,
    [switch]$RunMigration,
    [string]$MigrationFile = "migrations/004_add_patient_cognito_fields.sql"
)

# Database credentials
$DB_HOST = "ehr-system-db.c1keewkss49f.ap-southeast-1.rds.amazonaws.com"
$DB_PORT = "5432"
$DB_NAME = "ehr_production"
$DB_USER = "postgres"
$DB_PASSWORD = "EHRdb#2025Secure!"
$SECURITY_GROUP = "sg-0f4696ad446117ed0"
$REGION = "ap-southeast-1"

Write-Host "🔧 EHR Database Connection Helper`n" -ForegroundColor Cyan

# Function: Add current IP to security group
function Add-CurrentIP {
    Write-Host "📡 Getting your current IP..." -ForegroundColor Yellow
    try {
        $myIP = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
        Write-Host "   Your IP: $myIP`n" -ForegroundColor Green
        
        Write-Host "🔓 Adding IP to security group..." -ForegroundColor Yellow
        aws ec2 authorize-security-group-ingress `
            --group-id $SECURITY_GROUP `
            --protocol tcp `
            --port $DB_PORT `
            --cidr "$myIP/32" `
            --region $REGION 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ IP added successfully!`n" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  IP might already be added or error occurred`n" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ❌ Error: $_`n" -ForegroundColor Red
    }
}

# Function: Set password environment variable
function Set-DBPassword {
    $env:PGPASSWORD = $DB_PASSWORD
    Write-Host "🔑 Password set in environment variable`n" -ForegroundColor Green
}

# Function: Connect to database
function Connect-Database {
    Write-Host "🔌 Connecting to database...`n" -ForegroundColor Yellow
    Set-DBPassword
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT
}

# Function: Run migration
function Run-Migration {
    param([string]$File)
    
    if (-not (Test-Path $File)) {
        Write-Host "❌ Migration file not found: $File`n" -ForegroundColor Red
        return
    }
    
    Write-Host "🚀 Running migration: $File`n" -ForegroundColor Yellow
    Set-DBPassword
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f $File
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Migration completed successfully!`n" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Migration failed!`n" -ForegroundColor Red
    }
}

# Main execution
if ($AddIP) {
    Add-CurrentIP
}

if ($RunMigration) {
    Run-Migration -File $MigrationFile
} else {
    Connect-Database
}