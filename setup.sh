#!/bin/bash
# Linux/Mac Setup Script for Dynamic Device Status
# This script creates a virtual environment and installs all dependencies

echo "========================================"
echo "Dynamic Device Status - Setup Script"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if Python is installed
echo -e "${YELLOW}Checking Python installation...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}ERROR: Python 3 is not installed${NC}"
    echo -e "${RED}Please install Python 3.8 or higher${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}Found: $PYTHON_VERSION${NC}"

# Check if .venv already exists
if [ -d ".venv" ]; then
    echo ""
    echo -e "${YELLOW}Virtual environment already exists.${NC}"
    read -p "Do you want to recreate it? (y/N): " response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Removing existing virtual environment...${NC}"
        rm -rf .venv
    else
        echo -e "${GREEN}Using existing virtual environment...${NC}"
    fi
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo ""
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv .venv
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Failed to create virtual environment${NC}"
        exit 1
    fi
    echo -e "${GREEN}Virtual environment created successfully!${NC}"
fi

# Activate virtual environment
echo ""
echo -e "${YELLOW}Activating virtual environment...${NC}"
source .venv/bin/activate
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to activate virtual environment${NC}"
    exit 1
fi

# Upgrade pip
echo ""
echo -e "${YELLOW}Upgrading pip...${NC}"
python -m pip install --upgrade pip

# Install backend dependencies
if [ -f "Backend/requirements.txt" ]; then
    echo ""
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    pip install -r Backend/requirements.txt
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Failed to install backend dependencies${NC}"
        exit 1
    fi
    echo -e "${GREEN}Backend dependencies installed successfully!${NC}"
else
    echo -e "${YELLOW}WARNING: Backend/requirements.txt not found${NC}"
fi

# Install additional script dependencies if needed
SCRIPT_PACKAGES=("psycopg2-binary" "python-dotenv")
echo ""
echo -e "${YELLOW}Ensuring script dependencies are installed...${NC}"
for package in "${SCRIPT_PACKAGES[@]}"; do
    if ! pip show "$package" > /dev/null 2>&1; then
        echo -e "${YELLOW}Installing $package...${NC}"
        pip install "$package"
    fi
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "1. Configure your database connection in Backend/.env or set environment variables"
echo "2. Run the backend: cd Backend && python app.py"
echo "3. Run the data simulator: cd scripts && python simulate_automotive.py"
echo "4. Open the frontend in a browser (use Live Server or python -m http.server)"
echo ""
echo -e "${CYAN}To activate the virtual environment manually, run:${NC}"
echo -e "${YELLOW}source .venv/bin/activate${NC}"
echo ""
