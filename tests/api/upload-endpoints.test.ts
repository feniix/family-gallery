import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockNextRequest } from '../utils/test-helpers';

// Mock the external dependencies
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn()
}));

jest.mock('@/lib/r2', () => ({
  generatePresignedUploadUrl: jest.fn(),
  isValidFileType: jest.fn(),
  generateFilePath: {
    original: jest.fn()
  }
}));

jest.mock('@/lib/auth', () => ({
  getIsAdmin: jest.fn()
}));

describe('Upload API Endpoints', () => {
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Set up default mock implementations
    const { auth } = require('@clerk/nextjs/server');
    const { generatePresignedUploadUrl, isValidFileType, generateFilePath } = require('@/lib/r2');
    const { getIsAdmin } = require('@/lib/auth');
    
    auth.mockResolvedValue({ userId: 'test-admin-user-id' });
    generatePresignedUploadUrl.mockResolvedValue('https://test-presigned-url.com');
    isValidFileType.mockReturnValue(true);
    generateFilePath.original.mockReturnValue('2024/01/test-file.jpg');
    getIsAdmin.mockReturnValue(true);
  });

  describe('POST /api/upload/presigned', () => {
    
    it('should generate presigned URL for valid request', async () => {
      const { POST } = await import('@/app/api/upload/presigned/route');
      
      const request = createMockNextRequest('http://localhost:8080/api/upload/presigned', {
        method: 'POST',
        body: JSON.stringify({
          filename: 'test-image.jpg',
          contentType: 'image/jpeg',
          fileSize: 1000000,
          takenAt: '2024-01-01T12:00:00Z'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('presignedUrl');
      expect(data).toHaveProperty('filePath');
      expect(data).toHaveProperty('jobId');
      expect(data.presignedUrl).toBe('https://test-presigned-url.com');
    });

    it('should reject request without authentication', async () => {
      // Mock unauthenticated user
      const { auth } = require('@clerk/nextjs/server');
      auth.mockResolvedValueOnce({ userId: null });

      const { POST } = await import('@/app/api/upload/presigned/route');
      
      const request = createMockNextRequest('http://localhost:8080/api/upload/presigned', {
        method: 'POST',
        body: JSON.stringify({
          filename: 'test-image.jpg',
          contentType: 'image/jpeg'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should reject invalid file types', async () => {
      const { isValidFileType } = require('@/lib/r2');
      isValidFileType.mockReturnValueOnce(false);

      const { POST } = await import('@/app/api/upload/presigned/route');
      
      const request = createMockNextRequest('http://localhost:8080/api/upload/presigned', {
        method: 'POST',
        body: JSON.stringify({
          filename: 'test-document.pdf',
          contentType: 'application/pdf'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Invalid file type');
    });

    it('should reject files over size limit', async () => {
      const { POST } = await import('@/app/api/upload/presigned/route');
      
      const request = createMockNextRequest('http://localhost:8080/api/upload/presigned', {
        method: 'POST',
        body: JSON.stringify({
          filename: 'large-file.jpg',
          contentType: 'image/jpeg',
          fileSize: 60 * 1024 * 1024 // 60MB - over the 50MB limit
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('File too large');
    });

    it('should handle missing required fields', async () => {
      const { POST } = await import('@/app/api/upload/presigned/route');
      
      const request = createMockNextRequest('http://localhost:8080/api/upload/presigned', {
        method: 'POST',
        body: JSON.stringify({
          // Missing filename and contentType
          fileSize: 1000000
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Missing required fields');
    });
  });

  describe('POST /api/upload/check-duplicate', () => {
    
    it('should check for duplicates with EXIF data', async () => {
      const { POST } = await import('@/app/api/upload/check-duplicate/route');
      
      // Create a FormData with file and EXIF data
      const formData = new FormData();
      const testFile = new File(['test content'], 'test-image.jpg', { type: 'image/jpeg' });
      formData.append('file', testFile);
      formData.append('exifData', JSON.stringify({
        dateTimeOriginal: '2024-01-01T12:00:00Z',
        make: 'Apple',
        model: 'iPhone 13'
      }));

      const request = createMockNextRequest('http://localhost:8080/api/upload/check-duplicate', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('isDuplicate');
      expect(data).toHaveProperty('hash');
    });

    it('should handle missing file in duplicate check', async () => {
      const { POST } = await import('@/app/api/upload/check-duplicate/route');
      
      const formData = new FormData();
      // No file added

      const request = createMockNextRequest('http://localhost:8080/api/upload/check-duplicate', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('No file provided');
    });
  });

  describe('POST /api/media', () => {
    
    it('should add media metadata to database', async () => {
      const { POST } = await import('@/app/api/media/route');
      
      const request = createMockNextRequest('http://localhost:8080/api/media', {
        method: 'POST',
        body: JSON.stringify({
          id: 'test-media-id',
          filename: 'test-image.jpg',
          originalFilename: 'test-image.jpg',
          path: '2024/01/test-image.jpg',
          type: 'image',
          takenAt: '2024-01-01T12:00:00Z',
          metadata: {
            dateTimeOriginal: '2024-01-01T12:00:00Z',
            camera: { make: 'Apple', model: 'iPhone 13' },
            location: { latitude: 37.7749, longitude: -122.4194 }
          },
          hash: 'test-hash-123'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('totalMedia');
    });

    it('should reject unauthorized media upload', async () => {
      // Mock non-admin user
      const { getIsAdmin } = require('@/lib/server-auth');
      getIsAdmin.mockResolvedValueOnce(false);

      const { POST } = await import('@/app/api/media/route');
      
      const request = createMockNextRequest('http://localhost:8080/api/media', {
        method: 'POST',
        body: JSON.stringify({
          id: 'test-media-id',
          filename: 'test-image.jpg',
          originalFilename: 'test-image.jpg',
          path: '2024/01/test-image.jpg',
          type: 'image',
          takenAt: '2024-01-01T12:00:00Z',
          metadata: {}
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });

  describe('Error Handling', () => {
    
    it('should handle malformed JSON in presigned request', async () => {
      const { POST } = await import('@/app/api/upload/presigned/route');
      
      const request = createMockNextRequest('http://localhost:8080/api/upload/presigned', {
        method: 'POST',
        body: 'invalid-json'
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should handle network errors gracefully', async () => {
      // Mock R2 service failure
      const { generatePresignedUploadUrl } = require('@/lib/r2');
      generatePresignedUploadUrl.mockRejectedValueOnce(new Error('R2 service unavailable'));

      const { POST } = await import('@/app/api/upload/presigned/route');
      
      const request = createMockNextRequest('http://localhost:8080/api/upload/presigned', {
        method: 'POST',
        body: JSON.stringify({
          filename: 'test-image.jpg',
          contentType: 'image/jpeg',
          fileSize: 1000000
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
}); 