# Family Gallery

A modern, cost-effective family photo and video gallery application built with Next.js, featuring advanced access control, timeline organization, and comprehensive media management.

## ✨ Key Features

### Core Functionality
- **Secure Authentication**: Clerk integration with Google/Facebook OAuth
- **5-Tier User Management**: Admin → Family → Extended-family → Friend → Guest access levels
- **Smart Upload System**: Drag-and-drop with EXIF processing and duplicate detection
- **Timeline Organization**: Chronological photo organization by EXIF creation date
- **Enhanced Lightbox**: Advanced viewing with zoom, pan, and navigation
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

### 🔐 **User Management System**
- **Automatic Guest Assignment**: New users start as guests with zero access
- **Admin Approval Workflow**: Admins review and approve/promote users through web interface
- **Role-Based Access**: Family members see family content, extended family sees extended content, friends see public only
- **User Status Management**: Pending → Approved → Suspended user states
- **Zero Access for Guests**: Guests have no content visibility until promoted

### Admin Features
- **Upload Management**: Multi-file upload with progress tracking
- **User Management**: 5-tier role management with approval workflow
- **Analytics Dashboard**: Upload statistics, user activity, and system monitoring
- **Access Control Panel**: Advanced permission management with SQL-like filtering
- **Bulk Operations**: Efficient mass updates for media permissions

### 🛠️ **CLI Import Tool (fg-import)**
- **Bulk Media Import**: Import entire directories of photos and videos
- **TypeScript Implementation**: Consistent with project architecture
- **EXIF Processing**: Full metadata extraction during import
- **Progress Reporting**: Real-time progress and error handling
- **Integration**: Uses existing media management infrastructure

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

### For New Users
1. **Sign Up**: Use Google/Facebook OAuth to create account
2. **Pending Approval**: Start as guest with zero access, wait for admin approval
3. **Get Promoted**: Admin promotes you to appropriate role (family/extended-family/friend)
4. **Access Content**: View content based on your assigned role level

### For Family Members
1. **Sign In**: Use Google/Facebook OAuth to access the gallery
2. **Browse Photos**: Timeline and grid views with infinite scroll
3. **Filter Content**: Search by subjects, tags, dates, or text
4. **View Media**: Enhanced lightbox with zoom, pan, and navigation
5. **Access Control**: See only content you have permission to view

### For Admins
1. **Upload Media**: Drag-and-drop interface with progress tracking
2. **Manage Users**: Review pending users, approve and assign roles
3. **Access Control**: Use SQL-like queries for complex filtering
4. **Bulk Operations**: Mass updates for media permissions
5. **Analytics**: Monitor usage patterns and system health
6. **CLI Import**: Use `yarn fg-import` for bulk media import

### User Management Flow
1. **New User Registration**: Automatically assigned to guest role with pending status
2. **Admin Review**: Admins see pending users in dashboard user management section
3. **Approval Options**:
   - **Approve as Guest**: User approved but maintains zero access
   - **Promote to Family**: Full family content access
   - **Promote to Extended-family**: Extended family content access
   - **Promote to Friend**: Public content access only
4. **Ongoing Management**: Change roles, suspend users as needed

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

### CLI Import Tool

```bash
# Import photos from a directory
yarn fg-import /path/to/photos

# Import with specific options
yarn fg-import /path/to/photos --subjects "rufina,bernabe" --tags "vacation,2024"

# See all options
yarn fg-import --help
```

## 🛠️ Development

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin interfaces
│   │   ├── dashboard/     # User management and analytics
│   │   ├── media-manager/ # Media management interface
│   │   └── upload/        # Media upload interface
│   ├── api/               # API routes (25+ endpoints)
│   │   ├── admin/users/   # User management endpoints
│   │   ├── access-control/ # Permission management
│   │   ├── media/         # Media API endpoints
│   │   └── upload/        # Upload API endpoints
│   ├── pending-approval/  # Pending approval page
│   └── gallery/           # Gallery interface
├── components/            # React components
│   ├── admin/             # Admin components
│   │   ├── bulk-upload-zone.tsx      # Advanced upload interface (27KB)
│   │   └── user-management-panel.tsx # User approval interface (19KB)
│   ├── gallery/           # Gallery components
│   │   ├── photo-grid.tsx         # Photo grid (8.4KB)
│   │   ├── virtual-photo-grid.tsx # Virtual scrolling (13KB)
│   │   ├── timeline-view.tsx      # Timeline organization (12KB)
│   │   ├── simple-lightbox.tsx    # Lightbox (8.5KB)
│   │   └── search-bar.tsx         # Search functionality (3KB)
│   └── ui/                # Shadcn/ui components
├── lib/                   # Utility libraries (19 modules, 150KB+)
│   ├── access-control.ts  # AlaSQL access control system (15KB)
│   ├── exif.ts            # EXIF processing (16KB)
│   ├── video-processing.ts # Video thumbnails (13KB)
│   ├── duplicate-detection.ts # Duplicate detection (12KB)
│   ├── json-db.ts         # JSON database operations (11KB)
│   ├── performance.ts     # Performance optimization (9.4KB)
│   ├── metadata.ts        # Metadata processing (8.8KB)
│   ├── server-auth.ts     # Server-side authentication (6.4KB)
│   ├── config.ts          # Configuration management (6.6KB)
│   ├── date-handling.ts   # Date utilities (6.4KB)
│   ├── r2.ts              # R2 storage operations (4.9KB)
│   ├── file-naming.ts     # File naming (3.7KB)
│   ├── logger.ts          # Logging system (3.2KB)
│   ├── users.ts           # User management (2.3KB)
│   ├── json-locking.ts    # File locking (2.3KB)
│   ├── access-logger.ts   # Access logging (2KB)
│   ├── utils.ts           # General utilities (2.4KB)
│   └── auth.ts            # Client auth (407B)
├── scripts/               # CLI tools
│   ├── fg-import.ts       # CLI import tool (18KB)
│   ├── fg-import          # Executable wrapper
│   └── README.md          # CLI documentation (7.1KB)
└── types/                 # TypeScript definitions
```

### Key Libraries
- **AlaSQL**: SQL-like querying for access control
- **Next.js 15**: React framework with App Router
- **Clerk**: Authentication and user management
- **Tailwind CSS**: Utility-first styling
- **TypeScript**: Type safety throughout
- **Cypress**: E2E testing framework

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

# Build verification
yarn build
```

### CLI Commands

```bash
# Development
yarn dev              # Start development server
yarn build            # Build for production
yarn start            # Start production server

# Quality Assurance
yarn type-check       # TypeScript type checking
yarn lint             # ESLint linting
yarn test             # Run unit tests
yarn test:e2e         # Run E2E tests

# CLI Tools
yarn fg-import        # Bulk import media files
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
- **Hierarchical Permissions**: 5-tier visibility system with zero access for guests
- **Admin Approval Workflow**: All users must be approved by administrators
- **Tag-based Restrictions**: Granular content access control
- **Server-side Validation**: All permissions enforced server-side
- **Audit Logging**: Track access patterns and permission changes

### Data Protection
- **Presigned URLs**: Secure, time-limited access to media
- **Webhook Verification**: Signed webhooks for user management
- **File Validation**: Type and size validation for uploads
- **Atomic Operations**: Prevent data corruption during updates

## 📈 Analytics

### User Management Insights
- **Pending Users**: Track users waiting for approval
- **Role Distribution**: Monitor user assignments across tiers
- **Access Patterns**: Analyze content visibility and usage
- **Approval Metrics**: Track admin approval workflows

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

## 🚀 Production Status

### ✅ **PRODUCTION READY**
The Family Gallery application is **100% complete** with all planned features implemented, tested, and production-ready:

#### **Complete Infrastructure**
- **Authentication**: Clerk integration with OAuth and 5-tier user management
- **Storage**: Cloudflare R2 with presigned URLs and cost optimization
- **Database**: JSON file system with atomic operations and locking
- **Upload System**: Complete with transaction support and failure recovery
- **EXIF Processing**: Full metadata extraction with 40+ fields
- **Video Support**: Thumbnail generation and processing with fallbacks
- **Gallery Interface**: Timeline and grid views with virtual scrolling
- **Admin Dashboard**: Complete statistics and user management interface
- **Advanced Access Control**: AlaSQL-powered permission system
- **Performance**: Virtual scrolling and memory management optimization
- **CLI Tools**: Import tool for bulk media management
- **Testing**: Comprehensive E2E and unit testing
- **Code Quality**: All linting and build issues resolved

#### **Final Implementation Metrics**
- **19 Library Modules**: Complete backend infrastructure (150KB+ of utilities)
- **7 Gallery Components**: Full-featured responsive gallery interface
- **2 Admin Components**: Comprehensive admin management tools
- **25+ API Routes**: Complete API coverage for all functionality
- **CLI Import Tool**: TypeScript-based bulk import utility
- **E2E Testing**: Cypress testing infrastructure with comprehensive coverage
- **Build Status**: ✅ All linting, type-checking, and build processes pass

### **Ready for Immediate Deployment**
All core features are complete and the application is ready for production deployment with full documentation and maintenance guides.

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
- **Next.js Team**: Excellent React framework

---

**Built with ❤️ for families who want to preserve and share their precious memories securely.**
