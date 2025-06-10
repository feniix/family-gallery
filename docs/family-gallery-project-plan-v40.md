# Family Gallery Project Plan

## Implementation Status

**Current Stage**: 2.2 - EXIF Processing & Metadata ✅ **COMPLETED**

### Completed Stages:
- **Stage 1.1**: Next.js project foundation with TypeScript and Tailwind CSS ✅
- **Stage 1.2**: Authentication integration with Clerk (Google/Facebook OAuth) ✅
- **Stage 1.2**: Basic user role system (admin/regular) ✅
- **Stage 1.2**: Protected routes and middleware ✅
- **Stage 1.2**: Sign-in/sign-up pages ✅
- **Stage 1.2**: Webhook handler for user creation ✅
- **Stage 1.3**: R2 client configuration and file management ✅
- **Stage 1.3**: JSON database operations with atomic locking ✅
- **Stage 1.3**: Presigned URL generation for secure uploads ✅
- **Stage 1.3**: Upload queue system for concurrent requests ✅
- **Stage 1.3**: API routes for media metadata operations ✅
- **Stage 2.1**: Admin upload interface with drag-and-drop ✅
- **Stage 2.1**: Multi-file upload support (up to 50 files, 50MB each) ✅
- **Stage 2.1**: Upload progress tracking and error handling ✅
- **Stage 2.1**: Admin navigation and access control ✅
- **Stage 2.1**: File validation and retry functionality ✅
- **Stage 2.2**: EXIF metadata extraction and processing ✅
- **Stage 2.2**: Comprehensive date handling with fallback strategies ✅
- **Stage 2.2**: File duplicate detection using SHA-256 hashing ✅
- **Stage 2.2**: Smart file naming and path generation ✅
- **Stage 2.2**: Enhanced metadata validation and sanitization ✅

### Next Up:
- **Stage 2.3**: Video Support & Thumbnails

### Stage 2.1 Implementation Details:
- **Upload Interface**: Complete admin upload page at `/admin/upload` with comprehensive statistics dashboard
- **Drag-and-Drop**: React-dropzone integration with visual feedback and file validation
- **Multi-file Support**: Upload queue management supporting up to 50 files simultaneously
- **Progress Tracking**: Real-time upload progress with status badges (pending, uploading, processing, completed, error)
- **File Validation**: Type and size validation for images (JPG, PNG, GIF, WebP) and videos (MP4, MOV, AVI)
- **Error Handling**: User-friendly error messages with retry functionality for failed uploads
- **Admin Controls**: Clear completed uploads, retry failed uploads, remove files from queue
- **Navigation**: Integrated header component with admin-only sections and mobile responsiveness
- **Access Control**: Proper admin role checking with redirects for unauthorized users

### Stage 2.2 Implementation Details:
- **EXIF Extraction**: Comprehensive EXIF metadata extraction using exifr library with 40+ data fields
- **Date Processing**: Multi-strategy date extraction with fallbacks (EXIF → filename → file creation → upload time)
- **GPS Handling**: GPS coordinate extraction and validation with timezone estimation
- **File Hashing**: SHA-256 content hashing for duplicate detection across years
- **Smart Naming**: Timestamp-based unique file naming with sanitization and conflict prevention
- **Media Detection**: Automatic detection of screenshots, edited photos, and WhatsApp media
- **Metadata Validation**: Input sanitization and comprehensive validation before storage
- **Camera Info**: Automatic camera identification from EXIF make/model fields
- **Timezone Support**: Basic timezone handling for GPS-based location data
- **Duplicate Prevention**: Cross-year duplicate checking with similarity scoring algorithm
- **File Organization**: Year/month-based path structure for efficient storage organization
- **WhatsApp Support**: Special handling for WhatsApp filename patterns and metadata preservation

## Project Overview

A cost-effective family photo and video gallery web application using Vercel hosting and Cloudflare R2 storage, designed for ~30 family members with no high availability requirements.

## Technical Stack

### Core Infrastructure

- **Frontend**: Next.js 15.3.3 (Latest stable)
- **React**: 19.1
- **Hosting**: Vercel (free tier)
- **Storage**: Cloudflare R2 (free egress)
- **Database**: JSON files in R2
- **Authentication**: Clerk (free up to 10K users)
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Node.js**: 22.16 LTS

### Version Check Commands

```bash
# Check latest versions before starting
npm view next version
npm view react version
npm view @aws-sdk/client-s3 version
npm view tailwindcss version
npm view typescript version

# Or use npx to see all available versions
npx npm-check-updates
```

### Recommended Dependencies (Enhanced)

```json
{
  "dependencies": {
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "@clerk/nextjs": "latest",
    "@aws-sdk/client-s3": "latest",
    "@aws-sdk/s3-request-presigner": "latest",
    "tailwindcss": "latest",
    
    // Shadcn/ui dependencies (auto-installed when adding components)
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-tabs": "latest",
    "@radix-ui/react-aspect-ratio": "latest",
    "@radix-ui/react-dropdown-menu": "latest",
    "@radix-ui/react-scroll-area": "latest",
    "@radix-ui/react-toast": "latest",
    
    // Media handling (enhanced)
    "exifr": "^7.1.3",                        // EXIF extraction
    "react-photo-album": "^2.x",              // Photo grid layouts
    "photoswipe": "^5.x",                     // Lightbox viewer
    "react-intersection-observer": "^9.x",     // Infinite scroll
    "@uppy/core": "^3.x",                     // Upload management
    "@uppy/react": "^3.x",                    // Upload UI components
    "@uppy/drag-drop": "^3.x",                // Drag-drop uploads
    "@uppy/progress-bar": "^3.x",             // Upload progress
    
    // Video support
    "video.js": "^8.x",                       // Video player
    "@videojs/react": "^1.x",                 // React wrapper
    
    // Enhanced utilities
    "date-fns": "latest",                     // Date manipulation
    "date-fns-tz": "latest",                  // Timezone handling
    "crypto-js": "latest",                    // Hashing for duplicates
    "node-cache": "latest",                   // Distributed locking
    "clsx": "latest",                         // ClassName utilities
    "tailwind-merge": "latest",               // Merge Tailwind classes
    "class-variance-authority": "latest",     // Component variants
    
    // Production monitoring
    "@sentry/nextjs": "latest"                // Error tracking
  }
}
```

Note: Always verify latest stable versions at:

- Next.js: <https://nextjs.org/blog>
- React: <https://react.dev/blog>
- AWS SDK: <https://github.com/aws/aws-sdk-js-v3/releases>
- Check package.json after create-next-app for actual versions

### Key Features

- Google/Facebook OAuth login
- Admin and regular user roles
- Photo and video support from day 1
- EXIF-based timeline organization
- Subject tagging (Rufina, Bernabe, expandable)
- Client-side video thumbnail generation (server-side ready)

## Architecture Design

### Storage Structure (R2)

```bash
/originals/
  ├── 2024/
  │   ├── 01/[timestamp]_[filename]
  │   └── 12/[timestamp]_[filename]
  └── 2025/
/thumbnails/
  ├── 2024/
  │   └── 01/[timestamp]_[filename]_thumb.jpg
/web-optimized/
  └── [future - for processed images]
/data/
  ├── users.json
  ├── media/
  │   ├── 2024.json
  │   └── 2025.json
  └── config.json (subjects, tags)
```

### JSON Schema Design

#### users.json

```json
{
  "users": {
    "user-id-1": {
      "email": "admin@family.com",
      "role": "admin",
      "name": "Admin User",
      "provider": "google",
      "created": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### media/2024.json

```json
{
  "media": [
    {
      "id": "unique-media-id",
      "filename": "1704815400_original-name.jpg",
      "originalFilename": "original-name.jpg",
      "path": "2024/01/1704815400_original-name.jpg",
      "type": "photo|video",
      "uploadedBy": "user-id",
      "uploadedAt": "2024-01-15T10:30:00Z",
      "uploadSource": "web|whatsapp|email",
      "sourceMetadata": {
        "whatsappSender": "+1234567890",
        "caption": "Original message text"
      },
      "takenAt": "2024-01-14T15:45:00Z",
      "dateInfo": {
        "source": "exif|filename|file-creation|upload-time",
        "timezone": "UTC+5",
        "confidence": "high|medium|low"
      },
      "metadata": {
        "width": 4000,
        "height": 3000,
        "duration": null,
        "size": 4567890,
        "hash": "sha256-hash-for-duplicate-detection",
        "camera": "Apple iPhone 13",
        "exif": {
          "dateTimeOriginal": "2024-01-14T15:45:00Z",
          "make": "Apple",
          "model": "iPhone 13",
          "lens": "iPhone 13 back dual wide camera",
          "fNumber": 1.6,
          "exposureTime": "1/120s",
          "iso": 100,
          "focalLength": 26,
          "flash": "No Flash",
          "gps": {
            "latitude": 40.7128,
            "longitude": -74.0060,
            "altitude": 10
          }
        },
        "location": { "lat": 40.7128, "lng": -74.0060 }
      },
      "subjects": ["bernabe", "rufina"],
      "tags": ["birthday", "park"],
      "thumbnailPath": "thumbnails/2024/01/1704815400_original-name_thumb.jpg",
      "isScreenshot": false,
      "isEdited": false,
      "hasValidExif": true
    }
  ]
}
```

## Implementation Strategy

### Inspiration Sources & Libraries

#### Core Libraries to Use

1. **React Photo Album** - Modern responsive grid layouts
2. **PhotoSwipe** - Best-in-class lightbox with touch support
3. **Uppy** - Powerful upload management with progress tracking
4. **Video.js** - Reliable video playback
5. **exifr** - Fast EXIF data extraction

#### Code Inspiration Sources

1. **Immich** (<https://github.com/immich-app/immich>)
   - Timeline grouping logic: `web/src/lib/utils/timeline-util.ts`
   - Date section headers implementation

2. **Pigallery2** (<https://github.com/bpatrik/pigallery2>)
   - EXIF handling patterns
   - Thumbnail generation approach

3. **T3 Gallery** (<https://github.com/t3-oss/t3-gallery>)
   - Modern Next.js patterns
   - File upload flows

4. **PhotoPrism** (<https://github.com/photoprism/photoprism>)
   - Upload chunking strategies
   - Metadata extraction patterns

#### Architecture Patterns

- Search GitHub for "nextjs cloudflare r2" for R2 integration patterns
- Cloudflare Workers Gallery examples for presigned URLs
- Vercel's Next.js examples for image optimization

### WhatsApp Integration Architecture (Future)

To support WhatsApp auto-upload later, structure the project with:

1. **Upload Service Abstraction**:

```typescript
// services/upload/types.ts
interface UploadSource {
  type: 'web' | 'whatsapp' | 'email' | 'api'
  metadata: {
    sender?: string
    caption?: string
    timestamp: Date
  }
}

// services/upload/upload-service.ts
class UploadService {
  async processUpload(files: File[], source: UploadSource) {
    // Unified upload logic
  }
}
```

2. **Webhook-Ready API Routes**:

```typescript
// app/api/webhooks/whatsapp/route.ts (placeholder)
export async function POST(req: Request) {
  // Future: Handle WhatsApp Business API webhooks
}
```

3. **Queue-Ready Architecture**:

```typescript
// Consider structure that can later add:
// - Background job processing
// - Webhook endpoints
// - External API integrations
```

### Development Approach

1. Start with `create-next-app` base
2. Integrate React Photo Album for gallery grid
3. Add PhotoSwipe for image viewing
4. Implement Uppy for admin uploads
5. Adapt timeline logic from Immich
6. Use EXIF patterns from Pigallery2
7. Apply modern patterns from T3 Gallery

## Implementation Plan

### Phase 1: Foundation (Week 1)

- [x] **Stage 1.1** - Next.js project setup with TypeScript (COMPLETED)
- [x] **Stage 1.2** - Authentication integration (Google/Facebook OAuth) (COMPLETED)
- [x] **Stage 1.2** - Basic user role system (admin/regular) (COMPLETED)
- [ ] **Stage 1.3** - R2 bucket creation and configuration
- [ ] **Stage 1.3** - JSON file management utilities
- [ ] Vercel deployment pipeline

### Phase 2: Upload System (Week 2)

- [ ] Admin-only upload interface
- [ ] Drag-and-drop multi-file uploader
- [ ] Progress tracking per file
- [ ] Client-side EXIF extraction
- [ ] Client-side video thumbnail generation
- [ ] Direct to R2 upload with presigned URLs
- [ ] JSON metadata updates after upload

### Component Architecture with Shadcn/ui

#### Gallery Components Structure

```typescript
// app/components/gallery/photo-grid.tsx
import { Card } from "@/components/ui/card"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Skeleton } from "@/components/ui/skeleton"

// app/components/gallery/lightbox.tsx  
import { Dialog, DialogContent } from "@/components/ui/dialog"

// app/components/gallery/timeline-nav.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

// app/components/admin/upload-zone.tsx
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// app/components/layout/header.tsx
import { DropdownMenu } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
```

#### Key UI Patterns

- Photo cards with hover effects using Card + AspectRatio
- Lightbox using Dialog for fullscreen viewing
- Timeline navigation with Tabs for year/month selection
- Upload progress with Toast notifications
- Loading states with Skeleton components
- User menu with DropdownMenu

### Phase 3: Gallery Interface (Week 3)

- [ ] Timeline view (chronological by EXIF date)
- [ ] Hybrid infinite scroll implementation:
  - [ ] Intersection Observer for lazy loading
  - [ ] Sticky date headers (month/year)
  - [ ] Jump-to-date navigation bar
  - [ ] Floating action buttons (back to top, filters)
  - [ ] URL state management for position
- [ ] Subject filtering (Rufina/Bernabe)
- [ ] Lightbox for photo viewing
- [ ] Video player integration
- [ ] Responsive grid layout
- [ ] Loading states with skeleton screens

### Phase 4: Enhanced Features (Week 4)

- [ ] Tag management system
- [ ] Search functionality
- [ ] Missing date handling UI
- [ ] Basic admin dashboard
- [ ] Download options
- [ ] Share links (optional)

### Future Enhancements

- [ ] Server-side video processing option
- [ ] Bulk metadata editing
- [ ] AI-powered auto-tagging
- [ ] Album/collection creation
- [ ] Comment system
- [ ] PWA (Progressive Web App) support
- [ ] Share links for external users
- [ ] **WhatsApp Auto-Upload Integration**
  - Receive photos/videos via WhatsApp message
  - Support single/multiple media + combinations
  - Auto-categorize by sender
  - Extract captions as descriptions

## Critical Concerns Addressed

### JSON Database Reliability
- **File Locking**: Distributed locking mechanism prevents concurrent write corruption
- **Atomic Operations**: Upload transactions ensure all-or-nothing operations
- **Upload Queue**: Serializes concurrent uploads to prevent race conditions
- **Retry Logic**: Exponential backoff for failed operations
- **Migration Ready**: Architecture supports future SQLite migration

### Authorization Security
- **Server-Side Validation**: All API routes validate admin roles server-side
- **Webhook Security**: Clerk webhook signatures verified
- **Role Management**: Secure role changes and promotion/demotion
- **API Protection**: Rate limiting and request validation

### EXIF Edge Cases
- **Timezone Handling**: Proper timezone-aware date processing
- **Missing Dates**: Fallback strategies (file creation time, upload time)
- **Duplicate Detection**: Hash-based photo deduplication
- **WhatsApp Photos**: Preserve available metadata from messaging apps
- **Screenshots/Edits**: Proper categorization of non-camera photos

### Upload Failure Recovery
- **Transaction System**: Atomic upload operations with rollback
- **Orphaned File Cleanup**: Automatic detection and removal
- **Failure Scenarios**: Handle partial upload failures gracefully
- **Cost Monitoring**: Track R2 Class A operations and optimize

### Performance & Scalability
- **Virtual Scrolling**: Handle thousands of photos efficiently
- **Mobile Optimization**: Touch gestures and mobile-specific performance
- **Timeline Complexity**: URL state management and scroll position restoration
- **Caching Strategy**: Optimize image loading and reduce API calls

## Technical Implementation Details

### Authentication Flow

1. User visits site
2. Clerk shows sign-in UI with Google/Facebook/Microsoft options
3. After OAuth flow, user is created in Clerk
4. Webhook updates users.json with email and role
5. Admin emails are checked against predefined list
6. Session managed by Clerk (no custom code needed)

### Clerk Implementation

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/(.*)',
])

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/upload(.*)',
])

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect()
  
  // Admin route protection will check role from JSON
})

// Environment variables needed:
// NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
// CLERK_SECRET_KEY
// NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
// NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### Upload Process (Enhanced for Reliability)

1. Admin drags files to upload area
2. For each file (with atomic transaction system):
   - Extract EXIF/metadata client-side with edge case handling
   - Generate thumbnail (video: canvas extraction with browser compatibility)
   - Duplicate detection by hash comparison
   - Get presigned URL from API (15-minute expiration)
   - **Atomic Upload Transaction**:
     - Upload original to R2
     - Upload thumbnail to R2
     - Update year-based JSON file with file locking
     - All operations succeed or all rollback
3. Show progress and completion status
4. **Failure Recovery**: Automatic cleanup of orphaned files and retry logic

### Video Thumbnail Generation

```javascript
// Client-side approach (initial)
const generateVideoThumbnail = async (videoFile) => {
  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  
  video.src = URL.createObjectURL(videoFile);
  await video.load();
  
  // Seek to 10% or 2 seconds, whichever is less
  video.currentTime = Math.min(2, video.duration * 0.1);
  
  // Draw frame to canvas
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, 320, 240);
  
  // Convert to blob
  return canvas.toBlob(callback, 'image/jpeg', 0.8);
};

// Future: Server-side option flag
if (serverSideProcessing) {
  // Queue job for Lambda/Edge function
  await queueVideoProcessing(videoId);
}
```

### Performance Optimizations

- Cloudflare R2 URLs cached in browser
- Infinite scroll with intersection observer
- Thumbnail blurhash stored in JSON
- Service worker for offline viewing (future)

### Cost Projections

- **Storage**: ~$1.50/100GB/month (R2)
- **Bandwidth**: $0 (R2 free egress)
- **Hosting**: $0 (Vercel free tier)
- **Processing**: $0 (client-side)
- **Total**: <$5/month for typical family use

### Security Considerations (Enhanced)

- **Presigned URLs**: 15-minute expiration with IP restrictions
- **Authorization**: Server-side admin role validation on all API routes
- **Authentication**: Webhook signature verification for Clerk integration
- **Access Control**: No public access without authentication
- **API Security**: Rate limiting and request validation
- **Regular Security**: R2 access key rotation, security headers
- **Enhanced Download Prevention**:
  - Right-click context menu disabled
  - CSS `user-select: none` on images
  - Dev tools detection and warnings
  - Bulk download detection and rate limiting
  - Optional watermarking for sensitive photos
  - Server-side access control validation
  - Note: Determined users can always screenshot/inspect, but bulk access is prevented

### Development Environment

- Node.js 22.16 LTS
- Yarn 4 (with Plug'n'Play)
- Local R2 emulation with MinIO
- Test user bypass for development
- Separate dev/prod R2 buckets
- Environment variables for configuration

### Setup Commands

```bash
# Create Next.js project with TypeScript
npx create-next-app@latest family-gallery --typescript --tailwind --app --src-dir

# Navigate to project and set up Yarn 4
cd family-gallery
corepack enable
yarn set version stable
yarn install

# Initialize Shadcn/ui
npx shadcn@latest init
# Choose: Default style, Slate base color, CSS variables

# Add Shadcn/ui components for gallery
npx shadcn@latest add dialog      # For lightbox
npx shadcn@latest add card        # For photo cards
npx shadcn@latest add button      # UI interactions
npx shadcn@latest add tabs        # Year/month organization
npx shadcn@latest add scroll-area # Scrollable sections
npx shadcn@latest add aspect-ratio # Consistent image ratios
npx shadcn@latest add skeleton    # Loading states
npx shadcn@latest add dropdown-menu # User menu
npx shadcn@latest add toast       # Notifications
npx shadcn@latest add badge       # Tags/labels

# Install core dependencies with types
yarn add @clerk/nextjs@latest
yarn add @aws-sdk/client-s3@latest @aws-sdk/s3-request-presigner@latest

# Install media handling libraries
yarn add exifr@latest react-photo-album@latest photoswipe@latest
yarn add react-intersection-observer@latest
yarn add @uppy/core@latest @uppy/react@latest @uppy/drag-drop@latest @uppy/progress-bar@latest

# Install video support
yarn add video.js@latest @videojs/react@latest

# Install enhanced utilities
yarn add date-fns@latest date-fns-tz@latest clsx@latest
yarn add crypto-js@latest node-cache@latest

# Install production monitoring
yarn add @sentry/nextjs@latest

# Development dependencies
yarn add -D @types/node@latest @types/video.js@latest @types/crypto-js@latest

# Verify installed versions
yarn list
```

### Yarn 4 Configuration

```yaml
# .yarnrc.yml
nodeLinker: node-modules  # Use node_modules instead of PnP if needed
enableGlobalCache: true
```

### Deployment Strategy

- Git push triggers Vercel deployment
- Preview deployments for branches
- Environment variables in Vercel dashboard
- Manual JSON backup before major updates

## Environment Strategy

### Development & Production Environments

#### **Vercel** - Automatic Environment Management

```bash
# Environments created automatically:
- Production: main branch → family-gallery.vercel.app
- Preview: PRs → pr-123.family-gallery.vercel.app  
- Development: Local → localhost:3000

# Environment variables:
- Development: .env.local (git ignored)
- Preview/Production: Set in Vercel dashboard
```

#### **Clerk** - Separate Apps per Environment

```bash
# Create TWO Clerk applications:
1. "Family Gallery Dev" - for development/preview
2. "Family Gallery Prod" - for production

# Environment-specific keys:
# Development/Preview
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Production
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx  
CLERK_SECRET_KEY=sk_live_xxxxx
```

#### **Cloudflare R2** - Separate Buckets

```bash
# Create TWO buckets:
- family-gallery-dev (for dev/preview)
- family-gallery-prod (for production)

# Use same credentials, different bucket names:
R2_BUCKET_NAME=family-gallery-dev  # or -prod
R2_ACCESS_KEY_ID=xxx              # same for both
R2_SECRET_ACCESS_KEY=xxx          # same for both
```

### Environment Configuration

#### Local Development (.env.local)

```env
# Clerk Dev
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# R2 Dev
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=family-gallery-dev
R2_PUBLIC_URL=https://xxx.r2.dev

# App Config
ADMIN_EMAILS=admin@family.com
NODE_ENV=development
```

#### Vercel Environment Variables

```javascript
// Set these in Vercel Dashboard per environment:
{
  "preview": {
    "CLERK_SECRET_KEY": "sk_test_xxx",
    "R2_BUCKET_NAME": "family-gallery-dev"
  },
  "production": {
    "CLERK_SECRET_KEY": "sk_live_xxx",
    "R2_BUCKET_NAME": "family-gallery-prod"
  }
}
```

#### Code Configuration Pattern

```typescript
// lib/config.ts
export const config = {
  r2: {
    bucketName: process.env.R2_BUCKET_NAME!,
    accountId: process.env.R2_ACCOUNT_ID!,
  },
  env: {
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  },
  adminEmails: process.env.ADMIN_EMAILS?.split(',') || [],
}
```

### Cost Breakdown by Environment

- **Development**: ~$0.15/month (10GB test data in R2)
- **Production**: ~$1.50/month (100GB real data in R2)
- **Clerk**: $0 (both environments under free tier)
- **Vercel**: $0 (hobby plan covers all environments)
- **Total**: ~$1.65/month

## Pre-Development Setup Checklist

### Required Accounts & Setup

#### 1. **Vercel Account** ✓

- [ ] Sign up at <https://vercel.com>
- [ ] Connect GitHub account
- [ ] Verify email

#### 2. **Cloudflare Account & R2** ✓

- [ ] Sign up at <https://cloudflare.com>
- [ ] Enable R2 in dashboard
- [ ] Create DEV bucket: `family-gallery-dev`
- [ ] Create PROD bucket: `family-gallery-prod`
- [ ] Generate R2 API credentials (use same for both buckets):
  - [ ] Account ID
  - [ ] Access Key ID
  - [ ] Secret Access Key
  - [ ] Note both bucket endpoints
- [ ] Set up CORS rules for both buckets (allow localhost + your domains)

#### 3. **Clerk Account** ✓

- [ ] Sign up at <https://clerk.com>
- [ ] Create DEV application: "Family Gallery Dev"
- [ ] Create PROD application: "Family Gallery Prod"
- [ ] For BOTH applications configure OAuth:
  - [ ] Enable Google (requires Google Cloud Console setup)
  - [ ] Enable Facebook (requires Facebook Developer setup)
  - [ ] Enable Microsoft (optional)
- [ ] Copy credentials for each environment:
  - [ ] Dev: Publishable Key (pk_test_xxx)
  - [ ] Dev: Secret Key (sk_test_xxx)
  - [ ] Prod: Publishable Key (pk_live_xxx)
  - [ ] Prod: Secret Key (sk_live_xxx)
- [ ] Add allowed URLs:
  - [ ] Dev app: localhost:3000, *.vercel.app
  - [ ] Prod app: your-domain.com (when ready)

#### 4. **OAuth Provider Setup**

- [ ] **Google**: Create project in Google Cloud Console
  - [ ] Enable Google+ API
  - [ ] Create OAuth 2.0 credentials
  - [ ] Add authorized redirect URIs from Clerk
- [ ] **Facebook**: Create app in Facebook Developers
  - [ ] Add Facebook Login product
  - [ ] Configure OAuth redirect URIs from Clerk

#### 5. **Development Environment**

- [ ] Install Node.js 22.16 LTS
- [ ] Install Git
- [ ] Enable Yarn via Corepack: `corepack enable`
- [ ] Choose code editor (VS Code recommended)
- [ ] Install helpful VS Code extensions:
  - [ ] Tailwind CSS IntelliSense
  - [ ] TypeScript Vue Plugin
  - [ ] Prettier

#### 6. **Admin Email List**

- [ ] Decide which email addresses will be admins
- [ ] Document in a secure location

### Environment Variables Template

Create `.env.local` file for development:

```env
# Clerk (Dev)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Cloudflare R2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=family-gallery-dev
R2_PUBLIC_URL=https://xxx.r2.dev

# Admin emails (comma separated)
ADMIN_EMAILS=admin@family.com,another@family.com

# Environment
NODE_ENV=development
```

For Vercel (set in dashboard):

- Different Clerk keys for preview vs production
- Different R2_BUCKET_NAME for each environment
- Keep other R2 credentials the same

## Decision Log & Rationale

### Core Architecture Decisions

#### **Hosting: Vercel**

- **Why**: Best Next.js support (they maintain it), generous free tier, automatic preview deployments
- **Alternatives considered**: Cloudflare Pages (limited Next.js support), Self-hosted (requires maintenance)

#### **Storage: Cloudflare R2**

- **Why**: Zero egress fees (huge for photo gallery), S3-compatible API, cost-effective
- **Alternatives considered**:
  - AWS S3 ($45/month egress for 500GB)
  - Google Cloud Storage ($60/month egress)
  - Backblaze B2 (cheapest storage but has egress fees)

#### **Database: JSON Files in R2**

- **Why**: 30 users don't need a real database, zero cost, simple backup, version control friendly
- **Alternatives considered**: Supabase, PlanetScale (overkill for scale)

#### **Auth: Clerk**

- **Why**: Fastest implementation (5 min setup), beautiful UI components, all OAuth providers supported
- **Alternatives considered**:
  - NextAuth.js (more setup work)
  - Auth0 (overkill)
  - Supabase Auth (good but Clerk better for this use case)

#### **Styling: Tailwind CSS + Shadcn/ui**

- **Why**: Rapid development, consistent design, Shadcn provides professional components without lock-in
- **Alternatives considered**: CSS Modules (slower), Styled Components (runtime overhead), MUI (too opinionated)

### Technical Decisions

#### **TypeScript**

- **Why**: Type safety for long-term maintenance, better IDE support, catches bugs early
- **Trade-off**: Slightly slower initial development

#### **Node.js 22.16 LTS**

- **Why**: Stability over bleeding edge, Vercel optimized for LTS, all packages tested against it

#### **Yarn 4**

- **Why**: Better than npm for monorepos, Plug'n'Play option, good caching
- **Personal preference**: User requested

#### **Gallery UX: Hybrid Infinite Scroll**

- **Why**: Best of both worlds - smooth browsing but can jump to dates
- **Alternatives**: Pure infinite scroll (hard to navigate), Pagination (interrupts flow)

#### **Video Thumbnails: Client-side**

- **Why**: Zero server cost, immediate preview for uploader
- **Trade-off**: Limited to basic frame extraction
- **Future option**: Server-side processing ready

### Cost Optimization Decisions

#### **No High Availability**

- **Why**: Family site with 30 users doesn't need 99.9% uptime
- **Savings**: Simplified architecture, no redundancy costs

#### **Client-side Processing**

- **Why**: Use visitor's device for computation (free)
- **Applies to**: Video thumbnails, image resizing, EXIF extraction

#### **Prevent Downloads (Basic)**

- **Why**: Keep honest people honest without complex DRM
- **Method**: CSS/JS prevention only, no heavy protection

### Future-Proofing Decisions

#### **WhatsApp Integration Structure**

- **Why**: Unified upload service makes adding sources easier later
- **Prepared for**: WhatsApp, Email, API uploads

#### **PWA as Future Enhancement**

- **Why**: Not needed for MVP but structure supports it
- **Benefit**: Can add offline support later

#### **Environment Separation**

- **Why**: Safe development without affecting production photos
- **Method**: Separate Clerk apps and R2 buckets

## Next Steps

1. Choose authentication provider
2. Set up Vercel and R2 accounts
3. Initialize Next.js project
4. Implement Phase 1 foundation
5. Iterate based on family feedback

## Open Decisions

- Share link requirements (future feature)

## Confirmed Decisions

- **Language**: TypeScript
- **Gallery Navigation**: Hybrid approach (infinite scroll with date markers and jump navigation)
  - Infinite scroll for seamless browsing
  - Sticky date headers for context
  - Jump-to-date navigation bar
  - Floating "back to top" button
  - URL updates with current date range for shareable positions
- **Mobile Strategy**: Responsive web only (PWA as future enhancement)
- **Downloads**: Disabled (basic prevention, no heavy DRM)

## Implementation Status

### Phase 1: Foundation & Core Infrastructure

#### Stage 1.1: Project Setup & Environment ✅ COMPLETED
- ✅ Next.js 15.3.3 with React 19 initialized
- ✅ TypeScript and Tailwind CSS configured
- ✅ Yarn 4.9.2 package manager set up
- ✅ Shadcn/ui components installed (button, card, dialog, tabs, scroll-area, aspect-ratio, skeleton, dropdown-menu, badge, sonner)
- ✅ Development server running (port 3001, without Turbopack due to package resolution issue)
- ✅ Build process working correctly
- ✅ Environment variables template created
- ✅ Configuration utilities implemented
- ✅ Status page created

**Next**: Stage 1.2 - Authentication Integration (Clerk setup)

#### Stage 1.2: Authentication Integration - PENDING
- [ ] Clerk authentication integration
- [ ] Google/Facebook OAuth setup
- [ ] User role system implementation
- [ ] Protected routes configuration

#### Stage 1.3: R2 Storage & JSON Database - PENDING
- [ ] R2 bucket configuration
- [ ] JSON file management system
- [ ] Presigned URL generation
- [ ] Basic file upload capability
