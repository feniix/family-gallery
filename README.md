# Family Gallery

A private family photo and video gallery built with Next.js, featuring secure authentication, admin-controlled uploads, and organized timeline viewing.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- Yarn package manager
- Clerk account for authentication
- Cloudflare R2 storage

### Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd family-gallery

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration
```

### Running the Application
```bash
# Development server (runs on port 8080)
yarn dev

# Build for production
yarn build

# Start production server
yarn start
```

## 🧪 Testing

The project includes comprehensive testing suites:

### Unit Tests
```bash
# Run unit tests
yarn test:unit

# Run with watch mode
yarn test:watch

# Run with coverage
yarn test:coverage
```

### API Tests
```bash
# Run API integration tests
yarn test:api
```

### E2E Tests (Cypress)
```bash
# Run all E2E tests (headless)
yarn test:e2e

# Open Cypress Test Runner (interactive)
yarn test:e2e:open

# Run specific test file
yarn cypress run --spec "cypress/e2e/01-authentication.cy.js"

# Run all tests
yarn test:all
```

#### E2E Test Environment Setup
For authentication tests to work, add these variables to your `.env.local`:

```bash
# Test User Credentials
TEST_ADMIN_EMAIL=test-admin@example.com
TEST_ADMIN_PASS=this.is.now
TEST_USER_EMAIL=test-user@example.com
TEST_USER_PASS=this.is.now

# Admin Configuration
ADMIN_EMAILS=test-admin@example.com
```

**Note**: Test users must exist in your Clerk dashboard for authentication tests to pass. Tests will automatically skip if credentials are not provided.

### CI/CD Testing
```bash
# Run all tests in CI mode
yarn test:ci
```

## 📁 Project Structure

```
family-gallery/
├── src/
│   ├── app/                    # Next.js app directory
│   ├── components/             # React components
│   ├── lib/                    # Utility libraries
│   └── types/                  # TypeScript type definitions
├── tests/
│   ├── lib/                    # Unit tests
│   └── api/                    # API integration tests
├── cypress/
│   ├── e2e/                    # E2E test files
│   ├── fixtures/               # Test data files
│   └── support/                # Cypress configuration
├── public/                     # Static assets
└── docs/                       # Documentation
```

## ⚙️ Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Cloudflare R2 Storage
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Admin Configuration
ADMIN_EMAILS=admin@example.com,another-admin@example.com

# Test Credentials (for E2E tests)
TEST_ADMIN_EMAIL=test-admin@example.com
TEST_ADMIN_PASS=this.is.now
TEST_USER_EMAIL=test-user@example.com
TEST_USER_PASS=this.is.now
```

## 🔧 Development

### Code Quality
- **ESLint**: `yarn lint`
- **TypeScript**: `yarn type-check`
- **Testing**: `yarn test:all`

### Adding New Features
1. Create feature branch
2. Write tests first (TDD approach)
3. Implement feature
4. Ensure all tests pass
5. Submit pull request

## 📊 Testing Strategy

### Test Types
- **Unit Tests**: Component and utility function testing
- **API Tests**: Backend integration testing  
- **E2E Tests**: Full user workflow testing with Cypress

### Test Coverage
- Authentication flows
- File upload system
- Admin permissions
- Responsive design
- Error handling
- Accessibility basics

### Running Tests Locally
```bash
# Start the development server
yarn dev

# In another terminal, run E2E tests
yarn test:e2e:open
```

## 🚦 CI/CD

The project is configured for continuous integration with automated testing:

```bash
# CI test command
yarn test:ci
```

This runs:
1. Unit tests
2. API integration tests  
3. E2E tests (headless)

## 📚 Documentation

- [Cypress E2E Tests README](./cypress/README.md) - Detailed E2E testing documentation
- [API Documentation](./docs/api.md) - Backend API reference
- [Component Library](./docs/components.md) - UI component documentation

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Authentication**: Clerk
- **Storage**: Cloudflare R2
- **Testing**: Jest, Cypress, Testing Library
- **Package Manager**: Yarn
- **Deployment**: Vercel/Netlify

## 🔐 Security

- Authentication via Clerk
- Admin-only upload permissions
- Secure file storage with Cloudflare R2
- Environment variable protection
- Input validation and sanitization

## 📱 Features

- ✅ Secure authentication (Google/Facebook OAuth)
- ✅ Admin-controlled uploads
- ✅ Photo and video support
- ✅ EXIF date organization
- ✅ Timeline view
- ✅ Responsive design
- ✅ Comprehensive testing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is private and not licensed for public use.

---

For detailed testing documentation, see [cypress/README.md](./cypress/README.md)
