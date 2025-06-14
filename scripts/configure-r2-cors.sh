#!/bin/bash

# Configure R2 CORS for Family Gallery Production
# This script configures CORS settings for the R2 bucket to allow uploads from the web app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if required environment variables are set
if [[ -z "$R2_ACCOUNT_ID" || -z "$R2_ACCESS_KEY_ID" || -z "$R2_SECRET_ACCESS_KEY" || -z "$R2_BUCKET_NAME" ]]; then
    print_error "Missing required environment variables:"
    echo "  R2_ACCOUNT_ID"
    echo "  R2_ACCESS_KEY_ID" 
    echo "  R2_SECRET_ACCESS_KEY"
    echo "  R2_BUCKET_NAME"
    echo ""
    echo "Please set these variables and run again."
    exit 1
fi

print_status "Configuring CORS for R2 bucket: $R2_BUCKET_NAME"

# Create CORS configuration file
CORS_CONFIG=$(cat << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://fg.feniix-hq.net",
        "https://*.vercel.app",
        "http://localhost:8080",
        "http://localhost:3001"
      ],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF
)

# Write CORS config to temporary file
TEMP_CORS_FILE=$(mktemp)
echo "$CORS_CONFIG" > "$TEMP_CORS_FILE"

print_status "CORS configuration:"
echo "$CORS_CONFIG"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first:"
    echo "  brew install awscli  # macOS"
    echo "  sudo apt install awscli  # Ubuntu/Debian"
    echo "  pip install awscli  # Python"
    exit 1
fi

# Configure AWS CLI for R2
print_status "Configuring AWS CLI for R2..."

# Set AWS credentials for this session
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"

# R2 endpoint
R2_ENDPOINT="https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com"

print_status "Applying CORS configuration to bucket..."

# Apply CORS configuration
if aws s3api put-bucket-cors \
    --bucket "$R2_BUCKET_NAME" \
    --cors-configuration "file://$TEMP_CORS_FILE" \
    --endpoint-url "$R2_ENDPOINT"; then
    
    print_success "CORS configuration applied successfully!"
    
    # Verify the configuration
    print_status "Verifying CORS configuration..."
    
    if aws s3api get-bucket-cors \
        --bucket "$R2_BUCKET_NAME" \
        --endpoint-url "$R2_ENDPOINT" \
        --output json; then
        
        print_success "CORS configuration verified!"
    else
        print_warning "Could not verify CORS configuration, but it may still be applied."
    fi
    
else
    print_error "Failed to apply CORS configuration"
    exit 1
fi

# Clean up temporary file
rm -f "$TEMP_CORS_FILE"

echo ""
print_success "R2 CORS configuration completed!"
echo ""
print_status "Next steps:"
echo "1. Wait 5-10 minutes for changes to propagate"
echo "2. Test file upload in your application"
echo "3. Check browser console for CORS errors"
echo ""
print_status "If you still see CORS errors:"
echo "1. Verify your domain is correct in the CORS configuration"
echo "2. Try using a custom R2 domain instead of the default"
echo "3. Check that your bucket name and credentials are correct" 