# Clerk Configuration for Production Deployment

This guide helps you fix the "Missing required parameter: client_id" error and properly configure Clerk for production.

## The Error

```
Access blocked: Authorization Error
Missing required parameter: client_id
Error 400: invalid_request
```

This error occurs when Clerk is not properly configured for your production domain.

## 🔧 Quick Fix Steps

### 1. Add Your Production Domain to Clerk

1. **Login to Clerk Dashboard**: Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. **Select Your Application**: Choose your Family Gallery application
3. **Navigate to Domains**: Go to "Configure" → "Domains"
4. **Add Production Domains**:
   ```
   https://your-project.vercel.app
   https://your-custom-domain.com (if you have one)
   ```

### 2. Update Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and ensure these are set:

```env
# Required Clerk Variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuZmVuaWl4LWhxLm5ldCQ
CLERK_SECRET_KEY=sk_live_O2hblxLap1dq2cJPiPqL4mi6SdXLkayuXXudNHmf6y
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Webhook Secret (get from Clerk Dashboard)
CLERK_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

### 3. Configure Clerk Webhooks

1. **In Clerk Dashboard**: Go to "Configure" → "Webhooks"
2. **Add Endpoint**: `https://your-project.vercel.app/api/webhooks/clerk`
3. **Select Events**: 
   - `user.created`
   - `user.updated`
4. **Copy Webhook Secret**: Add it to `CLERK_WEBHOOK_SECRET` in Vercel

### 4. Redeploy Your Application

After making these changes, redeploy your application:
```bash
# If using the deployment script
./scripts/deploy.sh production

# Or manually
vercel --prod
```

## 📋 Complete Configuration Checklist

### Clerk Dashboard Configuration

- [ ] **Application Name**: "Family Gallery" (or your preferred name)
- [ ] **Application Type**: Regular web application
- [ ] **Domains Added**:
  - [ ] `https://your-project.vercel.app`
  - [ ] `https://your-custom-domain.com` (if applicable)
  - [ ] `http://localhost:8080` (for development)

### Environment Configuration

- [ ] **Vercel Environment Variables Set**:
  - [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - [ ] `CLERK_SECRET_KEY`
  - [ ] `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
  - [ ] `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
  - [ ] `CLERK_WEBHOOK_SECRET`

### OAuth Providers (if using)

- [ ] **Google OAuth**:
  - [ ] Client ID and Secret configured in Clerk
  - [ ] Authorized redirect URIs include your production domain
  - [ ] JavaScript origins include your production domain

- [ ] **Facebook OAuth**:
  - [ ] App ID and Secret configured in Clerk
  - [ ] Valid OAuth redirect URIs include your production domain

### Webhook Configuration

- [ ] **Webhook Endpoint**: `https://your-domain.com/api/webhooks/clerk`
- [ ] **Events Subscribed**: `user.created`, `user.updated`
- [ ] **Webhook Secret**: Added to environment variables

## 🔍 Troubleshooting

### 1. Verify Environment Variables

Check if your environment variables are properly loaded:

```bash
# Run the health check script
./scripts/check-deployment.sh https://your-project.vercel.app
```

### 2. Check Clerk Configuration

Visit your sign-in page and check the browser console for errors:
```
https://your-project.vercel.app/sign-in
```

Common errors:
- `Invalid publishable key`: Wrong or missing publishable key
- `Domain not allowed`: Domain not added to Clerk dashboard

### 3. Test Authentication Flow

1. **Visit Homepage**: Should redirect to sign-in if not authenticated
2. **Sign In**: Should work without errors
3. **Check User Creation**: New users should appear in your database
4. **Admin Access**: Admin users should have proper access

### 4. Verify Webhook Delivery

In Clerk Dashboard → Webhooks → Your Endpoint:
- Check "Recent Requests" for successful deliveries
- Look for 200 status codes
- If failing, check Vercel function logs

## 🛠️ Advanced Configuration

### Custom Domain Setup

If using a custom domain:

1. **Add Domain in Vercel**: Settings → Domains
2. **Update DNS Records**: As instructed by Vercel
3. **Add Domain to Clerk**: Configure → Domains
4. **Update Environment Variables**:
   ```env
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   ```

### Development vs Production Keys

Ensure you're using the correct keys:

- **Development**: Keys starting with `pk_test_` and `sk_test_`
- **Production**: Keys starting with `pk_live_` and `sk_live_`

### Environment-Specific Configuration

For multiple environments:

```env
# Production
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Preview/Staging
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

## 🚨 Common Mistakes

1. **Wrong Keys**: Using test keys in production or vice versa
2. **Missing Domain**: Not adding production domain to Clerk
3. **HTTP vs HTTPS**: Mixing protocols in domain configuration
4. **Webhook Secret**: Not setting the webhook secret environment variable
5. **Caching**: Old environment variables cached in Vercel

## 🔐 Security Best Practices

1. **Rotate Secrets**: Regularly rotate your Clerk keys
2. **Environment Separation**: Use different Clerk applications for dev/prod
3. **Webhook Security**: Always verify webhook signatures
4. **Domain Validation**: Only add necessary domains to Clerk
5. **Access Logging**: Monitor authentication events

## 📞 Getting Help

If you're still experiencing issues:

1. **Check Vercel Build Logs**: Look for environment variable errors
2. **Check Browser Console**: Look for Clerk-specific errors
3. **Check Network Tab**: Look for failed authentication requests
4. **Clerk Support**: Contact Clerk support with your application ID
5. **Vercel Support**: Contact Vercel if deployment issues persist

## 🔄 Quick Recovery

If authentication is completely broken:

1. **Revert to Development Keys**: Temporarily use test keys
2. **Check All Environment Variables**: Ensure nothing is missing
3. **Clear Vercel Cache**: Redeploy with fresh environment
4. **Test Locally**: Ensure it works in development first
5. **Gradual Rollout**: Test with preview deployments first

---

**Remember**: After any Clerk configuration changes, you must redeploy your application for changes to take effect. 