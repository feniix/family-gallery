# Manual R2 CORS Configuration - Step by Step

## 🚨 Issue
The automated CORS script failed with "Access Denied" because the R2 API token lacks CORS modification permissions.

## ✅ Manual Fix (5 minutes)

### Step 1: Access Cloudflare Dashboard
1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. Log in with your Cloudflare account

### Step 2: Navigate to R2
1. In the left sidebar, click **R2 Object Storage**
2. You should see your bucket: `family-gallery-prod`
3. Click on the bucket name to open it

### Step 3: Open Settings
1. Once inside the bucket, look for tabs at the top
2. Click the **Settings** tab
3. Scroll down to find **CORS policy** section

### Step 4: Configure CORS
1. In the CORS policy section, click **Add CORS policy** (or **Edit** if one exists)
2. Replace any existing configuration with this exact JSON:

```json
[
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
```

**Note**: Since you're using a custom domain (`images.fg.feniix-hq.net`), you may not need CORS configuration at all! Custom domains often bypass CORS restrictions. Try uploading first - if it works, you can skip the CORS configuration.

3. Click **Save** or **Apply**

### Step 5: Verify Configuration
1. The CORS policy should now be visible in the Settings tab
2. You should see the allowed origins listed

## 🔍 What This Fixes

This CORS configuration allows:
- ✅ Uploads from `https://fg.feniix-hq.net` (your production domain)
- ✅ Uploads from Vercel preview deployments (`*.vercel.app`)
- ✅ Local development uploads (`localhost:8080`, `localhost:3001`)
- ✅ All necessary HTTP methods (PUT for uploads, GET for downloads, etc.)
- ✅ All headers (needed for authentication and file metadata)

## ⏱️ Wait Time
- CORS changes typically take **5-10 minutes** to propagate
- You may need to clear your browser cache or use incognito mode for testing

## 🧪 Test the Fix

After waiting 5-10 minutes:

1. **Go to your app**: https://fg.feniix-hq.net
2. **Try uploading a photo**
3. **Check browser console** - you should no longer see CORS errors
4. **Upload should complete successfully**

## 🚨 If It Still Doesn't Work

### Check Domain Spelling
Make sure `https://fg.feniix-hq.net` is spelled exactly right in the CORS configuration.

### Try Wildcard (Temporary)
For testing, you can temporarily use `"*"` as the allowed origin:
```json
"AllowedOrigins": ["*"]
```
**⚠️ Warning**: Only use this for testing, not production!

### Clear Browser Cache
- Use incognito/private browsing mode
- Or clear your browser cache completely

### Check Network Tab
1. Open browser Developer Tools
2. Go to Network tab
3. Try uploading a file
4. Look for the R2 upload request - it should succeed (status 200)

## 📞 Need Help?

If you're still having issues:
1. Take a screenshot of the CORS configuration in Cloudflare
2. Check the browser console for any remaining errors
3. Try uploading a small test file first

## ✅ Success Indicators

You'll know it's working when:
- ✅ No CORS errors in browser console
- ✅ File uploads complete successfully  
- ✅ You see "Upload successful" messages
- ✅ Photos appear in your gallery

---

**Expected time to fix**: 5 minutes + 5-10 minutes wait time for propagation 