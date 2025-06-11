# Automated Testing Guide

## Overview

This document describes the comprehensive automated testing setup for the Family Gallery application, covering all completed features through Stage 2.3 (Video Support & Thumbnails).

## Test Coverage Summary

### Completed Features Tested ✅
- **Stage 1.1**: Project Setup & Environment
- **Stage 1.2**: Authentication & Authorization (Clerk + Admin roles)
- **Stage 1.3**: R2 Storage & JSON Database Operations
- **Stage 2.1**: Admin Upload Interface (Drag & drop, progress tracking)
- **Stage 2.2**: EXIF Processing & Metadata (Client-side extraction, duplicate detection)
- **Stage 2.3**: Video Support & Thumbnails (Client-side processing)

### Test Types Implemented

1. **E2E Tests (Playwright)** - Full user workflow testing
2. **API Tests (Jest)** - Backend endpoint testing
3. **Unit Tests (Jest)** - Library function testing
4. **Component Tests (Jest + React Testing Library)** - UI component testing

## Installation & Setup

### 1. Install Dependencies

```bash
# Install all testing dependencies
yarn install

# Install Playwright browsers
yarn playwright:install
```

### 2. Environment Setup

Create test environment variables:

```bash
# .env.test (for test environment)
NODE_ENV=test
ADMIN_EMAILS=admin@test.com,test@admin.com
R2_BUCKET_NAME=family-gallery-test
R2_ACCOUNT_ID=test-account
R2_ACCESS_KEY_ID=test-key
R2_SECRET_ACCESS_KEY=test-secret

# For Playwright tests
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY_TEST=pk_test_xxx
CLERK_SECRET_KEY_TEST=sk_test_xxx
```

## Running Tests

### All Tests
```bash
# Run all tests (unit + E2E)
yarn test:all

# Run all tests with coverage
yarn test:ci
```

### Individual Test Types
```bash
# Unit tests only
yarn test

# API tests only
yarn test:api

# Component tests only
yarn test:components

# E2E tests only
yarn test:e2e

# E2E tests with UI
yarn test:e2e:ui

# E2E tests in debug mode
yarn test:e2e:debug
```

### Watch Mode
```bash
# Unit tests in watch mode
yarn test:watch

# Coverage report
yarn test:coverage
```

## Test Structure

```
tests/
├── e2e/                          # End-to-end tests
│   ├── .auth/                    # Authentication state storage
│   ├── auth.setup.ts             # Authentication setup
│   ├── 01-authentication.test.ts # Auth flow tests
│   └── 02-upload-system.test.ts  # Upload workflow tests
├── api/                          # API endpoint tests
│   └── upload-endpoints.test.ts  # Upload API tests
├── lib/                          # Library function tests
│   └── exif-processing.test.ts   # EXIF and metadata tests
├── components/                   # Component tests
│   └── (to be created)
├── fixtures/                     # Test data and files
│   ├── README.md                 # Fixture documentation
│   └── sample-files/             # Test images/videos
└── setup/                        # Test configuration
    ├── global-setup.ts           # Global test setup
    └── global-teardown.ts        # Global test cleanup
```

## Test Coverage by Feature

### 1. Authentication & Authorization Tests

**Files**: `tests/e2e/01-authentication.test.ts`

#### AUTH-001: User Sign-in/Sign-up Flow ✅
- Anonymous user protection
- OAuth flow simulation
- Sign out functionality
- Session management

#### AUTH-002: Admin Access Control ✅
- Admin user access to upload interface
- Non-admin user blocking
- Server-side authorization validation
- Admin email configuration

**Coverage**: 
- Route protection middleware
- Clerk integration
- Admin role checking
- Navigation access control

### 2. Upload System Tests

**Files**: `tests/e2e/02-upload-system.test.ts`, `tests/api/upload-endpoints.test.ts`

#### UPLOAD-001: File Selection & Validation ✅
- Valid image/video upload to queue
- File type validation
- File size limits (50MB)
- Multiple file selection
- Drag & drop interface

#### UPLOAD-002: EXIF Data Processing ✅
- EXIF extraction from images
- Metadata display in UI
- GPS coordinate handling
- Camera information extraction
- Screenshot/edited photo detection

#### UPLOAD-003: Upload Progress & Completion ✅
- Progress tracking UI
- Queue management controls
- Upload statistics display
- Error handling states
- Retry functionality

**API Coverage**:
- `POST /api/upload/presigned` - Presigned URL generation
- `POST /api/upload/check-duplicate` - Duplicate detection
- `POST /api/media` - Metadata storage
- Authentication validation
- Error handling

### 3. EXIF Processing & Metadata Tests

**Files**: `tests/lib/exif-processing.test.ts`

#### Core Functionality ✅
- EXIF data extraction patterns
- Date processing with fallback strategies
- File naming conventions
- Metadata structure validation
- Duplicate detection algorithms
- WhatsApp media pattern detection

#### Edge Cases ✅
- Missing EXIF data handling
- Screenshot detection
- Edited photo detection
- Special characters in filenames
- Cross-year duplicate checking

### 4. Video Support Tests

**Files**: `tests/e2e/02-upload-system.test.ts`

#### VIDEO-001: Video Upload & Processing ✅
- Video file upload interface
- Video type validation
- Thumbnail generation (UI presence)
- Video metadata handling
- Codec support validation

### 5. Database & Storage Tests

**API Coverage**: `tests/api/upload-endpoints.test.ts`

#### DB-001: JSON Database Operations ✅
- Media metadata storage
- Year-based file organization
- Atomic operations
- Error handling

#### R2-001: Storage Integration ✅
- Presigned URL generation
- File path organization
- CORS validation
- Storage security

### 6. Error Handling Tests

**Comprehensive Coverage**:
- Network disconnection simulation
- Invalid file type rejection
- File size limit enforcement
- Malformed request handling
- Service unavailability scenarios

### 7. Mobile Responsiveness Tests

**UI Coverage**:
- Mobile viewport testing
- Touch interface validation
- Responsive layout verification

## Mock Strategy

### External Services
- **Clerk Authentication**: Mocked with localStorage simulation
- **AWS S3/R2**: Mocked presigned URL generation
- **EXIF Library**: Mocked with sample data
- **Video Processing**: Mocked thumbnail generation

### Browser APIs
- **File API**: Custom File/Blob implementations
- **Crypto API**: Mocked hash generation
- **Fetch API**: Global fetch mocking

## Test Data Management

### Test Fixtures
- Sample images with/without EXIF
- Test videos for processing
- Duplicate file sets
- Edge case files (corrupted, oversized)

### Mock Data
- Complete media metadata objects
- EXIF data structures
- User authentication states
- API response formats

## Continuous Integration

### GitHub Actions (Recommended)
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: yarn install
      - run: yarn test:ci
      - run: yarn test:e2e
```

### Local Pre-commit
```bash
# Run before committing
yarn test:all
```

## Coverage Goals

### Current Coverage Targets
- **Unit Tests**: 70% line/branch coverage
- **API Tests**: 100% endpoint coverage
- **E2E Tests**: All critical user paths
- **Component Tests**: All UI components (future)

### Coverage Reports
```bash
# Generate coverage report
yarn test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

## Debugging Tests

### Playwright Debugging
```bash
# Run specific test with debug
yarn test:e2e:debug --grep "upload"

# Open Playwright UI
yarn test:e2e:ui
```

### Jest Debugging
```bash
# Run specific test file
yarn test tests/lib/exif-processing.test.ts

# Debug mode
node --inspect-brk node_modules/.bin/jest tests/lib/exif-processing.test.ts
```

## Test Maintenance

### Adding New Tests
1. Identify the feature/component to test
2. Choose appropriate test type (unit/API/E2E)
3. Create test file in correct directory
4. Add to relevant test suites
5. Update coverage requirements

### Test Data Updates
1. Keep fixtures small and focused
2. Update mock data when APIs change
3. Version test data with feature changes
4. Document test data relationships

## Known Limitations

### Current Limitations
1. **File Upload Simulation**: E2E tests use mock files, not real file uploads
2. **Clerk Integration**: Uses localStorage mocking instead of real OAuth
3. **R2 Integration**: Mocked presigned URLs, not actual storage
4. **Video Processing**: Limited to UI presence testing

### Future Improvements
1. **Real File Testing**: Add actual file upload simulation
2. **Integration Testing**: Test with real but separate R2 bucket
3. **Visual Regression**: Add screenshot comparison tests
4. **Performance Testing**: Add load testing for upload scenarios

## Troubleshooting

### Common Issues

#### Playwright Installation
```bash
# If browser installation fails
yarn playwright install --force
```

#### Test Environment
```bash
# Clear test cache
yarn test --clearCache

# Reset test database
rm -rf test-results/
```

#### Mock Issues
```bash
# Clear Jest cache
yarn test --clearCache

# Verify mock setup
yarn test --verbose
```

### Getting Help

1. Check test output for specific error messages
2. Review test logs in `test-results/`
3. Use debug mode for step-by-step execution
4. Verify environment variables are set correctly

---

This automated testing setup provides comprehensive coverage of all completed features and ensures regression protection as development continues to future stages. 