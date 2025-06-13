#!/bin/bash

# Family Gallery - Clerk Authentication Fix Script
# This script helps diagnose and fix Clerk authentication issues

set -e

echo "🔐 Clerk Authentication Diagnostic & Fix Tool"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -f "next.config.ts" ]]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

# Check environment variables
print_status "Checking environment variables..."

MISSING_VARS=()

# Check for required Clerk variables
if [[ -z "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ]]; then
    MISSING_VARS+=("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
fi

if [[ -z "$CLERK_SECRET_KEY" ]]; then
    MISSING_VARS+=("CLERK_SECRET_KEY")
fi

# Check .env.local file
if [[ -f ".env.local" ]]; then
    print_success "Found .env.local file"
    
    # Source the file to check variables
    while IFS= read -r line; do
        if [[ $line =~ ^[^#]*= ]]; then
            export "$line"
        fi
    done < .env.local
    
    # Check again after sourcing
    MISSING_VARS=()
    if [[ -z "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ]]; then
        MISSING_VARS+=("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
    fi
    
    if [[ -z "$CLERK_SECRET_KEY" ]]; then
        MISSING_VARS+=("CLERK_SECRET_KEY")
    fi
else
    print_warning "No .env.local file found"
fi

# Check if keys are correct format
if [[ -n "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ]]; then
    if [[ "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" =~ ^pk_live_ ]]; then
        print_success "Using PRODUCTION Clerk keys"
    elif [[ "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" =~ ^pk_test_ ]]; then
        print_warning "Using DEVELOPMENT Clerk keys"
    else
        print_error "Invalid Clerk publishable key format"
        MISSING_VARS+=("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (invalid format)")
    fi
fi

if [[ -n "$CLERK_SECRET_KEY" ]]; then
    if [[ "$CLERK_SECRET_KEY" =~ ^sk_live_ ]]; then
        print_success "Using PRODUCTION Clerk secret key"
    elif [[ "$CLERK_SECRET_KEY" =~ ^sk_test_ ]]; then
        print_warning "Using DEVELOPMENT Clerk secret key"
    else
        print_error "Invalid Clerk secret key format"
        MISSING_VARS+=("CLERK_SECRET_KEY (invalid format)")
    fi
fi

# Report missing variables
if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
    print_error "Missing environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    print_status "Please add these to your .env.local file or Vercel environment variables"
else
    print_success "All required Clerk environment variables are present"
fi

# Check for webhook secret
if [[ -z "$CLERK_WEBHOOK_SECRET" ]]; then
    print_warning "CLERK_WEBHOOK_SECRET is not set (required for user creation webhooks)"
else
    print_success "CLERK_WEBHOOK_SECRET is configured"
fi

# Check Clerk configuration in code
print_status "Checking Clerk configuration in code..."

# Check if ClerkProvider is properly configured
if grep -q "ClerkProvider" src/app/layout.tsx; then
    print_success "ClerkProvider found in layout.tsx"
    
    # Check if publishableKey is explicitly set
    if grep -q "publishableKey=" src/app/layout.tsx; then
        print_success "publishableKey is explicitly set in ClerkProvider"
    else
        print_warning "publishableKey not explicitly set in ClerkProvider"
    fi
else
    print_error "ClerkProvider not found in layout.tsx"
fi

# Check middleware configuration
if [[ -f "src/middleware.ts" ]]; then
    print_success "Middleware file found"
    if grep -q "clerkMiddleware" src/middleware.ts; then
        print_success "clerkMiddleware is configured"
    else
        print_warning "clerkMiddleware not found in middleware"
    fi
else
    print_warning "No middleware.ts file found"
fi

# Test local development server
print_status "Testing local development setup..."

if [[ ${#MISSING_VARS[@]} -eq 0 ]]; then
    print_status "Starting development server test..."
    
    # Start dev server in background
    yarn dev > /dev/null 2>&1 &
    DEV_PID=$!
    
    # Wait for server to start
    sleep 10
    
    # Test if server is running
    if curl -f -s --max-time 5 "http://localhost:8080" > /dev/null; then
        print_success "Development server is running"
        
        # Test sign-in page
        if curl -f -s --max-time 5 "http://localhost:8080/sign-in" > /dev/null; then
            print_success "Sign-in page is accessible"
        else
            print_warning "Sign-in page is not accessible"
        fi
    else
        print_warning "Development server is not responding"
    fi
    
    # Kill dev server
    kill $DEV_PID 2>/dev/null || true
    wait $DEV_PID 2>/dev/null || true
else
    print_warning "Skipping development server test due to missing environment variables"
fi

echo ""
echo "🔧 Recommended Actions:"
echo "======================="

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
    echo "1. Add missing environment variables to .env.local:"
    echo "   cp .env.local.example .env.local"
    echo "   # Edit .env.local with your Clerk keys"
    echo ""
fi

echo "2. Verify Clerk Dashboard Configuration:"
echo "   - Go to https://dashboard.clerk.com"
echo "   - Check that your domain is added to 'Configure' → 'Domains'"
echo "   - For production: add https://your-project.vercel.app"
echo "   - For development: add http://localhost:8080"
echo ""

echo "3. If deploying to production:"
echo "   - Ensure environment variables are set in Vercel"
echo "   - Use production keys (pk_live_*, sk_live_*)"
echo "   - Configure webhooks in Clerk Dashboard"
echo ""

echo "4. Test the configuration:"
echo "   - Run: yarn dev"
echo "   - Visit: http://localhost:8080/sign-in"
echo "   - Check browser console for errors"
echo ""

echo "5. For production issues:"
echo "   - Read: docs/CLERK_CONFIGURATION.md"
echo "   - Run: ./scripts/check-deployment.sh https://your-domain.com"
echo ""

if [[ ${#MISSING_VARS[@]} -eq 0 ]]; then
    print_success "Clerk configuration looks good! Try running 'yarn dev' and testing authentication."
else
    print_error "Please fix the missing environment variables before proceeding."
fi

echo ""
print_status "For detailed help, see: docs/CLERK_CONFIGURATION.md" 