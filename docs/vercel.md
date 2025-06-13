# Vercel Deployment Guide

*Last updated: June 12, 2025*

This guide provides step-by-step instructions for deploying the Family Gallery application to Vercel.

## Prerequisites

Before deploying to Vercel, ensure you have:

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be pushed to a GitHub repository
3. **Environment Variables**: All required environment variables configured (see below)
4. **Cloudflare R2**: Storage bucket set up and configured
5. **Clerk Authentication**: Clerk project configured with production keys

## Step 1: Prepare Your Repository

### 1.1 Ensure Clean Build
```bash
# Clean any local build artifacts
yarn clean

# Install dependencies
yarn install

# Test local build
yarn build
```

### 1.2 Verify Environment Configuration
Ensure your `.env.example` file is up to date and contains all necessary variables.

## Step 2: Set Up Vercel Project

### 2.1 Connect Repository
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository containing your Family Gallery code

### 2.2 Configure Build Settings
Vercel should automatically detect this as a Next.js project. Verify these settings:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (leave empty if deploying from root)
- **Build Command**: `yarn build` (should be auto-detected)
- **Output Directory**: `.next` (should be auto-detected)
- **Install Command**: `yarn install` (should be auto-detected)
- **Development Command**: `yarn dev`

### 2.3 Node.js Version
Ensure Vercel uses the correct Node.js version by adding to your `package.json`:
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Step 3: Configure Environment Variables

### 3.1 Production Environment Variables
In your Vercel project settings, add these environment variables:

#### Clerk Authentication
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

#### Cloudflare R2 Storage
```
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-custom-domain.r2.dev
```

#### Admin Configuration
```
ADMIN_EMAILS=admin@yourdomain.com,another-admin@yourdomain.com
```

#### Upload Configuration (Optional)
```
UPLOAD_MAX_PHOTO_SIZE_MB=50
UPLOAD_MAX_VIDEO_SIZE_MB=200
UPLOAD_TIMEOUT_SECONDS=900
```

#### Gallery Configuration (Optional)
```
GALLERY_ITEMS_PER_PAGE=20
GALLERY_MIN_YEAR=1970
GALLERY_MAX_YEAR_OFFSET=10
```

#### R2 Configuration (Optional)
```
R2_PRESIGNED_URL_EXPIRATION=900
```

### 3.2 Environment Variable Setup in Vercel
1. Go to your project in Vercel Dashboard
2. Navigate to "Settings" → "Environment Variables"
3. Add each variable with appropriate values for:
   - **Production** (required)
   - **Preview** (recommended - use staging/test values)
   - **Development** (optional - for Vercel dev environment)

## Step 4: Configure Clerk for Production

### 4.1 Update Clerk Settings
1. Log in to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your project
3. Go to "Domains" and add your Vercel domain:
   - `your-project.vercel.app`
   - Your custom domain (if using one)

### 4.2 OAuth Configuration
If using Google/Facebook OAuth:
1. Update OAuth redirect URLs in your OAuth provider settings
2. Add production domains to allowed origins
3. Update Clerk OAuth settings with production credentials

## Step 5: Configure Cloudflare R2 for Production

### 5.1 CORS Configuration
Ensure your R2 bucket has proper CORS settings for your Vercel domain:

```json
[
  {
    "AllowedOrigins": [
      "https://your-project.vercel.app",
      "https://your-custom-domain.com"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### 5.2 Custom Domain (Recommended)
Set up a custom domain for your R2 bucket to avoid CORS issues:
1. In Cloudflare Dashboard, go to R2 → your bucket
2. Settings → Custom Domains
3. Add your domain (e.g., `media.yourdomain.com`)
4. Update `R2_PUBLIC_URL` environment variable

## Step 6: Update Next.js Configuration

### 6.1 Update Image Domains
Update `next.config.ts` to include your production R2 domain:

```typescript
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-custom-domain.r2.dev', // or your custom domain
        port: '',
        pathname: '/**',
      },
    ],
  },
  // ... rest of config
};
```

## Step 7: Deploy

### 7.1 Initial Deployment
1. Click "Deploy" in Vercel Dashboard
2. Vercel will automatically build and deploy your application
3. Monitor the build logs for any errors

### 7.2 Verify Deployment
After deployment:
1. Visit your Vercel URL
2. Test authentication flow
3. Test file upload functionality
4. Verify gallery displays correctly
5. Test admin features (if applicable)

## Step 8: Custom Domain (Optional)

### 8.1 Add Custom Domain
1. In Vercel Dashboard, go to "Settings" → "Domains"
2. Add your custom domain
3. Configure DNS records as instructed by Vercel

### 8.2 Update Configurations
After adding custom domain:
1. Update Clerk domain settings
2. Update R2 CORS configuration
3. Update any hardcoded URLs in your application

## Step 9: Monitoring and Maintenance

### 9.1 Set Up Monitoring
1. Enable Vercel Analytics (optional)
2. Set up error monitoring (Sentry, etc.)
3. Configure uptime monitoring

### 9.2 Automatic Deployments
Vercel automatically deploys when you push to your main branch. To configure:
1. Go to "Settings" → "Git"
2. Configure production branch (usually `main` or `master`)
3. Set up preview deployments for other branches

## Troubleshooting

### Common Issues

#### Build Failures
- Check Node.js version compatibility
- Verify all dependencies are in `package.json`
- Check for TypeScript errors: `yarn type-check`

#### Environment Variable Issues
- Ensure all required variables are set
- Check variable names match exactly (case-sensitive)
- Verify Clerk keys are for production environment

#### Image Loading Issues
- Verify R2 CORS configuration
- Check `next.config.ts` image domains
- Ensure R2_PUBLIC_URL is correct

#### Authentication Issues
- Verify Clerk domain configuration
- Check OAuth redirect URLs
- Ensure production keys are being used

### Getting Help
- Check Vercel deployment logs
- Review Next.js build output
- Check browser console for client-side errors
- Verify network requests in browser dev tools

## Security Considerations

1. **Environment Variables**: Never commit production secrets to git
2. **Admin Emails**: Use `ADMIN_EMAILS` (server-side) instead of `NEXT_PUBLIC_ADMIN_EMAILS`
3. **R2 Access**: Use least-privilege access keys
4. **CORS**: Configure restrictive CORS policies
5. **Clerk**: Use production-grade Clerk plan for production

## Performance Optimization

1. **Image Optimization**: Leverage Next.js Image component
2. **Caching**: Configure appropriate cache headers
3. **CDN**: Use Vercel's global CDN
4. **Bundle Analysis**: Use `@next/bundle-analyzer` to optimize bundle size

## Backup and Recovery

1. **Database**: Regularly backup R2 bucket contents
2. **Configuration**: Keep environment variables documented
3. **Code**: Ensure git repository is backed up
4. **Monitoring**: Set up alerts for application health

---

*For additional support, refer to the [Vercel Documentation](https://vercel.com/docs) or the project's other documentation files.* 