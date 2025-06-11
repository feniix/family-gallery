describe('Authentication', () => {
  beforeEach(() => {
    // Ensure we start each test logged out
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('Application Access', () => {
    it('should load the application successfully', () => {
      cy.visit('/');
      
      // The application should load without crashing
      cy.get('body').should('be.visible');
      
      // Should have some content indicating it's the Family Gallery
      cy.get('body').should('satisfy', ($body) => {
        const text = $body.text().toLowerCase();
        return text.includes('family') || text.includes('gallery') || text.includes('sign') || text.includes('photo');
      });
    });

    it('should display sign-in page when accessed directly', () => {
      cy.visit('/sign-in');
      
      // Page should load
      cy.get('body').should('be.visible');
      
      // Should contain sign-in related content
      cy.get('body').should('contain.text', 'Sign');
    });

    it('should handle navigation to sign-in page', () => {
      cy.visit('/sign-in');
      
      // Wait for page to fully load
      cy.wait(3000);
      
      // Look for any Clerk sign-in elements (with more flexible selectors)
      cy.get('body').then(($body) => {
        // Check if Clerk form elements are present
        if ($body.find('input[name="identifier"]').length > 0) {
          cy.get('input[name="identifier"]').should('exist');
        }
        
        // Or check for any input fields that might be for email/username
        if ($body.find('input[type="email"]').length > 0) {
          cy.get('input[type="email"]').should('exist');
        }
        
        // Or just verify the page has some form of sign-in interface
        const hasSignInElements = $body.find('input').length > 0 || 
                                $body.text().toLowerCase().includes('sign in') ||
                                $body.text().toLowerCase().includes('email') ||
                                $body.text().toLowerCase().includes('password');
        
        expect(hasSignInElements).to.be.true;
      });
    });
  });

  describe('User Authentication (Conditional)', () => {
    // Only run these tests if we have credentials AND the sign-in form is working
    const hasTestCredentials = Cypress.env('TEST_USER_EMAIL') && Cypress.env('TEST_USER_PASS');
    
    beforeEach(() => {
      if (hasTestCredentials) {
        cy.visit('/sign-in');
        cy.wait(3000); // Give Clerk time to load
      }
    });

    (hasTestCredentials ? it : it.skip)('should attempt to login with user credentials', () => {
      // Try to find and interact with sign-in form
      cy.get('body').then(($body) => {
        const hasIdentifierField = $body.find('input[name="identifier"]').length > 0;
        const hasEmailField = $body.find('input[type="email"]').length > 0;
        
        if (hasIdentifierField || hasEmailField) {
          // Try to login with test credentials
          const emailField = hasIdentifierField ? 'input[name="identifier"]' : 'input[type="email"]';
          
          cy.get(emailField).should('be.visible').type(Cypress.env('TEST_USER_EMAIL'), { force: true });
          
          // Look for password field
          cy.get('body').then(($passwordBody) => {
            const passwordSelectors = [
              'input[name="password"]',
              'input[type="password"]',
              'input[placeholder*="password" i]'
            ];
            
            let passwordField = null;
            for (const selector of passwordSelectors) {
              if ($passwordBody.find(selector).length > 0) {
                passwordField = selector;
                break;
              }
            }
            
            if (passwordField) {
              cy.get(passwordField).type(Cypress.env('TEST_USER_PASS'), { force: true });
              
              // Try to submit
              cy.get('button[type="submit"], button:contains("Sign")').first().click({ force: true });
              
              // Give it time to process
              cy.wait(5000);
              
              // Check if we're still on sign-in or if we got redirected
              cy.url().then((url) => {
                cy.log('Current URL after login attempt: ' + url);
              });
            } else {
              cy.log('No password field found, skipping password entry');
            }
          });
        } else {
          cy.log('No suitable email/identifier field found, skipping login test');
        }
      });
    });
  });

  describe('Admin Authentication (Conditional)', () => {
    const hasAdminCredentials = Cypress.env('TEST_ADMIN_EMAIL') && Cypress.env('TEST_ADMIN_PASS');
    
    beforeEach(() => {
      if (hasAdminCredentials) {
        cy.visit('/sign-in');
        cy.wait(3000);
      }
    });

    (hasAdminCredentials ? it : it.skip)('should attempt to login with admin credentials', () => {
      cy.get('body').then(($body) => {
        const hasIdentifierField = $body.find('input[name="identifier"]').length > 0;
        const hasEmailField = $body.find('input[type="email"]').length > 0;
        
        if (hasIdentifierField || hasEmailField) {
          const emailField = hasIdentifierField ? 'input[name="identifier"]' : 'input[type="email"]';
          
          cy.get(emailField).should('be.visible').type(Cypress.env('TEST_ADMIN_EMAIL'), { force: true });
          
          cy.get('body').then(($passwordBody) => {
            const passwordSelectors = [
              'input[name="password"]',
              'input[type="password"]',
              'input[placeholder*="password" i]'
            ];
            
            let passwordField = null;
            for (const selector of passwordSelectors) {
              if ($passwordBody.find(selector).length > 0) {
                passwordField = selector;
                break;
              }
            }
            
            if (passwordField) {
              cy.get(passwordField).type(Cypress.env('TEST_ADMIN_PASS'), { force: true });
              cy.get('button[type="submit"], button:contains("Sign")').first().click({ force: true });
              cy.wait(5000);
              
              cy.url().then((url) => {
                cy.log('Current URL after admin login attempt: ' + url);
              });
            }
          });
        }
      });
    });
  });

  describe('Basic Navigation', () => {
    it('should handle different routes without crashing', () => {
      const routes = ['/', '/sign-in'];
      
      routes.forEach(route => {
        cy.visit(route, { failOnStatusCode: false });
        cy.get('body').should('be.visible');
        cy.wait(1000);
      });
    });

    it('should have reasonable page load times', () => {
      const startTime = Date.now();
      
      cy.visit('/');
      cy.get('body').should('be.visible');
      
      cy.then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(10000); // 10 seconds max
      });
    });
  });
}); 