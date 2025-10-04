#!/bin/bash

# Integration Testing and System Validation Runner
# Executes all integration testing suites and generates comprehensive reports

set -e

echo "🚀 Starting Integration Testing and System Validation"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_ENV=${TEST_ENV:-"test"}
PARALLEL=${PARALLEL:-"false"}
BROWSER=${BROWSER:-"chromium"}
HEADLESS=${HEADLESS:-"true"}
TIMEOUT=${TIMEOUT:-"60000"}

echo -e "${BLUE}Configuration:${NC}"
echo "  Environment: $TEST_ENV"
echo "  Parallel: $PARALLEL"
echo "  Browser: $BROWSER"
echo "  Headless: $HEADLESS"
echo "  Timeout: $TIMEOUT"
echo ""

# Create test results directory
mkdir -p test-results
mkdir -p test-results/screenshots
mkdir -p test-results/videos
mkdir -p test-results/traces

# Function to run test suite
run_test_suite() {
    local suite_name=$1
    local config_file=$2
    local description=$3
    
    echo -e "${BLUE}Running $description...${NC}"
    
    if npx playwright test --config="$config_file" --project="$suite_name" --reporter=json --output-dir="test-results/$suite_name"; then
        echo -e "${GREEN}✅ $description completed successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ $description failed${NC}"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check if pnpm is installed
    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}❌ pnpm is not installed${NC}"
        exit 1
    fi
    
    # Check if Playwright is installed
    if ! npx playwright --version &> /dev/null; then
        echo -e "${YELLOW}⚠️ Installing Playwright...${NC}"
        npx playwright install
    fi
    
    # Check if application dependencies are installed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️ Installing dependencies...${NC}"
        pnpm install
    fi
    
    echo -e "${GREEN}✅ Prerequisites check completed${NC}"
}

# Function to start services
start_services() {
    echo -e "${BLUE}Starting required services...${NC}"
    
    # Start database services
    if command -v docker-compose &> /dev/null; then
        echo "Starting Docker services..."
        docker-compose up -d postgres redis minio
        sleep 5
    else
        echo -e "${YELLOW}⚠️ Docker Compose not available, assuming services are running${NC}"
    fi
    
    # Start the application in test mode
    echo "Starting application in test mode..."
    NODE_ENV=$TEST_ENV pnpm dev &
    APP_PID=$!
    
    # Wait for application to be ready
    echo "Waiting for application to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null; then
            echo -e "${GREEN}✅ Application is ready${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Application failed to start${NC}"
            kill $APP_PID 2>/dev/null || true
            exit 1
        fi
        sleep 2
    done
}

# Function to stop services
stop_services() {
    echo -e "${BLUE}Stopping services...${NC}"
    
    # Stop application
    if [ ! -z "$APP_PID" ]; then
        kill $APP_PID 2>/dev/null || true
    fi
    
    # Stop Docker services if running
    if command -v docker-compose &> /dev/null; then
        docker-compose down
    fi
    
    echo -e "${GREEN}✅ Services stopped${NC}"
}

# Function to generate reports
generate_reports() {
    echo -e "${BLUE}Generating comprehensive test reports...${NC}"
    
    # Generate HTML reports
    if [ -f "test-results/integration-results.json" ]; then
        npx playwright show-report test-results/integration-report
    fi
    
    # Generate Allure report if available
    if command -v allure &> /dev/null && [ -d "test-results/allure-results" ]; then
        echo "Generating Allure report..."
        allure generate test-results/allure-results -o test-results/allure-report --clean
    fi
    
    # Generate coverage report if available
    if [ -f "coverage/lcov.info" ]; then
        echo "Generating coverage report..."
        npx nyc report --reporter=html --report-dir=test-results/coverage-report
    fi
    
    echo -e "${GREEN}✅ Reports generated${NC}"
}

# Trap to ensure cleanup on exit
trap 'stop_services' EXIT

# Main execution
main() {
    local exit_code=0
    
    # Check prerequisites
    check_prerequisites
    
    # Start services
    start_services
    
    echo -e "${BLUE}Starting test execution...${NC}"
    echo ""
    
    # Run test suites
    echo -e "${YELLOW}Phase 1: End-to-End User Workflow Tests${NC}"
    if ! run_test_suite "user-workflows" "tests/integration-test-runner.config.ts" "User Workflow Tests"; then
        exit_code=1
    fi
    echo ""
    
    echo -e "${YELLOW}Phase 2: Cross-Browser Compatibility Tests${NC}"
    if ! run_test_suite "cross-browser-chrome" "tests/integration-test-runner.config.ts" "Chrome Compatibility Tests"; then
        exit_code=1
    fi
    if ! run_test_suite "cross-browser-firefox" "tests/integration-test-runner.config.ts" "Firefox Compatibility Tests"; then
        exit_code=1
    fi
    if ! run_test_suite "cross-browser-safari" "tests/integration-test-runner.config.ts" "Safari Compatibility Tests"; then
        exit_code=1
    fi
    echo ""
    
    echo -e "${YELLOW}Phase 3: Mobile Responsiveness Tests${NC}"
    if ! run_test_suite "mobile-iphone" "tests/integration-test-runner.config.ts" "iPhone Mobile Tests"; then
        exit_code=1
    fi
    if ! run_test_suite "mobile-android" "tests/integration-test-runner.config.ts" "Android Mobile Tests"; then
        exit_code=1
    fi
    if ! run_test_suite "tablet-ipad" "tests/integration-test-runner.config.ts" "iPad Tablet Tests"; then
        exit_code=1
    fi
    echo ""
    
    echo -e "${YELLOW}Phase 4: Performance Benchmark Tests${NC}"
    if ! run_test_suite "performance-benchmarks" "tests/integration-test-runner.config.ts" "Performance Benchmark Tests"; then
        exit_code=1
    fi
    echo ""
    
    echo -e "${YELLOW}Phase 5: Security Penetration Tests${NC}"
    if ! run_test_suite "security-tests" "tests/integration-test-runner.config.ts" "Security Penetration Tests"; then
        exit_code=1
    fi
    echo ""
    
    echo -e "${YELLOW}Phase 6: System Validation Tests${NC}"
    if ! run_test_suite "system-validation" "tests/integration-test-runner.config.ts" "System Validation Tests"; then
        exit_code=1
    fi
    echo ""
    
    # Generate reports
    generate_reports
    
    # Final summary
    echo "=================================================="
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 All integration tests completed successfully!${NC}"
        echo -e "${GREEN}✅ System validation passed${NC}"
    else
        echo -e "${RED}❌ Some integration tests failed${NC}"
        echo -e "${RED}⚠️ System validation incomplete${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Test Reports Available:${NC}"
    echo "  📊 HTML Report: test-results/integration-report/index.html"
    echo "  📋 JSON Results: test-results/integration-results.json"
    echo "  📄 JUnit XML: test-results/integration-junit.xml"
    echo "  📈 Test Summary: test-results/TEST-SUMMARY.md"
    
    if [ -d "test-results/allure-report" ]; then
        echo "  🎯 Allure Report: test-results/allure-report/index.html"
    fi
    
    if [ -d "test-results/coverage-report" ]; then
        echo "  📊 Coverage Report: test-results/coverage-report/index.html"
    fi
    
    echo ""
    echo -e "${BLUE}To view the HTML report:${NC}"
    echo "  npx playwright show-report test-results/integration-report"
    
    exit $exit_code
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Integration Testing and System Validation Runner"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --parallel          Run tests in parallel (faster but less stable)"
        echo "  --browser BROWSER   Browser to use (chromium, firefox, webkit)"
        echo "  --headed            Run tests in headed mode (visible browser)"
        echo "  --debug             Run tests in debug mode"
        echo ""
        echo "Environment Variables:"
        echo "  TEST_ENV            Test environment (default: test)"
        echo "  PARALLEL            Run in parallel (default: false)"
        echo "  BROWSER             Browser to use (default: chromium)"
        echo "  HEADLESS            Run headless (default: true)"
        echo "  TIMEOUT             Test timeout in ms (default: 60000)"
        echo ""
        exit 0
        ;;
    --parallel)
        PARALLEL="true"
        shift
        ;;
    --browser)
        BROWSER="$2"
        shift 2
        ;;
    --headed)
        HEADLESS="false"
        shift
        ;;
    --debug)
        HEADLESS="false"
        TIMEOUT="0"
        shift
        ;;
esac

# Run main function
main "$@"