/**
 * Global test setup - runs once before all tests
 */
export default async function globalSetup() {
  console.log('🧪 Starting global test setup...')
  
  // Setup test environment variables
  Object.assign(process.env, {
    NODE_ENV: 'test',
    ADMIN_EMAILS: 'admin@test.com,test@admin.com',
    R2_BUCKET_NAME: 'family-gallery-test'
  })
  
  // Initialize test database if needed
  // This could include creating test JSON files, setting up mock data, etc.
  
  console.log('✅ Global test setup completed')
  
  return async () => {
    // Global teardown
    console.log('🧹 Running global teardown...')
  }
} 