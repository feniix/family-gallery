const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    video: false,
    screenshotOnRunFailure: true,
    supportFile: false,
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    env: {
      // Test user credentials from environment variables
      TEST_ADMIN_EMAIL: process.env.TEST_ADMIN_EMAIL,
      TEST_ADMIN_PASS: process.env.TEST_ADMIN_PASS,
      TEST_USER_EMAIL: process.env.TEST_USER_EMAIL,
      TEST_USER_PASS: process.env.TEST_USER_PASS,
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        log(message) {
          // Use structured logging for Cypress tasks
          const logEntry = {
            time: new Date().toISOString(),
            level: 'info',
            msg: message,
            module: 'CYPRESS'
          };
          console.log(JSON.stringify(logEntry));
          return null;
        },
      });
    },
  },
});
