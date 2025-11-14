# Windows PowerShell Setup Script for Dynamic Device Status
# This script creates a virtual environment and installs all dependencies

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Dynamic Device Status - Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
Write-Host "Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.8 or higher from https://www.python.org/" -ForegroundColor Red
    exit 1
}

# Check if .venv already exists
if (Test-Path ".venv") {
    Write-Host ""
    Write-Host "Virtual environment already exists." -ForegroundColor Yellow
    $response = Read-Host "Do you want to recreate it? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "Removing existing virtual environment..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force .venv
    } else {
        Write-Host "Using existing virtual environment..." -ForegroundColor Green
    }
}

# Create virtual environment if it doesn't exist
if (-not (Test-Path ".venv")) {
    Write-Host ""
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
    Write-Host "Virtual environment created successfully!" -ForegroundColor Green
}

# Activate virtual environment
Write-Host ""
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& .\.venv\Scripts\Activate.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to activate virtual environment" -ForegroundColor Red
    exit 1
}

# Upgrade pip
Write-Host ""
Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# Install backend dependencies
if (Test-Path "Backend\requirements.txt") {
    Write-Host ""
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    pip install -r Backend\requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install backend dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "Backend dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Backend\requirements.txt not found" -ForegroundColor Yellow
}

# Install additional script dependencies if needed
$scriptPackages = @("psycopg2-binary", "python-dotenv")
Write-Host ""
Write-Host "Ensuring script dependencies are installed..." -ForegroundColor Yellow
foreach ($package in $scriptPackages) {
    pip show $package > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Installing $package..." -ForegroundColor Yellow
        pip install $package
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Configure your database connection in Backend/.env or set environment variables" -ForegroundColor White
Write-Host "2. Run the backend: cd Backend; python app.py" -ForegroundColor White
Write-Host "3. Run the data simulator: cd scripts; python simulate_automotive.py" -ForegroundColor White
Write-Host "4. Open the frontend in a browser (use Live Server or python -m http.server)" -ForegroundColor White
Write-Host ""
Write-Host "To activate the virtual environment manually, run:" -ForegroundColor Cyan
Write-Host ".\.venv\Scripts\Activate.ps1" -ForegroundColor Yellow
Write-Host ""
