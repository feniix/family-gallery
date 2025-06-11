# R2 CORS Configuration for Direct Upload

## Problem
When uploading files directly from the browser to R2 using presigned URLs, you may encounter CORS errors because the R2 bucket doesn't allow cross-origin requests.

## Solution
Configure CORS rules on your R2 bucket to allow uploads from your domain.

## Steps to Configure CORS

### 1. Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to R2 Object Storage
3. Select your bucket (`family-gallery-dev` or `family-gallery-prod`)
4. Go to "Settings" tab
5. Scroll to "CORS policy"
6. Add the following CORS configuration:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:8080",
      "http://localhost:3001", 
      "https://*.vercel.app",
      "https://your-domain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### 2. Using AWS CLI (S3-compatible)

If you have AWS CLI configured for R2:

```bash
# Create cors.json file
cat > cors.json << EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "http://localhost:8080",
        "http://localhost:3001",
        "https://*.vercel.app"
      ],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

# Apply CORS configuration
aws s3api put-bucket-cors \
  --bucket your-bucket-name \
  --cors-configuration file://cors.json \
  --endpoint-url https://your-account-id.r2.cloudflarestorage.com
```

### 3. Using Wrangler CLI

```bash
# Install wrangler if not already installed
npm install -g wrangler

# Create cors.json
cat > cors.json << EOF
[
  {
    "AllowedOrigins": [
      "http://localhost:8080",
      "http://localhost:3001",
      "https://*.vercel.app"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
EOF

# Apply CORS policy
wrangler r2 bucket cors put your-bucket-name --file cors.json
```

## Development vs Production

### Development CORS (Permissive)
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### Production CORS (Restrictive)
```json
[
  {
    "AllowedOrigins": [
      "https://your-domain.com",
      "https://www.your-domain.com"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": [
      "Content-Type",
      "Content-MD5",
      "Authorization",
      "x-amz-date",
      "x-amz-security-token"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Verifying CORS Configuration

After applying CORS rules, you can verify they're working:

1. **Browser Developer Tools**: Check the Network tab for CORS errors
2. **Test with curl**:
```bash
curl -X OPTIONS \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://your-bucket.r2.dev/test-file.jpg
```

## Troubleshooting

### Common Issues:

1. **AllowedOrigins**: Must include your exact domain (including protocol)
2. **Wildcard subdomains**: Use `https://*.vercel.app` for Vercel preview deployments  
3. **localhost ports**: Include both 8080 and 3001 for development
4. **AllowedHeaders**: Use `["*"]` during development, restrict in production

### Error Messages:
- `CORS error`: CORS policy not configured or misconfigured
- `Method not allowed`: Missing method in AllowedMethods
- `Header not allowed`: Missing header in AllowedHeaders

## Quick Fix for Development

For immediate testing, use the permissive development CORS policy above. This allows all origins and is suitable for development only. 