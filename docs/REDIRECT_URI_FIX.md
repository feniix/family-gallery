# Fix Google OAuth "redirect_uri_mismatch" Error

## The Error
```
Error 400: redirect_uri_mismatch
No puedes acceder a esta app porque no cumple con la política OAuth 2.0 de Google.
Request details: redirect_uri=https://clerk.feniix-hq.net/v1/oauth_callback
```

This error occurs because your Google Cloud Console doesn't have the correct Clerk redirect URI registered.

## 🔧 **IMMEDIATE FIX**

### Step 1: Update Google Cloud Console

1. **Go to [Google Cloud Console](https://console.cloud.google.com)**
2. **Navigate to**: APIs & Services → Credentials
3. **Find your OAuth 2.0 Client ID**
4. **Click Edit**

### Step 2: Add the Correct Redirect URIs

**Add these EXACT URIs to "Authorized redirect URIs"**:

```
https://clerk.feniix-hq.net/v1/oauth_callback
https://your-project.vercel.app/api/auth/callback/google
```

**IMPORTANT**: The error shows your Clerk instance uses `clerk.feniix-hq.net`, not the standard `accounts.clerk.dev`.

### Step 3: Add Authorized JavaScript Origins

**Add these to "Authorized JavaScript origins"**:

```
https://your-project.vercel.app
https://clerk.feniix-hq.net
```

### Step 4: Save and Wait

1. **Click "Save"** in Google Cloud Console
2. **Wait 5-10 minutes** for changes to propagate
3. **Test again**

## 🎯 **Why This Happened**

Your Clerk application is using a custom domain (`clerk.feniix-hq.net`) instead of the default Clerk domain. This is common for:
- Custom Clerk configurations
- Enterprise Clerk accounts
- Specific regional setups

## ✅ **Complete Configuration**

Your Google OAuth app should have:

### Authorized JavaScript Origins:
```
https://your-project.vercel.app
https://clerk.feniix-hq.net
http://localhost:8080
```

### Authorized Redirect URIs:
```
https://clerk.feniix-hq.net/v1/oauth_callback
https://your-project.vercel.app/api/auth/callback/google
http://localhost:8080/api/auth/callback/google
```

## 🔍 **Verification Steps**

After making the changes:

1. **Wait 5-10 minutes** for Google's changes to propagate
2. **Clear your browser cache** or use incognito mode
3. **Visit**: `https://your-project.vercel.app/sign-in`
4. **Click "Continue with Google"**
5. **Should redirect properly** without the redirect_uri_mismatch error

## 🚨 **Common Mistakes**

1. **Wrong Domain**: Using `accounts.clerk.dev` instead of `clerk.feniix-hq.net`
2. **Missing Protocol**: Forgetting `https://` prefix
3. **Typos**: Any character difference will cause the error
4. **Case Sensitivity**: URIs are case-sensitive

## 🔄 **If Still Not Working**

1. **Double-check the exact URI** from the error message
2. **Copy-paste** the URI exactly: `https://clerk.feniix-hq.net/v1/oauth_callback`
3. **Check for trailing slashes** or extra characters
4. **Try in incognito mode** to avoid cache issues

## 📞 **Quick Test**

You can test if the URI is correctly configured by visiting:
```
https://console.cloud.google.com/apis/credentials
```

And verifying that `https://clerk.feniix-hq.net/v1/oauth_callback` appears in your OAuth client's redirect URIs list.

---

**This should fix your Google OAuth issue immediately once the redirect URI is added to Google Cloud Console.** 