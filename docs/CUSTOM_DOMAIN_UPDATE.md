# Custom R2 Domain Configuration

## ✅ Custom Domain Setup Complete

You've configured `images.fg.feniix-hq.net` as your custom domain for the R2 bucket. This is excellent for performance and CORS handling!

## 🔧 Required Updates

### 1. Next.js Image Configuration ✅ DONE

Updated `next.config.ts` to include your custom domain:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'images.fg.feniix-hq.net', // ✅ Added
      port: '',
      pathname: '/**',
    },
    // ... other domains
  ],
}
```

### 2. Environment Variables (Optional)

If you want to use the custom domain for public URLs, set this environment variable:

```bash
# In production (Vercel)
R2_PUBLIC_URL=https://images.fg.feniix-hq.net

# In .env.local (development)
R2_PUBLIC_URL=https://images.fg.feniix-hq.net
```

**Note**: This is optional since your app uses authenticated API routes for media access.

### 3. CORS Configuration Update

Since you're using a custom domain, you have two options:

#### Option A: Test Without CORS (Recommended First)
Custom domains often bypass CORS restrictions entirely. Try uploading a file first - if it works, you don't need CORS configuration!

#### Option B: Configure CORS with Custom Domain
If you still get CORS errors, configure CORS in Cloudflare Dashboard with your custom domain:

```json
[
  {
    "AllowedOrigins": [
      "https://fg.feniix-hq.net",
      "https://images.fg.feniix-hq.net",
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

## 🧪 Testing Your Custom Domain

### 1. Test Image Loading
1. Go to your app: https://fg.feniix-hq.net
2. Check if existing images load properly
3. Look for any console errors about blocked images

### 2. Test File Upload
1. Try uploading a new photo
2. Check browser console for CORS errors
3. If upload succeeds, your custom domain is working perfectly!

### 3. Verify URLs
Check that your app is using the custom domain for image URLs:
1. Open browser Developer Tools
2. Go to Network tab
3. Upload or view images
4. Image requests should go to `images.fg.feniix-hq.net`

## 🎯 Benefits of Custom Domain

✅ **Better Performance**: Direct connection to your domain
✅ **CORS Avoidance**: Custom domains often bypass CORS restrictions  
✅ **Branding**: Images served from your domain
✅ **SSL/TLS**: Automatic HTTPS with your certificate
✅ **Caching**: Better cache control and CDN integration

## 🚨 If Issues Persist

### Images Not Loading
1. **Check DNS**: Ensure `images.fg.feniix-hq.net` resolves correctly
2. **Check SSL**: Verify HTTPS certificate is valid
3. **Check Cloudflare**: Ensure custom domain is properly configured in R2 settings

### Upload Errors
1. **Try without CORS first** - custom domains often don't need it
2. **Check presigned URLs** - they should use the custom domain
3. **Verify bucket permissions** - ensure the custom domain has proper access

### Console Errors
Look for specific error messages:
- `net::ERR_NAME_NOT_RESOLVED` → DNS issue
- `net::ERR_CERT_AUTHORITY_INVALID` → SSL certificate issue  
- `CORS error` → Need to configure CORS (rare with custom domains)

## 📋 Quick Checklist

- [x] Custom domain configured in Cloudflare R2
- [x] Next.js image configuration updated
- [ ] Test image loading (existing images)
- [ ] Test file upload (new images)
- [ ] Optional: Set R2_PUBLIC_URL environment variable
- [ ] Optional: Configure CORS if needed

## 🎉 Expected Outcome

With the custom domain properly configured:
- ✅ No more CORS errors on uploads
- ✅ Faster image loading
- ✅ Images served from `images.fg.feniix-hq.net`
- ✅ Better overall performance

Try uploading a file now - it should work without any CORS configuration needed! 