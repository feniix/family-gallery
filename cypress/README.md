# Family Gallery - E2E Tests with Cypress

This directory contains the End-to-End (E2E) test suite for the Family Gallery application using Cypress.

## 🚀 Quick Start

### Prerequisites

1. **Node.js and Yarn**: Ensure you have Node.js and Yarn installed
2. **Environment Variables**: Set up test credentials in your `.env.local` file
3. **Running Application**: The app must be running on `http://localhost:8080`

### Environment Setup

Create a `.env.local` file in the project root with the following test credentials:

```bash
# Test User Credentials (required for authentication tests)
TEST_ADMIN_EMAIL=test-admin@example.com
TEST_ADMIN_PASS=this.is.now
TEST_USER_EMAIL=test-user@example.com
TEST_USER_PASS=this.is.now

# Admin Configuration
ADMIN_EMAILS=test-admin@example.com,other-admin@example.com
```

**Note**: These test users must exist in your Clerk dashboard for authentication tests to pass.

### Running Tests

```bash
# Run all E2E tests in headless mode
yarn test:e2e

# Open Cypress Test Runner (interactive mode)
yarn test:e2e:open

# Run specific test file
yarn cypress run --spec "cypress/e2e/01-authentication.cy.js"

# Run tests with specific browser
yarn cypress run --browser chrome
```

## 📁 Test Structure

```
cypress/
├── e2e/                          # Test files
│   ├── 01-authentication.cy.js   # Authentication & sign-in tests
│   ├── 02-navigation.cy.js       # Navigation & UI tests
│   └── 03-upload-system.cy.js    # File upload functionality
├── fixtures/                     # Test data files
│   ├── test-image.jpg            # Sample image for upload tests
│   └── test-file.txt             # Sample file for validation tests
├── support/                      # Cypress configuration
│   ├── commands.js               # Custom commands
│   └── e2e.js                    # Global configuration
└── downloads/                    # Downloaded files during tests
```

## 🧪 Test Categories

### 1. Authentication Tests (`01-authentication.cy.js`)

Tests user authentication flows and access control:

- **Anonymous User Access**: Redirects and sign-in page display
- **User Authentication**: Login/logout for regular users
- **Admin Authentication**: Login/logout for admin users
- **Navigation Protection**: Route protection for unauthorized users

**Key Features:**
- Tests are conditionally skipped if credentials are not provided
- Supports both regular user and admin user flows
- Validates proper redirects and access controls

### 2. Navigation Tests (`02-navigation.cy.js`)

Tests application navigation and basic functionality:

- **Public Pages**: 404 handling, page titles
- **Authenticated Navigation**: Main navigation elements, page transitions
- **Admin Navigation**: Admin-specific UI elements
- **Responsive Design**: Mobile and tablet viewport testing
- **Error Handling**: Network error resilience

### 3. Upload System Tests (`03-upload-system.cy.js`)

Tests file upload functionality (admin-only):

- **Admin Upload Interface**: Upload UI display and interaction
- **Upload Validation**: File type and size validation
- **Gallery Updates**: Gallery refresh after uploads
- **Upload Permissions**: Access control for upload features
- **Error Handling**: Upload failure and timeout handling

## 🛠 Custom Commands

The test suite includes custom Cypress commands for common operations:

### Authentication Commands

```javascript
// Login with any credentials
cy.login(email, password)

// Login as admin user (uses environment variables)
cy.loginAsAdmin()

// Login as regular user (uses environment variables)
cy.loginAsUser()

// Logout current user
cy.logout()
```

### Navigation Commands

```javascript
// Visit page and wait for it to load
cy.visitAndWait('/some-path')

// Wait for Clerk authentication to load
cy.waitForClerk()
```

### Gallery Commands

```javascript
// Assert gallery is loaded and visible
cy.assertGalleryLoaded()

// Check if current user has admin privileges
cy.checkIsAdmin()
```

### Upload Commands

```javascript
// Upload a test file (admin only)
cy.uploadTestFile('path/to/file.jpg')

// Clear all uploads (for test cleanup)
cy.clearAllUploads()
```

## ⚙️ Configuration

### Cypress Configuration (`cypress.config.js`)

- **Base URL**: `http://localhost:8080`
- **Viewport**: 1280x720 (desktop)
- **Timeouts**: 10-30 seconds for various operations
- **Environment Variables**: Test credentials automatically loaded
- **Video Recording**: Disabled for faster runs
- **Screenshots**: Enabled on test failures

### Global Settings

- **Error Handling**: Ignores Clerk-related and network errors that don't affect functionality
- **State Management**: Clears localStorage and cookies before each test
- **Exception Handling**: Configured to handle common third-party service errors

## 🔧 Troubleshooting

### Common Issues

1. **Test Users Don't Exist**
   - Ensure test users are created in your Clerk dashboard
   - Verify email addresses match environment variables exactly

2. **Application Not Running**
   - Start the application: `yarn dev`
   - Ensure it's running on port 8080 (not 3000)

3. **Network Timeouts**
   - Check internet connection
   - Verify Clerk and other external services are accessible

4. **Authentication Failures**
   - Clear browser data between test runs
   - Check if test users are properly configured in Clerk

### Debug Mode

Run tests with debug information:

```bash
# Run with debug output
DEBUG=cypress:* yarn test:e2e

# Run specific test with browser console
yarn cypress open --spec "cypress/e2e/01-authentication.cy.js"
```

### Environment Issues

```bash
# Check environment variables are loaded
yarn cypress run --env TEST_ADMIN_EMAIL=test@example.com

# Override specific config for testing
yarn cypress run --config baseUrl=http://localhost:3000
```

## 📊 Test Reports

Cypress generates test reports automatically:

- **Screenshots**: Saved on test failures
- **Videos**: Available when enabled in config
- **Terminal Output**: Real-time test progress
- **Cypress Dashboard**: Available with paid plan

## 🚦 CI/CD Integration

For continuous integration, use:

```bash
# Run tests in CI mode (headless, no interactive features)
yarn test:ci

# Run only E2E tests
yarn test:e2e
```

**Environment Setup for CI:**
- Set environment variables in your CI system
- Ensure test users exist in production Clerk instance
- Configure proper base URL for your deployed application

## 🔄 Test Maintenance

### Adding New Tests

1. Create new test file in `cypress/e2e/`
2. Follow naming convention: `##-description.cy.js`
3. Use existing custom commands when possible
4. Add conditional skipping for tests requiring specific credentials

### Updating Custom Commands

1. Edit `cypress/support/commands.js`
2. Follow existing patterns for error handling
3. Add proper documentation for new commands
4. Test commands work across different scenarios

### Managing Test Data

1. Use `cypress/fixtures/` for static test files
2. Clean up test data after tests complete
3. Use environment variables for dynamic configuration
4. Avoid hardcoding sensitive information

---

For more information about Cypress, visit the [official documentation](https://docs.cypress.io/). 