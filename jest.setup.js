require('@testing-library/jest-dom')
const { TextEncoder, TextDecoder } = require('util')

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.ADMIN_EMAILS = 'admin@test.com,test@admin.com'
process.env.R2_BUCKET_NAME = 'test-bucket'
process.env.R2_ACCOUNT_ID = 'test-account'
process.env.R2_ACCESS_KEY_ID = 'test-key'
process.env.R2_SECRET_ACCESS_KEY = 'test-secret'

// Mock global objects for Node.js compatibility
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock File and Blob for browser APIs in Node environment
global.File = class File {
  constructor(fileBits, fileName, options = {}) {
    this.name = fileName
    this.size = fileBits.reduce((acc, bit) => acc + (bit.length || bit.byteLength || 0), 0)
    this.type = options.type || ''
    this.lastModified = options.lastModified || Date.now()
    this.arrayBuffer = () => Promise.resolve(new ArrayBuffer(this.size))
  }
}

global.Blob = class Blob {
  constructor(blobParts = [], options = {}) {
    this.size = blobParts.reduce((acc, part) => acc + (part.length || part.byteLength || 0), 0)
    this.type = options.type || ''
  }
}

// Mock crypto for duplicate detection
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  }
})

// Mock fetch globally
global.fetch = jest.fn()

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/test-path',
}))

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(() => ({
    user: { id: 'test-user-id', primaryEmailAddress: { emailAddress: 'admin@test.com' } },
    isLoaded: true,
  })),
  useAuth: jest.fn(() => ({
    userId: 'test-user-id',
    isLoaded: true,
  })),
  auth: jest.fn(() => Promise.resolve({ userId: 'test-user-id' })),
  SignIn: () => 'div',
  SignUp: () => 'div',
  UserButton: () => 'div',
}))

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}))

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(() => Promise.resolve('https://test-presigned-url.com')),
}))

// Mock EXIF library
jest.mock('exifr', () => ({
  parse: jest.fn(() => Promise.resolve({
    make: 'Apple',
    model: 'iPhone 13',
    dateTimeOriginal: new Date('2024-01-01T12:00:00Z'),
    gps: { latitude: 40.7128, longitude: -74.0060 }
  }))
}))

// Mock video processing functions (using virtual mock to avoid import errors)
jest.mock('@/lib/video-processing', () => {
  return {
    generateVideoThumbnail: jest.fn(() => Promise.resolve({
      thumbnail: new Blob(),
      metadata: { width: 1920, height: 1080, duration: 60 }
    })),
    validateVideoFile: jest.fn(() => ({ isValid: true })),
    extractVideoMetadata: jest.fn(() => Promise.resolve({
      width: 1920,
      height: 1080,
      duration: 60,
      size: 1000000
    }))
  }
}, { virtual: true })

// Console setup for tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
}) 