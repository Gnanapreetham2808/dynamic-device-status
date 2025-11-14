@echo off
REM Windows Batch Setup Script for Dynamic Device Status
REM This script creates a virtual environment and installs all dependencies

echo ========================================
echo Dynamic Device Status - Setup Script
echo ========================================
echo.

REM Check if Python is installed
echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://www.python.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo Found: %PYTHON_VERSION%

REM Check if .venv already exists
if exist ".venv" (
    echo.
    echo Virtual environment already exists.
    set /p RECREATE="Do you want to recreate it? (y/N): "
    if /i "%RECREATE%"=="y" (
        echo Removing existing virtual environment...
        rmdir /s /q .venv
    ) else (
        echo Using existing virtual environment...
    )
)

REM Create virtual environment if it doesn't exist
if not exist ".venv" (
    echo.
    echo Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo Virtual environment created successfully!
)

REM Activate virtual environment
echo.
echo Activating virtual environment...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

REM Upgrade pip
echo.
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install backend dependencies
if exist "Backend\requirements.txt" (
    echo.
    echo Installing backend dependencies...
    pip install -r Backend\requirements.txt
    if errorlevel 1 (
        echo ERROR: Failed to install backend dependencies
        pause
        exit /b 1
    )
    echo Backend dependencies installed successfully!
) else (
    echo WARNING: Backend\requirements.txt not found
)

REM Install additional script dependencies
echo.
echo Ensuring script dependencies are installed...
pip install psycopg2-binary python-dotenv

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Configure your database connection in Backend/.env or set environment variables
echo 2. Run the backend: cd Backend ^&^& python app.py
echo 3. Run the data simulator: cd scripts ^&^& python simulate_automotive.py
echo 4. Open the frontend in a browser (use Live Server or python -m http.server)
echo.
echo To activate the virtual environment manually, run:
echo .venv\Scripts\activate.bat
echo.
pause
