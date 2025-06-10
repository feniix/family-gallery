# Family Gallery - Development Guide

## Overview

This is the development guide for the Family Gallery project - a cost-effective family photo and video gallery web application using Next.js, Vercel hosting, and Cloudflare R2 storage.

## Tech Stack

- **Frontend**: Next.js 15.3.3 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + Shadcn/ui components
- **Package Manager**: Yarn 4.9.2
- **Authentication**: Clerk (planned)
- **Storage**: Cloudflare R2 (planned)
- **Database**: JSON files in R2 (planned)
- **Hosting**: Vercel

## Prerequisites

- Node.js 22.16 LTS or later
- Git
- VS Code (recommended) with extensions:
  - Tailwind CSS IntelliSense
  - TypeScript Vue Plugin
  - Prettier

## Initial Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd family-gallery
corepack enable
yarn install
```

### 2. Environment Variables

Copy the environment template:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your actual values:

```env
# Clerk (Dev) - Replace with actual values from Clerk dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Cloudflare R2 - Replace with actual values from Cloudflare dashboard
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=family-gallery-dev
R2_PUBLIC_URL=https://xxx.r2.dev

# Admin emails (comma separated) - Replace with actual admin emails
ADMIN_EMAILS=admin@family.com,another@family.com

# Environment
NODE_ENV=development
```

### 3. Start Development Server

```bash
# Standard Next.js dev server (recommended)
yarn next dev

# Alternative: yarn dev (uses Turbopack, but has known issues)
yarn dev
```

The application will be available at:
- Local: http://localhost:3001 (or 3000 if available)
- Network: http://192.168.x.x:3001

## Development Workflow

### Available Scripts

```bash
# Development
yarn dev          # Start dev server with Turbopack (has issues)
yarn next dev     # Start dev server without Turbopack (recommended)

# Building
yarn build        # Build for production
yarn start        # Start production server

# Code Quality
yarn lint         # Run ESLint
yarn type-check   # Run TypeScript compiler check
```

### Project Structure

```
family-gallery/
├── docs/                           # Documentation
│   ├── implementation-plan.md      # Detailed implementation stages
│   └── family-gallery-project-plan-v40.md  # Overall project plan
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── globals.css            # Global styles
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Home page (status page)
│   ├── components/
│   │   └── ui/                    # Shadcn/ui components
│   └── lib/
│       ├── config.ts              # Environment configuration
│       └── utils.ts               # Utility functions
├── .env.local                     # Environment variables (not in git)
├── package.json                   # Dependencies and scripts
└── README.md                      # Project overview
```

### Component Development

The project uses Shadcn/ui for consistent, accessible components:

```bash
# Add new Shadcn/ui components
npx shadcn@latest add <component-name>

# Example: Add a new form component
npx shadcn@latest add form
```

Available components already installed:
- `button`, `card`, `dialog`, `tabs`
- `scroll-area`, `aspect-ratio`, `skeleton`
- `dropdown-menu`, `badge`, `sonner` (notifications)

### Styling Guidelines

- Use Tailwind CSS utility classes
- Follow Shadcn/ui design patterns
- Use CSS variables for theming (defined in `globals.css`)
- Responsive design: mobile-first approach

## Known Issues & Troubleshooting

### Turbopack Issues

**Problem**: `yarn dev` fails with "Next.js package not found" error

**Solution**: Use `yarn next dev` instead of `yarn dev`

```bash
# ❌ This fails
yarn dev

# ✅ This works
yarn next dev
```

**Root Cause**: Turbopack has package resolution issues with Yarn 4 PnP

### Port Conflicts

**Problem**: Port 3000 is already in use

**Solution**: Next.js automatically uses port 3001. You can also specify a port:

```bash
yarn next dev --port 3002
```

### TypeScript Errors in IDE

**Problem**: IDE shows TypeScript errors but `yarn build` succeeds

**Solution**: These are often IDE-specific issues. Verify with:

```bash
yarn tsc --noEmit  # Should pass without errors
yarn build         # Should build successfully
```

### Environment Variables Not Loading

**Problem**: Environment variables are undefined

**Solutions**:
1. Ensure `.env.local` exists and has correct format
2. Restart the development server
3. Check that variable names start with `NEXT_PUBLIC_` for client-side access

## Implementation Status

### ✅ Completed (Stage 1.1)

- [x] Next.js 15.3.3 with React 19 setup
- [x] TypeScript configuration
- [x] Tailwind CSS v4 integration
- [x] Shadcn/ui component system
- [x] Development environment
- [x] Build pipeline
- [x] Environment configuration
- [x] Status page with working components

### 🚧 In Progress

- [ ] Stage 1.2: Authentication Integration (Clerk)
- [ ] Stage 1.3: R2 Storage & JSON Database

### 📋 Planned Features

- [ ] Admin upload interface
- [ ] Photo/video gallery with timeline
- [ ] EXIF metadata processing
- [ ] Subject tagging and filtering
- [ ] Mobile-responsive design
- [ ] Download prevention
- [ ] User management

## External Services Setup

### Clerk Authentication (Stage 1.2)

1. Create account at https://clerk.com
2. Create two applications:
   - "Family Gallery Dev" (development)
   - "Family Gallery Prod" (production)
3. Configure OAuth providers (Google, Facebook)
4. Copy API keys to environment variables

### Cloudflare R2 Storage (Stage 1.3)

1. Create Cloudflare account
2. Enable R2 in dashboard
3. Create buckets:
   - `family-gallery-dev` (development)
   - `family-gallery-prod` (production)
4. Generate API credentials
5. Configure CORS rules

### Vercel Deployment

1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Set up preview deployments for pull requests

## Code Quality

### TypeScript

- Strict mode enabled
- All files should be properly typed
- Use interfaces for data structures
- Avoid `any` type

### ESLint Configuration

- Next.js recommended rules
- React hooks rules
- TypeScript-specific rules

### Git Workflow

- Feature branches for each implementation stage
- Descriptive commit messages
- Pull requests for code review

## Performance Considerations

### Development

- Use `yarn next dev` for faster compilation
- Hot reload works for most changes
- TypeScript compilation is incremental

### Production

- Static generation where possible
- Image optimization with Next.js Image component
- Code splitting automatic with App Router

## Security Notes

### Environment Variables

- Never commit `.env.local` to git
- Use different credentials for dev/prod
- Rotate API keys regularly

### Authentication

- Server-side validation for all protected routes
- Admin role verification on API routes
- Webhook signature verification

## Getting Help

### Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn/ui Documentation](https://ui.shadcn.com)
- [Clerk Documentation](https://clerk.com/docs)

### Project-Specific

- Check `docs/implementation-plan.md` for detailed stages
- Review `docs/family-gallery-project-plan-v40.md` for architecture decisions
- Look at existing components in `src/components/ui/`

### Common Commands

```bash
# Reset node_modules and reinstall
rm -rf node_modules .next
yarn install

# Clear Next.js cache
rm -rf .next

# Check for outdated packages
yarn outdated

# Update packages (be careful with major versions)
yarn upgrade-interactive
```

## Contributing

1. Follow the implementation plan stages
2. Write TypeScript with proper types
3. Use Shadcn/ui components when possible
4. Test on both desktop and mobile
5. Update documentation for new features
6. Follow the established code style

## Deployment

### Development

- Automatic preview deployments on pull requests
- Environment: `family-gallery-dev` R2 bucket
- Clerk dev application

### Production

- Deploy from `main` branch
- Environment: `family-gallery-prod` R2 bucket
- Clerk production application
- Custom domain (when configured)

---

For questions or issues, refer to the implementation plan or create an issue in the repository. 