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

// Mock Web APIs that are needed for Next.js in test environment
global.Request = class Request {
  constructor(input, options = {}) {
    this._url = input
    this.method = options.method || 'GET'
    this.headers = new Headers(options.headers)
    this.body = options.body
    this._bodyUsed = false
  }
  
  get url() {
    return this._url
  }
  
  json() {
    if (this._bodyUsed) throw new Error('Body already used')
    this._bodyUsed = true
    return Promise.resolve(JSON.parse(this.body || '{}'))
  }
  
  text() {
    if (this._bodyUsed) throw new Error('Body already used')
    this._bodyUsed = true
    return Promise.resolve(this.body || '')
  }
  
  formData() {
    if (this._bodyUsed) throw new Error('Body already used')
    this._bodyUsed = true
    return Promise.resolve(this.body || new FormData())
  }
}

global.Response = class Response {
  constructor(body, options = {}) {
    this.body = body
    this.status = options.status || 200
    this.statusText = options.statusText || 'OK'
    this.headers = new Headers(options.headers)
    this.ok = this.status >= 200 && this.status < 300
    this._bodyUsed = false
  }
  
  json() {
    if (this._bodyUsed) throw new Error('Body already used')
    this._bodyUsed = true
    return Promise.resolve(JSON.parse(this.body || '{}'))
  }
  
  text() {
    if (this._bodyUsed) throw new Error('Body already used')
    this._bodyUsed = true
    return Promise.resolve(this.body || '')
  }
  
  static json(data, options = {}) {
    return new Response(JSON.stringify(data), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
  }
}

global.Headers = class Headers {
  constructor(headers = {}) {
    this._headers = new Map()
    if (headers) {
      if (headers instanceof Headers) {
        headers.forEach((value, key) => this.set(key, value))
      } else if (typeof headers === 'object') {
        Object.entries(headers).forEach(([key, value]) => {
          this.set(key, value)
        })
      }
    }
  }
  
  set(key, value) {
    this._headers.set(key.toLowerCase(), String(value))
  }
  
  get(key) {
    return this._headers.get(key.toLowerCase()) || null
  }
  
  has(key) {
    return this._headers.has(key.toLowerCase())
  }
  
  delete(key) {
    this._headers.delete(key.toLowerCase())
  }
  
  append(key, value) {
    const existing = this.get(key)
    if (existing) {
      this.set(key, existing + ', ' + String(value))
    } else {
      this.set(key, String(value))
    }
  }
  
  forEach(callback) {
    this._headers.forEach((value, key) => callback(value, key, this))
  }
  
  keys() {
    return this._headers.keys()
  }
  
  values() {
    return this._headers.values()
  }
  
  entries() {
    return this._headers.entries()
  }
  
  [Symbol.iterator]() {
    return this.entries()
  }
}

global.FormData = class FormData {
  constructor() {
    this._data = new Map()
  }
  
  append(key, value) {
    if (!this._data.has(key)) {
      this._data.set(key, [])
    }
    this._data.get(key).push(value)
  }
  
  get(key) {
    const values = this._data.get(key)
    return values ? values[0] : null
  }
  
  getAll(key) {
    return this._data.get(key) || []
  }
  
  has(key) {
    return this._data.has(key)
  }
}

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

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(() => Promise.resolve({ userId: 'test-user-id' })),
  currentUser: jest.fn(() => Promise.resolve({
    id: 'test-user-id',
    primaryEmailAddress: { emailAddress: 'admin@test.com' }
  }))
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

// Mock video processing functions
jest.mock('@/lib/video-processing', () => ({
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
}))

// Mock JSON database operations
jest.mock('@/lib/json-db', () => ({
  getMediaDb: jest.fn(() => ({
    read: jest.fn(() => Promise.resolve({ media: [] })),
    write: jest.fn(() => Promise.resolve()),
    update: jest.fn((updater) => {
      const currentData = { media: [] };
      const updatedData = updater(currentData);
      return Promise.resolve(updatedData);
    })
  })),
  usersDb: {
    read: jest.fn(() => Promise.resolve({ users: {} })),
    write: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve({ users: {} }))
  },
  addYearToIndex: jest.fn(() => Promise.resolve()),
  updateIndexMediaCount: jest.fn(() => Promise.resolve()),
  withRetry: jest.fn((fn) => fn())
}))

// Mock duplicate detection
jest.mock('@/lib/duplicate-detection', () => ({
  checkForDuplicate: jest.fn(() => Promise.resolve({
    isDuplicate: false,
    duplicateInfo: null
  }))
}))

// Mock metadata processing
jest.mock('@/lib/metadata', () => ({
  processMediaMetadata: jest.fn(() => Promise.resolve({
    metadata: {
      filename: 'test-image.jpg',
      originalFilename: 'test-image.jpg',
      takenAt: '2024-01-01T12:00:00Z',
      dateInfo: {
        source: 'filename'
      }
    },
    fileNaming: {
      filename: 'test-image.jpg',
      path: '2024/01/test-image.jpg'
    },
    hash: 'test-hash-123'
  }))
}))

// Mock server-side auth
jest.mock('@/lib/server-auth', () => ({
  getIsAdmin: jest.fn(() => Promise.resolve(true))
}))

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