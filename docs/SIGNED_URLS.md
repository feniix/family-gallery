# Direct R2 Serving with Signed URLs

## Overview

The Family Gallery now always serves images directly from Cloudflare R2 using signed URLs, providing:

- **Better Performance**: Direct connection from client to R2  
- **Reduced Server Load**: No proxy layer consuming server resources  
- **Lower Bandwidth Costs**: Images served directly from R2  
- **Better Scalability**: Server resources freed up for other tasks  
- **Improved Caching**: Better CDN and browser caching behavior  

## How It Works

1. **Client requests image**: Frontend component needs to display an image
2. **Get signed URL**: Component calls `/api/media/signed-url/[id]` endpoint
3. **Authentication check**: Server verifies user has access to the media
4. **Generate signed URL**: Server creates a time-limited signed URL for direct R2 access
5. **Cache and serve**: Signed URL is cached and used directly by the browser
6. **Auto-refresh**: URLs are automatically refreshed before expiration

## Configuration

### CORS Configuration

Since images are served directly from R2, you need to configure CORS on your R2 bucket.

#### Option A: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to R2 Object Storage → Your Bucket → Settings
3. Add CORS policy:

```json
[
  {
    "AllowedOrigins": [
      "https://your-domain.com",
      "https://*.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

#### Option B: Using Custom Domain (Recommended)

If you have a custom domain configured for your R2 bucket (e.g., `images.your-domain.com`), CORS configuration may not be needed as custom domains often bypass CORS restrictions.

### Next.js Image Configuration

Ensure your `next.config.ts` includes your R2 domain:

```typescript
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-account-id.r2.cloudflarestorage.com',
        port: '',
        pathname: '/**',
      },
      // If using custom domain:
      {
        protocol: 'https',
        hostname: 'images.your-domain.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};
```

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `R2_PRESIGNED_URL_EXPIRATION` | `900` | Default expiration time in seconds |

### Automatic Expiration Management

The system automatically manages URL expiration:

- **Thumbnails**: 1 hour expiration (3600 seconds)
- **Full Images**: 2 hours expiration (7200 seconds) 
- **Lightbox Images**: 24 hours expiration (86400 seconds)
- **Auto-refresh**: URLs are refreshed 5 minutes before expiration
- **Caching**: Signed URLs are cached in memory to reduce API calls
- **Batch Loading**: Multiple URLs can be requested simultaneously for better performance

## Performance Features

### Smart Preloading

The signed URL system includes intelligent preloading:

- **Intersection Observer**: Images load only when entering viewport
- **Priority Loading**: Above-the-fold images load immediately
- **Batch Requests**: Multiple signed URLs requested together
- **Cache Management**: Automatic cleanup of expired URLs

### Error Handling

Robust error handling ensures reliability:

- **Fallback URLs**: Automatic retry with different parameters
- **Graceful Degradation**: Error states with retry options
- **Logging**: Comprehensive error tracking and debugging

## Migration Notes

### Changes Made

The codebase has been simplified to always use signed URLs:

1. **Removed proxy routes**: `/api/media/download/*` endpoints deleted
2. **Simplified components**: Removed conditional logic between proxy and signed URL modes
3. **Consolidated code**: Single set of components instead of separate proxy/signed versions
4. **Environment variables**: No longer need `NEXT_PUBLIC_R2_USE_SIGNED_URLS` or `R2_USE_SIGNED_URLS`

### Backward Compatibility

- **API endpoints**: Signed URL endpoints remain unchanged
- **Component interfaces**: Same props and behavior
- **Database**: No changes to media metadata structure

## FAQ

### Q: Do I need to change my existing code?

**A**: No. The component interfaces remain the same, only the internal implementation changed.

### Q: What happens to existing cached images?

**A**: Browser-cached images continue to work. New requests will use signed URLs.

### Q: Can I use signed URLs with a CDN?

**A**: Yes, but ensure your CDN is configured to handle the signed URL parameters correctly.

### Q: Are there any costs implications?

**A**: Signed URLs reduce server bandwidth costs but may slightly increase R2 API calls. Overall cost should decrease due to reduced server resources.

### Q: How do I monitor signed URL usage?

**A**: Check your application logs for signed URL generation events and R2 access logs for direct access patterns. 