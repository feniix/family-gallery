# Fix API Route 405 Error - Media Tags

## The Error
```
POST https://fg.feniix-hq.net/api/media/tags 405 (Method Not Allowed)
{"time":"2025-06-13T23:30:58.767Z","level":"error","msg":"Error creating tag","module":"API","tag":"bernabe","error":"Unexpected end of JSON input"}
```

## 🔧 Root Cause

The error shows the request is being made to `https://fg.feniix-hq.net/api/media/tags` instead of your application's domain. This suggests a configuration issue with the base URL.

## 🎯 **Immediate Fix**

### Step 1: Check Environment Variables

The issue is likely in how the application determines its base URL. Check your Vercel environment variables:

```env
# Add this to your Vercel environment variables
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

### Step 2: Update API Calls

The error suggests the code is using a hardcoded or incorrect base URL. Let me check where this is happening and fix it.

## 🔍 **Diagnosis**

The API route `/api/media/tags` exists and supports POST method, but the request is going to the wrong domain (`fg.feniix-hq.net` instead of your app's domain).

## ✅ **Solution**

### Option 1: Use Relative URLs (Recommended)

Update all API calls to use relative URLs instead of absolute URLs:

```javascript
// ❌ Wrong - absolute URL
fetch('https://fg.feniix-hq.net/api/media/tags', { ... })

// ✅ Correct - relative URL
fetch('/api/media/tags', { ... })
```

### Option 2: Fix Base URL Configuration

If using absolute URLs, ensure the correct base URL is configured:

```javascript
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
fetch(`${baseUrl}/api/media/tags`, { ... })
```

## 🔧 **Quick Test**

To verify the API route works:

1. **Open browser dev tools**
2. **Go to your app**: `https://your-project.vercel.app`
3. **In console, run**:
```javascript
fetch('/api/media/tags?action=list')
  .then(r => r.json())
  .then(console.log)
```

This should return your tags list without a 405 error.

## 🚨 **Common Causes**

1. **Wrong Domain**: API calls going to `fg.feniix-hq.net` instead of your app
2. **CORS Issues**: Cross-origin requests being blocked
3. **Environment Variables**: Missing or incorrect `NEXT_PUBLIC_APP_URL`
4. **Hardcoded URLs**: Code using absolute URLs instead of relative ones

---

**The fix is to ensure all API calls use relative URLs or the correct base URL for your application.** 