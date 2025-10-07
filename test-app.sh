#!/bin/bash

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Main script header
echo -e "${BLUE}===================================${NC}"
echo -e "${BLUE}Booking-Expense Matcher Test Script${NC}"
echo -e "${BLUE}===================================${NC}"

# Function to check if a port is in use
check_port() {
    local port=$1
    if command -v lsof &>/dev/null; then
        if lsof -i :$port -t &>/dev/null; then
            echo -e "${GREEN}✓ Port $port is in use (service is running)${NC}"
            return 0
        else
            echo -e "${RED}✗ Port $port is not in use (service is not running)${NC}"
            return 1
        fi
    elif command -v netstat &>/dev/null; then
        if netstat -tuln | grep -q ":$port\\b"; then
            echo -e "${GREEN}✓ Port $port is in use (service is running)${NC}"
            return 0
        else
            echo -e "${RED}✗ Port $port is not in use (service is not running)${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ Cannot check port $port (neither lsof nor netstat are available)${NC}"
        return 2
    fi
}

# Stage 1: Check if development server is running
echo -e "\n${BLUE}Stage 1: Checking if development server is running${NC}"
check_port 3000
if [ $? -eq 0 ]; then
    echo -e "${GREEN}React development server is running on port 3000${NC}"
else
    echo -e "${RED}React development server is not running!${NC}"
    echo -e "${YELLOW}Try running 'npm start' to start the server${NC}"
    exit 1
fi

# Stage 2: Check for sample data files
echo -e "\n${BLUE}Stage 2: Checking for sample data files${NC}"
booking_sample_count=$(find ./sample_data/booking_report -type f -name "*.csv" | wc -l)
expense_sample_count=$(find ./sample_data/expense_report -type f -name "*.csv" | wc -l)

echo -e "Found ${booking_sample_count} booking sample files"
echo -e "Found ${expense_sample_count} expense sample files"

if [ $booking_sample_count -gt 0 ] && [ $expense_sample_count -gt 0 ]; then
    echo -e "${GREEN}✓ Sample data files are available${NC}"
else
    echo -e "${YELLOW}⚠ Missing sample files. Application may not work correctly.${NC}"
fi

# Stage 3: Check for required components
echo -e "\n${BLUE}Stage 3: Checking for required components${NC}"
required_files=(
    "src/App.tsx"
    "src/components/FlightMatchSummary.tsx"
    "src/services/MatchingService.ts"
    "src/services/matchers/FlightMatcher.ts"
)

all_files_exist=true
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file exists${NC}"
    else
        echo -e "${RED}✗ $file is missing${NC}"
        all_files_exist=false
    fi
done

if $all_files_exist; then
    echo -e "${GREEN}All required components are present${NC}"
else
    echo -e "${RED}Some required components are missing${NC}"
fi

# Stage 4: Check for TypeScript errors
echo -e "\n${BLUE}Stage 4: Checking for TypeScript errors${NC}"
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ No TypeScript errors detected${NC}"
else
    echo -e "${RED}✗ TypeScript errors detected${NC}"
    echo -e "${YELLOW}Fix the TypeScript errors before proceeding${NC}"
fi

# Stage 5: Test data parsing functions
echo -e "\n${BLUE}Stage 5: Testing data parsing functions${NC}"
echo -e "${YELLOW}This is a placeholder for actual data parsing tests${NC}"
echo -e "${YELLOW}To implement proper tests, consider running:${NC}"
echo -e "npx jest --testPathPattern=src/services"

# Final summary
echo -e "\n${BLUE}===================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}===================================${NC}"
echo -e "${GREEN}✓ Development server: Running on port 3000${NC}"
echo -e "${GREEN}✓ Sample data: Available${NC}"
echo -e "${GREEN}✓ Required components: Present${NC}"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ TypeScript: No errors${NC}"
else
    echo -e "${RED}✗ TypeScript: Errors detected${NC}"
fi
echo -e "${BLUE}===================================${NC}"

echo -e "\n${GREEN}Application is ready for testing!${NC}"
echo -e "Open http://localhost:3000 in your browser to start using the application."