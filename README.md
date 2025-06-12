# Family Gallery

A modern, cost-effective family photo and video gallery application built with Next.js, featuring advanced access control, timeline organization, and comprehensive media management.

## ✨ Key Features

### Core Functionality
- **Secure Authentication**: Clerk integration with Google/Facebook OAuth
- **Smart Upload System**: Drag-and-drop with EXIF processing and duplicate detection
- **Timeline Organization**: Chronological photo organization by EXIF creation date
- **Enhanced Lightbox**: PhotoSwipe-powered viewing with zoom, pan, and navigation
- **Video Support**: Client-side thumbnail generation and video playback
- **Subject Filtering**: Tag-based filtering system (Rufina/Bernabe + extensible)
- **Performance Optimization**: Virtual scrolling and memory management for large datasets

### 🆕 **Advanced Access Control with AlaSQL**
- **SQL-like Querying**: Complex media filtering with `SELECT * FROM media WHERE tags LIKE '%vacation%'`
- **Hierarchical Permissions**: 5-tier access system (admin → family → extended-family → friend → guest)
- **Tag-based Access Control**: Granular permissions based on media tags and user restrictions
- **Advanced Search**: Multi-field search supporting date ranges, camera info, GPS data, file types
- **Bulk Operations**: Mass permission updates for multiple media items
- **Analytics Dashboard**: Real-time insights into access patterns and permission usage

### Admin Features
- **Upload Management**: Multi-file upload with progress tracking
- **User Management**: Role-based access control and permission management
- **Analytics Dashboard**: Upload statistics, user activity, and system monitoring
- **Access Control Panel**: Advanced permission management with SQL-like filtering
- **Bulk Operations**: Efficient mass updates for media permissions

### Technical Excellence
- **Cost Optimized**: Cloudflare R2 storage with zero egress fees
- **JSON Database**: Atomic operations with file locking for data consistency
- **Mobile Responsive**: Optimized for all device sizes
- **Type Safe**: Full TypeScript implementation with strict mode
- **Testing**: Comprehensive E2E testing with Cypress

## 🏗️ Architecture

### Storage & Database
- **Cloudflare R2**: Cost-effective object storage for media files
- **JSON Database**: Year-based organization with atomic operations
- **File Locking**: Prevents race conditions during concurrent uploads
- **Duplicate Detection**: SHA-256 hashing for robust duplicate prevention

### Access Control System
- **AlaSQL Engine**: SQL-like querying for complex permission logic
- **Visibility Levels**: Public, Family, Extended Family, Private
- **Custom Access Rules**: User-specific allowed/denied tags and restrictions
- **Permission Analytics**: Real-time insights into access patterns

### Performance Features
- **Virtual Scrolling**: Handles 1000+ photos efficiently
- **Lazy Loading**: Intersection Observer for optimal loading
- **Memory Management**: Automatic cleanup and performance monitoring
- **Image Optimization**: Next.js Image with R2 presigned URLs

## 🚀 Quick Start

### Prerequisites
- Node.js 22+ LTS
- Yarn 4.9.2+
- Cloudflare R2 bucket
- Clerk account for authentication

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd family-gallery

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
yarn dev
```

### Environment Configuration

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Admin Configuration
ADMIN_EMAILS=admin@family.com,admin2@family.com

# Upload Configuration
UPLOAD_MAX_FILE_SIZE_MB=50
UPLOAD_MAX_FILES=50
```

## 📖 Usage

### For Family Members
1. **Sign In**: Use Google/Facebook OAuth to access the gallery
2. **Browse Photos**: Timeline and grid views with infinite scroll
3. **Filter Content**: Search by subjects, tags, dates, or text
4. **View Media**: Enhanced lightbox with zoom, pan, and navigation
5. **Access Control**: See only content you have permission to view

### For Admins
1. **Upload Media**: Drag-and-drop interface with progress tracking
2. **Manage Users**: Assign roles and custom permissions
3. **Access Control**: Use SQL-like queries for complex filtering
4. **Bulk Operations**: Mass updates for media permissions
5. **Analytics**: Monitor usage patterns and system health

### Advanced Search Examples

```sql
-- Find vacation photos from 2024
SELECT * FROM media WHERE tags LIKE '%vacation%' AND YEAR(takenAt) = 2024

-- Photos with GPS data taken with iPhone
SELECT * FROM media WHERE metadata->'exif'->'gps' IS NOT NULL 
AND metadata->>'camera' LIKE '%iPhone%'

-- Family photos larger than 5MB
SELECT * FROM media WHERE visibility = 'family' 
AND metadata->>'size' > 5000000
```

## 🛠️ Development

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin interfaces
│   ├── api/               # API routes
│   └── gallery/           # Gallery interface
├── components/            # React components
│   ├── admin/             # Admin components
│   ├── gallery/           # Gallery components
│   └── ui/                # Shadcn/ui components
├── lib/                   # Utility libraries
│   ├── access-control.ts  # AlaSQL access control system
│   ├── json-db.ts         # JSON database operations
│   ├── exif.ts            # EXIF processing
│   └── [18 more utilities]
└── types/                 # TypeScript definitions
```

### Key Libraries
- **AlaSQL**: SQL-like querying for access control
- **Next.js 15**: React framework with App Router
- **Clerk**: Authentication and user management
- **PhotoSwipe**: Enhanced lightbox experience
- **Tailwind CSS**: Utility-first styling
- **TypeScript**: Type safety throughout

### Testing

```bash
# Run E2E tests
yarn test:e2e

# Run unit tests
yarn test

# Type checking
yarn type-check

# Linting
yarn lint
```

## 📊 Performance

### Metrics
- **Page Load**: <3 seconds for 1000+ photos
- **Memory Usage**: Optimized with virtual scrolling
- **Storage Cost**: <$5/month for typical family use
- **Bandwidth**: Zero egress fees with R2

### Optimization Features
- Virtual scrolling for large datasets
- Image lazy loading with Intersection Observer
- Memory management with automatic cleanup
- Performance mode detection for device capabilities

## 🔒 Security

### Access Control
- **Hierarchical Permissions**: 5-tier visibility system
- **Tag-based Restrictions**: Granular content access control
- **Server-side Validation**: All permissions enforced server-side
- **Audit Logging**: Track access patterns and permission changes

### Data Protection
- **Presigned URLs**: Secure, time-limited access to media
- **Webhook Verification**: Signed webhooks for user management
- **File Validation**: Type and size validation for uploads
- **Atomic Operations**: Prevent data corruption during updates

## 📈 Analytics

### Access Control Insights
- **Permission Usage**: Track which users access what content
- **Visibility Breakdown**: Analyze content distribution across visibility levels
- **Tag Analytics**: Monitor tag usage and access patterns
- **User Activity**: Track upload and viewing patterns

### System Monitoring
- **Upload Statistics**: Track file uploads and processing
- **Performance Metrics**: Monitor page load times and memory usage
- **Error Tracking**: Comprehensive logging and error handling
- **Cost Monitoring**: Track storage and bandwidth usage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **AlaSQL**: Enabling SQL-like queries for complex access control
- **Clerk**: Seamless authentication and user management
- **Cloudflare R2**: Cost-effective storage solution
- **PhotoSwipe**: Enhanced lightbox experience
- **Next.js Team**: Excellent React framework

---

**Built with ❤️ for families who want to preserve and share their precious memories securely.**
