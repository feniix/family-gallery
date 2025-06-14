# Fix Console Errors - Family Gallery

This document addresses the console errors found in the application logs and provides step-by-step fixes.

## 🚨 Issues Identified

1. **Clerk deprecated prop warning** - `afterSignInUrl` prop is deprecated
2. **API route 404 error** - `/api/media/tags?action=list` returning 404
3. **API route 405 error** - `/api/media/tags` POST returning 405 (Method Not Allowed)
4. **CORS error** - R2 upload blocked by CORS policy
5. **JSON parsing error** - "Unexpected end of JSON input" when creating tags

## ✅ Fixes Applied

### 1. Fixed Clerk Deprecated Props

**Issue**: 
```
Clerk: The prop "afterSignInUrl" is deprecated and should be replaced with the new "fallbackRedirectUrl" or "forceRedirectUrl" props instead.
```

**Fix Applied**: Updated `src/app/layout.tsx` to use the new props:
```typescript
// Before
afterSignInUrl="/"
afterSignUpUrl="/"

// After  
signInFallbackRedirectUrl="/"
signUpFallbackRedirectUrl="/"
```

**Status**: ✅ **FIXED** - No more deprecation warnings

### 2. API Route Issues

**Issue**: 
```
/api/media/tags?action=list 404 (Not Found)
/api/media/tags 405 (Method Not Allowed)
```

**Root Cause**: The API route exists and is properly configured. The 404/405 errors suggest:
- Route file may not be properly deployed
- Next.js routing cache issues
- Build/deployment problems

**Fix Steps**:

1. **Verify Route File**: The route file exists at `src/app/api/media/tags/route.ts` and supports:
   - `GET` with `action=list` parameter
   - `POST` for creating/updating tags
   - `DELETE` for removing tags

2. **Clear Next.js Cache**:
   ```bash
   rm -rf .next
   yarn build
   yarn dev
   ```

3. **Check Route Registration**: Ensure the route is properly registered by testing:
   ```bash
   curl -X GET "http://localhost:8080/api/media/tags?action=list" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

**Status**: ⚠️ **NEEDS VERIFICATION** - Route exists but may need cache clearing

### 3. CORS Error for R2 Uploads

**Issue**:
```
Access to fetch at 'https://family-gallery-prod.4d38d810481402dae4e99fe589d6e4ee.r2.cloudflarestorage.com/...' 
from origin 'https://fg.feniix-hq.net' has been blocked by CORS policy
```

**Root Cause**: R2 bucket doesn't have CORS configured for the production domain.

**Fix Applied**: Created `scripts/configure-r2-cors.sh` script to configure CORS.

**Manual Fix Steps**:

1. **Using Cloudflare Dashboard**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to R2 Object Storage → Your Bucket
   - Go to "Settings" tab → "CORS policy"
   - Add this configuration:

   ```json
   [
     {
       "AllowedOrigins": [
         "https://fg.feniix-hq.net",
         "https://*.vercel.app",
         "http://localhost:8080"
       ],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

2. **Using the Script** (Recommended):
   ```bash
   # Set environment variables
   export R2_ACCOUNT_ID="4d38d810481402dae4e99fe589d6e4ee"
   export R2_ACCESS_KEY_ID="your_access_key"
   export R2_SECRET_ACCESS_KEY="your_secret_key"
   export R2_BUCKET_NAME="family-gallery-prod"
   
   # Run the script
   ./scripts/configure-r2-cors.sh
   ```

**Script Error**:
```
An error occurred (AccessDenied) when calling the PutBucketCors operation: Access Denied
```

This means the R2 API token doesn't have sufficient permissions to modify CORS settings.

**Status**: 🔧 **ACTION REQUIRED** - Use manual configuration via dashboard

### 4. JSON Parsing Error

**Issue**:
```
{"time":"2025-06-14T00:20:33.419Z","level":"error","msg":"Error creating tag","module":"API","tag":"bernabe","error":"Unexpected end of JSON input"}
```

**Root Cause**: This error occurs when:
- API response is empty or malformed
- Network request fails before response is received
- CORS error prevents proper response

**Fix**: This should be resolved once the CORS issue is fixed, as the API route is properly implemented.

**Status**: 🔗 **DEPENDS ON CORS FIX**

## 🔧 Action Items

### Immediate Actions (Required)

1. **Configure R2 CORS** (Critical) - **Use Manual Method**:
   
   **Go to Cloudflare Dashboard** (Recommended):
   - Visit [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to **R2 Object Storage** → `family-gallery-prod`
   - Go to **Settings** tab → **CORS policy**
   - Add this configuration:
   
   ```json
   [
     {
       "AllowedOrigins": [
         "https://fg.feniix-hq.net",
         "https://*.vercel.app",
         "http://localhost:8080"
       ],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

2. **Clear Next.js Cache** (if API routes still fail):
   ```bash
   rm -rf .next
   yarn build
   yarn dev
   ```

3. **Verify Environment Variables**:
   ```bash
   # Check that these are set in production
   echo $R2_ACCOUNT_ID
   echo $R2_BUCKET_NAME
   echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   ```

### Verification Steps

1. **Test Clerk Authentication**:
   - Visit your app
   - Sign in/out - should not see deprecation warnings in console

2. **Test API Routes**:
   ```bash
   # Test tags list endpoint
   curl -X GET "https://your-domain.com/api/media/tags?action=list"
   
   # Should return: {"tags": [...]}
   ```

3. **Test File Upload**:
   - Try uploading a photo
   - Check browser console for CORS errors
   - Upload should complete successfully

## 🚨 If Issues Persist

### API Route 404/405 Errors

If API routes still return 404/405 after cache clearing:

1. **Check Deployment**:
   - Verify the route file is included in the build
   - Check Vercel function logs for errors

2. **Check Route Structure**:
   ```bash
   # Verify file exists
   ls -la src/app/api/media/tags/route.ts
   
   # Check exports
   grep -n "export.*function" src/app/api/media/tags/route.ts
   ```

3. **Test Locally**:
   ```bash
   yarn dev
   # Test the route at http://localhost:8080/api/media/tags?action=list
   ```

### CORS Errors

If CORS errors persist after configuration:

1. **Wait for Propagation**: CORS changes can take 5-10 minutes
2. **Clear Browser Cache**: Use incognito mode or clear cache
3. **Verify Domain**: Ensure the exact domain is in CORS configuration
4. **Check Bucket Name**: Verify you're configuring the correct bucket

### Upload Failures

If uploads still fail:

1. **Check Presigned URLs**: Verify they're being generated correctly
2. **Check R2 Credentials**: Ensure they're valid and have proper permissions
3. **Check File Size**: Ensure files are within size limits
4. **Check Network**: Test with smaller files first

## 📞 Getting Help

If you continue to experience issues:

1. **Check Logs**:
   - Browser console for client-side errors
   - Vercel function logs for server-side errors
   - Network tab for failed requests

2. **Test Environment**:
   - Try the same operations in development
   - Compare working vs non-working requests

3. **Contact Support**:
   - Cloudflare support for R2 CORS issues
   - Vercel support for deployment issues
   - Clerk support for authentication issues

## 📋 Summary

| Issue | Status | Action Required |
|-------|--------|----------------|
| Clerk deprecated props | ✅ Fixed | None |
| API route 404/405 | ⚠️ Needs verification | Clear cache, test routes |
| CORS errors | 🔧 Action required | Configure R2 CORS |
| JSON parsing errors | 🔗 Depends on CORS | Fix CORS first |

**Priority**: Fix CORS configuration first, as it's blocking uploads and may be causing the JSON parsing errors. 