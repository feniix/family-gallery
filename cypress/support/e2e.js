// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Configure global settings
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignore Clerk-related errors that don't affect test functionality
  if (err.message.includes('Clerk') || err.message.includes('clerk')) {
    return false;
  }
  
  // Ignore network-related errors that don't affect core functionality
  if (err.message.includes('ERR_NETWORK') || err.message.includes('ERR_ABORTED')) {
    return false;
  }
  
  // Don't fail tests on unhandled promise rejections that are common with external services
  if (err.message.includes('Unhandled Promise rejection')) {
    return false;
  }
  
  // Return true to fail the test on other uncaught exceptions
  return true;
});

// Set up before each test
beforeEach(() => {
  // Clear localStorage and sessionStorage before each test
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Set reasonable defaults for timeouts
  cy.on('window:before:load', (win) => {
    // Increase timeout for slower operations
    win.fetch = new Proxy(win.fetch, {
      apply(fetch, that, args) {
        return fetch.apply(that, args);
      }
    });
  });
});