/**
 * Global test setup - runs once before all tests
 */
import { createLogger } from '../../src/lib/logger';

const testLogger = createLogger('TEST_SETUP');

async function globalSetup() {
  testLogger.info('Starting global test setup...');
  
  // Setup test environment variables
  Object.assign(process.env, {
    NODE_ENV: 'test',
    ADMIN_EMAILS: 'admin@test.com,test@admin.com',
    R2_BUCKET_NAME: 'family-gallery-test'
  });
  
  // Initialize test database if needed
  // This could include creating test JSON files, setting up mock data, etc.
  
  testLogger.info('Global test setup completed');
}

export default globalSetup;

// Optional: Add teardown for cleanup
process.on('exit', () => {
  testLogger.info('Running global teardown...');
}); 