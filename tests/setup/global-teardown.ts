import { createLogger } from '../../src/lib/logger';

const testLogger = createLogger('TEST_TEARDOWN');

/**
 * Global test teardown - runs once after all tests
 */
export default async function globalTeardown() {
  testLogger.info('Starting global test teardown...');
  
  // Add any global cleanup logic here
  // For example:
  // - Clean up test files
  // - Reset test database
  // - Clean up test environment
  
  testLogger.info('Global test teardown completed');
} 