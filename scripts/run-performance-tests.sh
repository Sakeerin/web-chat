#!/bin/bash

# Performance Testing Script
# This script runs the complete performance testing suite

set -e

echo "🚀 Starting Performance Testing Suite"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL=${BASE_URL:-"http://localhost:3001"}
WS_URL=${WS_URL:-"ws://localhost:3001"}
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:3000"}

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if service is running
check_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Checking if $service_name is running at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url/health" > /dev/null 2>&1; then
            print_success "$service_name is running"
            return 0
        fi
        
        print_status "Waiting for $service_name... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    print_error "$service_name is not responding at $url"
    return 1
}

# Function to run k6 test
run_k6_test() {
    local test_file=$1
    local test_name=$2
    local output_file=$3
    
    print_status "Running $test_name..."
    
    if k6 run --out json="$output_file" "$test_file"; then
        print_success "$test_name completed successfully"
        return 0
    else
        print_error "$test_name failed"
        return 1
    fi
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."
    
    # Stop Docker containers if we started them
    if [ "$STARTED_CONTAINERS" = "true" ]; then
        print_status "Stopping Docker containers..."
        docker-compose down
    fi
    
    # Remove temporary files
    rm -f baseline-results.json concurrent-results.json throughput-results.json
    
    print_status "Cleanup completed"
}

# Set trap for cleanup on exit
trap cleanup EXIT

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    print_error "k6 is not installed. Please install k6 first."
    print_status "Installation instructions:"
    print_status "  macOS: brew install k6"
    print_status "  Ubuntu: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Start services if not running
if ! curl -f -s "$BASE_URL/health" > /dev/null 2>&1; then
    print_status "Starting application services..."
    docker-compose up -d
    STARTED_CONTAINERS=true
    
    # Wait for services to be ready
    check_service "$BASE_URL" "API Service" || exit 1
else
    print_success "API Service is already running"
    STARTED_CONTAINERS=false
fi

# Create results directory
mkdir -p performance-results
cd performance-results

print_status "Starting performance test suite..."

# 1. Run baseline load test
print_status "=== Running Baseline Load Test ==="
if run_k6_test "../apps/api/k6/load-test.js" "Baseline Load Test" "baseline-results.json"; then
    BASELINE_SUCCESS=true
else
    BASELINE_SUCCESS=false
fi

# 2. Run concurrent users test
print_status "=== Running Concurrent Users Test ==="
if run_k6_test "../apps/api/k6/concurrent-users-test.js" "Concurrent Users Test" "concurrent-results.json"; then
    CONCURRENT_SUCCESS=true
else
    CONCURRENT_SUCCESS=false
fi

# 3. Run message throughput test
print_status "=== Running Message Throughput Test ==="
if run_k6_test "../apps/api/k6/message-throughput-test.js" "Message Throughput Test" "throughput-results.json"; then
    THROUGHPUT_SUCCESS=true
else
    THROUGHPUT_SUCCESS=false
fi

# 4. Run frontend performance tests (if frontend is available)
if curl -f -s "$FRONTEND_URL" > /dev/null 2>&1; then
    print_status "=== Running Frontend Performance Tests ==="
    
    # Run Lighthouse CI
    if command -v lhci &> /dev/null; then
        print_status "Running Lighthouse CI..."
        if lhci autorun --config="../.lighthouserc.json"; then
            print_success "Lighthouse CI completed successfully"
            LIGHTHOUSE_SUCCESS=true
        else
            print_warning "Lighthouse CI failed"
            LIGHTHOUSE_SUCCESS=false
        fi
    else
        print_warning "Lighthouse CI not installed, skipping frontend audit"
        LIGHTHOUSE_SUCCESS=false
    fi
    
    # Run Playwright performance tests
    if command -v playwright &> /dev/null; then
        print_status "Running Playwright performance tests..."
        cd ../apps/web
        if npx playwright test --config=playwright.performance.config.ts; then
            print_success "Playwright performance tests completed successfully"
            PLAYWRIGHT_SUCCESS=true
        else
            print_warning "Playwright performance tests failed"
            PLAYWRIGHT_SUCCESS=false
        fi
        cd ../../performance-results
    else
        print_warning "Playwright not installed, skipping browser performance tests"
        PLAYWRIGHT_SUCCESS=false
    fi
else
    print_warning "Frontend service not available, skipping frontend tests"
    LIGHTHOUSE_SUCCESS=false
    PLAYWRIGHT_SUCCESS=false
fi

# 5. Generate performance report
print_status "=== Generating Performance Report ==="

# Create summary report
cat > performance-summary.json << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "tests": {
    "baseline_load_test": $BASELINE_SUCCESS,
    "concurrent_users_test": $CONCURRENT_SUCCESS,
    "message_throughput_test": $THROUGHPUT_SUCCESS,
    "lighthouse_audit": $LIGHTHOUSE_SUCCESS,
    "playwright_tests": $PLAYWRIGHT_SUCCESS
  },
  "environment": {
    "api_url": "$BASE_URL",
    "websocket_url": "$WS_URL",
    "frontend_url": "$FRONTEND_URL"
  }
}
EOF

# Generate human-readable report
cat > performance-report.md << EOF
# Performance Test Report

**Generated:** $(date)

## Test Results Summary

| Test | Status |
|------|--------|
| Baseline Load Test | $([ "$BASELINE_SUCCESS" = true ] && echo "✅ PASSED" || echo "❌ FAILED") |
| Concurrent Users Test | $([ "$CONCURRENT_SUCCESS" = true ] && echo "✅ PASSED" || echo "❌ FAILED") |
| Message Throughput Test | $([ "$THROUGHPUT_SUCCESS" = true ] && echo "✅ PASSED" || echo "❌ FAILED") |
| Lighthouse Audit | $([ "$LIGHTHOUSE_SUCCESS" = true ] && echo "✅ PASSED" || echo "❌ FAILED") |
| Playwright Tests | $([ "$PLAYWRIGHT_SUCCESS" = true ] && echo "✅ PASSED" || echo "❌ FAILED") |

## Performance Requirements

### Backend Performance
- **API Response Time**: P95 < 200ms
- **Message Latency**: P50 < 150ms (same region)
- **Concurrent Users**: ≥10,000 WebSocket connections
- **Message Throughput**: ≥500 messages/second
- **Error Rate**: <1%

### Frontend Performance
- **Initial Load Time**: P95 < 1.2s on 4G
- **Search Response**: P95 < 300ms
- **Core Web Vitals**: LCP <2.5s, FID <100ms, CLS <0.1

## Files Generated
- \`baseline-results.json\`: Baseline load test results
- \`concurrent-results.json\`: Concurrent users test results
- \`throughput-results.json\`: Message throughput test results
- \`performance-summary.json\`: Test execution summary
- \`performance-report.md\`: This report

## Next Steps
1. Review detailed results in JSON files
2. Compare metrics against performance requirements
3. Investigate any failed tests
4. Update performance baselines if needed
5. Monitor performance trends over time
EOF

print_success "Performance report generated: performance-report.md"

# Calculate overall success
OVERALL_SUCCESS=true
[ "$BASELINE_SUCCESS" = false ] && OVERALL_SUCCESS=false
[ "$CONCURRENT_SUCCESS" = false ] && OVERALL_SUCCESS=false
[ "$THROUGHPUT_SUCCESS" = false ] && OVERALL_SUCCESS=false

# Print final summary
echo ""
echo "🏁 Performance Testing Complete"
echo "================================"

if [ "$OVERALL_SUCCESS" = true ]; then
    print_success "All critical performance tests passed!"
    echo ""
    print_status "Results available in: $(pwd)"
    print_status "- performance-summary.json (machine-readable)"
    print_status "- performance-report.md (human-readable)"
    exit 0
else
    print_error "Some performance tests failed!"
    echo ""
    print_status "Please review the results and investigate failures:"
    print_status "- Check individual test result files"
    print_status "- Review application logs"
    print_status "- Verify system resources"
    print_status "- Compare against performance requirements"
    exit 1
fi