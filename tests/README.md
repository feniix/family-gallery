# Automated Testing

This directory contains comprehensive automated tests for the Family Gallery application.

## Quick Start

```bash
# Install dependencies
yarn install

# Install Playwright browsers (for E2E tests)
yarn playwright:install

# Run all tests
yarn test:all
```

## Test Types

### 🧪 Unit Tests (`yarn test`)
- **Location**: `tests/lib/`
- **Purpose**: Test individual functions and utilities
- **Coverage**: EXIF processing, metadata handling, file validation

### 🔌 API Tests (`yarn test:api`)
- **Location**: `tests/api/`
- **Purpose**: Test backend API endpoints
- **Coverage**: Upload endpoints, authentication, database operations

### 🌐 E2E Tests (`yarn test:e2e`)
- **Location**: `tests/e2e/`
- **Purpose**: Test complete user workflows
- **Coverage**: Authentication flows, upload interface, user interactions

## Coverage Summary

### ✅ Completed Features Tested
- Authentication & Authorization (Clerk + Admin roles)
- Upload System (File selection, validation, progress)
- EXIF Processing (Metadata extraction, date handling)
- Duplicate Detection (Hash-based, cross-year)
- Video Support (Upload interface, processing)
- Error Handling (Network, validation, service errors)
- Mobile Responsiveness (Touch interface, layouts)

### 📊 Coverage Goals
- **Unit Tests**: 70% line/branch coverage
- **API Tests**: 100% endpoint coverage  
- **E2E Tests**: All critical user paths

## Running Tests

```bash
# All tests with coverage
yarn test:ci

# Individual test suites  
yarn test:e2e          # End-to-end tests
yarn test:api          # API tests
yarn test:components   # Component tests (future)

# Development modes
yarn test:watch        # Unit tests in watch mode
yarn test:e2e:ui       # E2E tests with Playwright UI
yarn test:e2e:debug    # E2E tests in debug mode
```

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests (Playwright)
│   ├── .auth/              # Authentication state storage
│   ├── 01-authentication.test.ts
│   └── 02-upload-system.test.ts
├── api/                    # API endpoint tests (Jest)
│   └── upload-endpoints.test.ts
├── lib/                    # Library function tests (Jest) 
│   └── exif-processing.test.ts
├── fixtures/               # Test data and sample files
├── setup/                  # Global test configuration
└── README.md              # This file
```

## Environment Setup

Tests require these environment variables:

```bash
NODE_ENV=test
ADMIN_EMAILS=admin@test.com,test@admin.com
R2_BUCKET_NAME=family-gallery-test
# Additional variables for E2E tests
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY_TEST=pk_test_xxx
CLERK_SECRET_KEY_TEST=sk_test_xxx
```

## Debugging

### Failed Tests
```bash
# View detailed output
yarn test --verbose

# Run specific test file
yarn test tests/lib/exif-processing.test.ts

# Debug E2E tests
yarn test:e2e:debug --grep "upload"
```

### Test Results
- **Unit Test Reports**: `coverage/lcov-report/index.html`
- **E2E Test Reports**: `playwright-report/index.html`
- **Test Artifacts**: `test-results/`

## Mock Strategy

Tests use comprehensive mocking for external dependencies:
- **Clerk Authentication**: localStorage simulation
- **AWS S3/R2**: Mocked presigned URLs
- **EXIF Library**: Sample metadata
- **Video Processing**: Mocked thumbnail generation

## Contributing

When adding new features:
1. Write tests for new functionality
2. Update existing tests if APIs change
3. Maintain coverage thresholds
4. Add E2E tests for user-facing features

For detailed information, see [Automated Testing Guide](../docs/automated-testing-guide.md). 