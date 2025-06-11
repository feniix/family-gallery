// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Custom commands for Family Gallery

/**
 * Login with Clerk using provided credentials
 */
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/sign-in');
  
  // Wait for Clerk sign-in form to load
  cy.get('[data-testid="clerk-sign-in-form"]', { timeout: 10000 }).should('be.visible');
  
  // Fill in credentials
  cy.get('input[name="identifier"]').type(email);
  cy.get('input[name="password"]').type(password);
  
  // Submit form
  cy.get('button[type="submit"]').click();
  
  // Wait for successful login - should redirect to home page
  cy.url({ timeout: 15000 }).should('eq', Cypress.config().baseUrl + '/');
  
  // Verify user is logged in
  cy.get('[data-testid="user-menu"]', { timeout: 10000 }).should('be.visible');
});

/**
 * Login as admin user
 */
Cypress.Commands.add('loginAsAdmin', () => {
  const adminEmail = Cypress.env('TEST_ADMIN_EMAIL');
  const adminPass = Cypress.env('TEST_ADMIN_PASS');
  
  if (!adminEmail || !adminPass) {
    throw new Error('Admin credentials not found in environment variables');
  }
  
  cy.login(adminEmail, adminPass);
});

/**
 * Login as regular user
 */
Cypress.Commands.add('loginAsUser', () => {
  const userEmail = Cypress.env('TEST_USER_EMAIL');
  const userPass = Cypress.env('TEST_USER_PASS');
  
  if (!userEmail || !userPass) {
    throw new Error('User credentials not found in environment variables');
  }
  
  cy.login(userEmail, userPass);
});

/**
 * Logout current user
 */
Cypress.Commands.add('logout', () => {
  // Click user menu
  cy.get('[data-testid="user-menu"]').click();
  
  // Click logout button
  cy.get('[data-testid="logout-button"]').click();
  
  // Wait for redirect to sign-in page
  cy.url({ timeout: 10000 }).should('include', '/sign-in');
});

/**
 * Visit page and wait for it to load
 */
Cypress.Commands.add('visitAndWait', (path) => {
  cy.visit(path);
  cy.wait(1000); // Short wait for page to stabilize
});

/**
 * Check if user is admin
 */
Cypress.Commands.add('checkIsAdmin', () => {
  // Look for admin-specific elements
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="admin-upload-button"]').length > 0) {
      return true;
    }
    return false;
  });
});

/**
 * Upload a test file (admin only)
 */
Cypress.Commands.add('uploadTestFile', (filePath = 'cypress/fixtures/test-image.jpg') => {
  // Ensure we have admin privileges
  cy.get('[data-testid="admin-upload-button"]').should('be.visible').click();
  
  // Upload file
  cy.get('input[type="file"]').selectFile(filePath, { force: true });
  
  // Wait for upload to complete
  cy.get('[data-testid="upload-progress"]', { timeout: 30000 }).should('not.exist');
  
  // Verify success message
  cy.get('[data-testid="upload-success"]').should('be.visible');
});

/**
 * Clear all uploads (admin only - for test cleanup)
 */
Cypress.Commands.add('clearAllUploads', () => {
  // This would need to be implemented based on your admin interface
  cy.log('clearAllUploads command needs implementation based on admin interface');
});

/**
 * Assert that gallery is visible and contains content
 */
Cypress.Commands.add('assertGalleryLoaded', () => {
  cy.get('[data-testid="photo-gallery"]').should('be.visible');
  
  // Check for either content or empty state
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="gallery-item"]').length > 0) {
      cy.get('[data-testid="gallery-item"]').should('have.length.greaterThan', 0);
    } else {
      cy.get('[data-testid="empty-gallery"]').should('be.visible');
    }
  });
});

/**
 * Wait for Clerk to fully load
 */
Cypress.Commands.add('waitForClerk', () => {
  cy.window().then((win) => {
    return new Cypress.Promise((resolve) => {
      if (win.Clerk) {
        resolve();
      } else {
        const checkClerk = () => {
          if (win.Clerk) {
            resolve();
          } else {
            setTimeout(checkClerk, 100);
          }
        };
        checkClerk();
      }
    });
  });
});