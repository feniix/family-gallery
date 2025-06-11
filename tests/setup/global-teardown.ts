/**
 * Global test teardown - runs once after all tests
 */
export default async function globalTeardown() {
  console.log('🧹 Starting global test teardown...')
  
  // Cleanup test data
  // This could include cleaning up test files, mock data, etc.
  
  // Reset environment variables if needed
  // (Usually not necessary since the process ends)
  
  console.log('✅ Global test teardown completed')
} 