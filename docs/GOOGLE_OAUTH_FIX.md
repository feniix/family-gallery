# Fix Google OAuth "Missing client_id" Error

This error occurs when Google OAuth is not properly configured in Clerk for your production domain.

## The Error
```
Access blocked: Authorization Error
feniix@gmail.com
Missing required parameter: client_id
Error 400: invalid_request
```

This happens on `accounts.google.com` when trying to sign in with Google.

## 🔧 Step-by-Step Fix

### 1. Add Your Production Domain to Clerk

**CRITICAL**: This is the most common cause of the error.

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Select your Family Gallery application
3. Navigate to **Configure** → **Domains**
4. Click **"Add domain"**
5. Add your production domain: `https://your-project.vercel.app`
6. Click **Save**

### 2. Configure Google OAuth in Clerk Dashboard

1. In Clerk Dashboard, go to **Configure** → **SSO Connections**
2. Find **Google** and click **Configure**
3. Ensure the following settings:

#### Required Settings:
- **Status**: Enabled ✅
- **Client ID**: Your Google OAuth Client ID
- **Client Secret**: Your Google OAuth Client Secret

#### Redirect URIs (CRITICAL):
Make sure these are configured in your Google Cloud Console:
```
https://your-project.vercel.app/api/auth/callback/google
https://accounts.clerk.dev/v1/oauth_callback
```

### 3. Update Google Cloud Console

This is where the `client_id` error originates:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID
4. Click **Edit**

#### Update Authorized JavaScript Origins:
```
https://your-project.vercel.app
https://accounts.clerk.dev
```

#### Update Authorized Redirect URIs:
```
https://your-project.vercel.app/api/auth/callback/google
https://accounts.clerk.dev/v1/oauth_callback
```

### 4. Verify Environment Variables

Ensure these are set in Vercel:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuZmVuaWl4LWhxLm5ldCQ
CLERK_SECRET_KEY=sk_live_O2hblxLap1dq2cJPiPqL4mi6SdXLkayuXXudNHmf6y
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### 5. Redeploy Your Application

After making these changes:
```bash
vercel --prod
```

## 🔍 Troubleshooting

### Check 1: Verify Domain Configuration
Visit your Clerk Dashboard and ensure your production domain is listed under **Configure** → **Domains**.

### Check 2: Test Google OAuth Configuration
1. Go to your sign-in page: `https://your-project.vercel.app/sign-in`
2. Click "Continue with Google"
3. Check if you're redirected to Google properly

### Check 3: Inspect Network Requests
1. Open browser Developer Tools
2. Go to Network tab
3. Try signing in with Google
4. Look for failed requests to `accounts.google.com`

### Check 4: Verify Google Cloud Console Settings
Ensure your Google OAuth app has:
- **Application type**: Web application
- **Authorized JavaScript origins**: Include your production domain
- **Authorized redirect URIs**: Include Clerk callback URLs

## 🚨 Common Mistakes

1. **Wrong Domain Format**: 
   - ❌ `your-project.vercel.app` (missing https://)
   - ✅ `https://your-project.vercel.app`

2. **Missing Clerk Domain**: 
   - Must add production domain to Clerk Dashboard
   - Not just Google Cloud Console

3. **Incorrect Redirect URIs**:
   - Must include both your app and Clerk callback URLs
   - Case-sensitive and must match exactly

4. **Using Development Keys in Production**:
   - Ensure you're using `pk_live_*` and `sk_live_*` keys

## 🔄 Quick Fix Checklist

- [ ] Production domain added to Clerk Dashboard
- [ ] Google OAuth enabled in Clerk
- [ ] Google Cloud Console redirect URIs updated
- [ ] Google Cloud Console JavaScript origins updated
- [ ] Production environment variables set in Vercel
- [ ] Application redeployed

## 🆘 If Still Not Working

### Option 1: Disable Google OAuth Temporarily
1. In Clerk Dashboard → Configure → SSO Connections
2. Disable Google temporarily
3. Test with email/password authentication
4. Re-enable Google after fixing configuration

### Option 2: Create New Google OAuth App
1. Create a new OAuth 2.0 Client ID in Google Cloud Console
2. Configure it specifically for production
3. Update Clerk with new credentials

### Option 3: Check Clerk Logs
1. In Clerk Dashboard → Monitoring → Logs
2. Look for authentication errors
3. Check for domain mismatch errors

## 📞 Getting Help

If the error persists:
1. Check Clerk Dashboard logs for specific error messages
2. Verify all URLs match exactly (no trailing slashes, correct protocols)
3. Test with a different browser or incognito mode
4. Contact Clerk support with your application ID

---

**Remember**: Changes to Google OAuth configuration can take a few minutes to propagate. Wait 5-10 minutes after making changes before testing. 