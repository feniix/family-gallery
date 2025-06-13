#!/bin/bash

# Family Gallery - Production Deployment Script
# This script handles the complete deployment process to Vercel

set -e  # Exit on any error

echo "🚀 Family Gallery Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -f "next.config.ts" ]]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

# Deployment type (default to preview)
DEPLOYMENT_TYPE=${1:-preview}

print_status "Deployment type: $DEPLOYMENT_TYPE"

# Pre-deployment checks
print_status "Running pre-deployment checks..."

# 1. Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI is not installed. Install it with: npm i -g vercel"
    exit 1
fi

# 2. Check if we're logged into Vercel
if ! vercel whoami &> /dev/null; then
    print_error "Not logged into Vercel. Run: vercel login"
    exit 1
fi

# 3. Install dependencies
print_status "Installing dependencies..."
yarn install

# 4. Run type checking
print_status "Running TypeScript type check..."
if ! yarn type-check; then
    print_error "TypeScript type check failed. Fix type errors before deploying."
    exit 1
fi

# 5. Run linting
print_status "Running ESLint..."
if ! yarn lint; then
    print_warning "Linting issues found. Consider fixing them before deploying."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled due to linting issues."
        exit 1
    fi
fi

# 6. Run tests
print_status "Running unit tests..."
if ! yarn test:unit; then
    print_error "Unit tests failed. Fix tests before deploying."
    exit 1
fi

# 7. Test build locally
print_status "Testing local build..."
if ! yarn build; then
    print_error "Local build failed. Fix build errors before deploying."
    exit 1
fi

print_success "All pre-deployment checks passed!"

# Deploy based on type
if [[ "$DEPLOYMENT_TYPE" == "production" ]] || [[ "$DEPLOYMENT_TYPE" == "prod" ]]; then
    print_status "Deploying to PRODUCTION..."
    print_warning "This will deploy to the live production environment!"
    read -p "Are you sure you want to deploy to production? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Production deployment cancelled."
        exit 1
    fi
    
    # Production deployment
    vercel --prod
    
    if [[ $? -eq 0 ]]; then
        print_success "Production deployment completed successfully!"
        print_status "Your app is now live at your production URL"
    else
        print_error "Production deployment failed!"
        exit 1
    fi
    
elif [[ "$DEPLOYMENT_TYPE" == "preview" ]]; then
    print_status "Deploying preview environment..."
    
    # Preview deployment
    vercel
    
    if [[ $? -eq 0 ]]; then
        print_success "Preview deployment completed successfully!"
        print_status "Check the preview URL provided by Vercel"
    else
        print_error "Preview deployment failed!"
        exit 1
    fi
    
else
    print_error "Invalid deployment type: $DEPLOYMENT_TYPE"
    print_status "Usage: ./scripts/deploy.sh [preview|production]"
    exit 1
fi

# Clean up build artifacts
print_status "Cleaning up build artifacts..."
rm -rf .next

print_success "Deployment process completed!"

echo ""
echo "📋 Post-deployment checklist:"
echo "1. ✅ Test authentication flow"
echo "2. ✅ Test file upload functionality"
echo "3. ✅ Verify gallery displays correctly"
echo "4. ✅ Test admin features"
echo "5. ✅ Check browser console for errors"
echo "6. ✅ Verify R2 storage is working"
echo ""
print_status "Remember to update Clerk domains if this is a new environment!" 