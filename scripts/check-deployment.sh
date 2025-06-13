#!/bin/bash

# Family Gallery - Deployment Health Check Script
# This script verifies that all services are working correctly after deployment

set -e

echo "🏥 Family Gallery Deployment Health Check"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Configuration
DEPLOYMENT_URL=${1:-"https://family-gallery.vercel.app"}
TIMEOUT=10

print_status "Checking deployment at: $DEPLOYMENT_URL"
echo ""

# Test 1: Basic connectivity
print_status "Testing basic connectivity..."
if curl -f -s --max-time $TIMEOUT "$DEPLOYMENT_URL" > /dev/null; then
    print_success "Website is reachable"
else
    print_error "Website is not reachable"
    exit 1
fi

# Test 2: Check if the page loads correctly
print_status "Testing page load..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$DEPLOYMENT_URL")
if [[ "$HTTP_STATUS" == "200" ]]; then
    print_success "Homepage returns 200 OK"
else
    print_error "Homepage returns $HTTP_STATUS"
    exit 1
fi

# Test 3: Check API health endpoint
print_status "Testing API health endpoint..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$DEPLOYMENT_URL/api/health")
if [[ "$API_STATUS" == "200" ]]; then
    print_success "API health endpoint is working"
else
    print_warning "API health endpoint returns $API_STATUS (might not be implemented yet)"
fi

# Test 4: Check if authentication pages are accessible
print_status "Testing authentication pages..."
SIGNIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$DEPLOYMENT_URL/sign-in")
if [[ "$SIGNIN_STATUS" == "200" ]]; then
    print_success "Sign-in page is accessible"
else
    print_warning "Sign-in page returns $SIGNIN_STATUS"
fi

# Test 5: Check if admin routes are protected
print_status "Testing admin route protection..."
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$DEPLOYMENT_URL/admin")
if [[ "$ADMIN_STATUS" == "401" ]] || [[ "$ADMIN_STATUS" == "403" ]] || [[ "$ADMIN_STATUS" == "302" ]]; then
    print_success "Admin routes are properly protected"
elif [[ "$ADMIN_STATUS" == "200" ]]; then
    print_warning "Admin route is accessible without authentication (check middleware)"
else
    print_warning "Admin route returns $ADMIN_STATUS"
fi

# Test 6: Check Content-Security-Policy headers
print_status "Testing security headers..."
CSP_HEADER=$(curl -s -I --max-time $TIMEOUT "$DEPLOYMENT_URL" | grep -i "x-content-type-options" || echo "")
if [[ -n "$CSP_HEADER" ]]; then
    print_success "Security headers are present"
else
    print_warning "Security headers might be missing"
fi

# Test 7: Check if static assets are loading
print_status "Testing static assets..."
FAVICON_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$DEPLOYMENT_URL/favicon.ico")
if [[ "$FAVICON_STATUS" == "200" ]]; then
    print_success "Static assets are loading"
else
    print_warning "Some static assets might not be loading (favicon: $FAVICON_STATUS)"
fi

# Test 8: Check for common deployment issues
print_status "Checking for common deployment issues..."
PAGE_CONTENT=$(curl -s --max-time $TIMEOUT "$DEPLOYMENT_URL")

if echo "$PAGE_CONTENT" | grep -q "Application error" || echo "$PAGE_CONTENT" | grep -q "500"; then
    print_error "Application error detected on homepage"
    exit 1
elif echo "$PAGE_CONTENT" | grep -q "404"; then
    print_error "404 error detected on homepage"
    exit 1
else
    print_success "No obvious application errors detected"
fi

# Test 9: Check if environment variables are properly set
print_status "Testing environment configuration..."
if echo "$PAGE_CONTENT" | grep -q "pk_live_" || echo "$PAGE_CONTENT" | grep -q "pk_test_"; then
    print_success "Clerk authentication is configured"
else
    print_warning "Clerk authentication might not be properly configured"
fi

echo ""
echo "🎯 Health Check Summary"
echo "====================="
print_status "Deployment URL: $DEPLOYMENT_URL"
print_status "Timestamp: $(date)"

# Additional manual checks reminder
echo ""
echo "📋 Manual checks still needed:"
echo "1. Test user registration/login flow"
echo "2. Upload a test image/video"
echo "3. Verify gallery displays media correctly"
echo "4. Test admin functionality"
echo "5. Check browser console for JavaScript errors"
echo "6. Verify R2 storage operations"
echo "7. Test on mobile devices"
echo ""

print_success "Automated health check completed!"
echo "For comprehensive testing, run the full test suite with: yarn test:all" 