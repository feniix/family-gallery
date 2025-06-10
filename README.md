# Family Gallery

A cost-effective family photo and video gallery web application designed for ~30 family members. Built with modern web technologies and optimized for minimal hosting costs while providing a beautiful, secure, and user-friendly experience.

## ✨ Features

### Current (Stage 1.1 ✅)
- **Modern Tech Stack**: Next.js 15.3.3 with React 19 and TypeScript
- **Beautiful UI**: Tailwind CSS v4 with Shadcn/ui component system
- **Development Ready**: Full development environment with hot reload

### Planned Features
- **Authentication**: Google/Facebook OAuth via Clerk
- **Photo & Video Support**: Upload and view photos/videos with EXIF-based timeline
- **Smart Organization**: Automatic date-based organization with subject tagging
- **Mobile Optimized**: Responsive design with touch-friendly interface
- **Cost Effective**: ~$5/month total hosting costs using Vercel + Cloudflare R2
- **Secure**: Admin-only uploads with basic download prevention

## 🚀 Quick Start

### Prerequisites
- Node.js 22.16 LTS or later
- Yarn (enabled via `corepack enable`)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd family-gallery

# Enable Yarn and install dependencies
corepack enable
yarn install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your actual values

# Start development server
yarn next dev
```

Open [http://localhost:3001](http://localhost:3001) to see the application.

> **Note**: Use `yarn next dev` instead of `yarn dev` due to Turbopack compatibility issues with Yarn 4.

## 🏗️ Tech Stack

- **Frontend**: Next.js 15.3.3 (App Router) + React 19
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4 + Shadcn/ui components
- **Package Manager**: Yarn 4.9.2
- **Authentication**: Clerk (OAuth with Google/Facebook)
- **Storage**: Cloudflare R2 (S3-compatible, zero egress fees)
- **Database**: JSON files in R2 (simple, cost-effective)
- **Hosting**: Vercel (free tier)

## 📁 Project Structure

```
family-gallery/
├── docs/                    # Project documentation
├── src/
│   ├── app/                # Next.js App Router pages
│   ├── components/ui/      # Shadcn/ui components
│   └── lib/               # Utilities and configuration
├── .env.local             # Environment variables (not in git)
└── README.md              # This file
```

## 🛠️ Development

### Available Scripts

```bash
yarn next dev    # Start development server (recommended)
yarn build       # Build for production
yarn start       # Start production server
yarn lint        # Run ESLint
```

### Key Development Notes

- **Turbopack Issue**: Use `yarn next dev` instead of `yarn dev`
- **Port**: Automatically uses port 3001 if 3000 is occupied
- **Hot Reload**: Works for all file changes
- **TypeScript**: Strict mode enabled with proper type checking

## 📋 Implementation Status

### ✅ Phase 1.1: Foundation (Completed)
- [x] Next.js project setup with TypeScript
- [x] Tailwind CSS + Shadcn/ui integration
- [x] Development environment configuration
- [x] Build pipeline and deployment readiness

### 🚧 Next Steps
- [ ] **Stage 1.2**: Clerk authentication integration
- [ ] **Stage 1.3**: Cloudflare R2 storage setup
- [ ] **Stage 2.1**: Admin upload interface
- [ ] **Stage 2.2**: EXIF processing and metadata
- [ ] **Stage 3.1**: Photo gallery with timeline view

## 🔧 Configuration

### Environment Variables

Create `.env.local` with the following variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Cloudflare R2 Storage
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=family-gallery-dev

# Admin Configuration
ADMIN_EMAILS=admin@family.com,another@family.com
```

### External Services Setup

1. **Clerk**: Create account and configure OAuth providers
2. **Cloudflare R2**: Set up buckets for dev/prod environments
3. **Vercel**: Connect repository for automatic deployments

## 📖 Documentation

- **[DEVELOPMENT.md](./DEVELOPMENT.md)**: Comprehensive development guide
- **[docs/implementation-plan.md](./docs/implementation-plan.md)**: Detailed implementation stages
- **[docs/family-gallery-project-plan-v40.md](./docs/family-gallery-project-plan-v40.md)**: Complete project architecture

## 🎯 Design Goals

- **Cost Effective**: <$5/month total hosting costs
- **Family Friendly**: Simple interface for non-technical users
- **Secure**: Admin-only uploads with authentication
- **Scalable**: Handles thousands of photos efficiently
- **Mobile First**: Responsive design for all devices

## 🤝 Contributing

1. Follow the implementation plan stages in order
2. Use TypeScript with proper typing
3. Follow Shadcn/ui design patterns
4. Test on both desktop and mobile
5. Update documentation for new features

## 📄 License

This project is private and intended for family use only.

---

**Current Status**: Stage 1.1 Complete ✅ | Next: Authentication Integration

For detailed development instructions, see [DEVELOPMENT.md](./DEVELOPMENT.md).
