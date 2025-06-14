import { NextRequest } from 'next/server';
import { POST } from '@/app/api/media/signed-url/batch/route';

// Mock dependencies
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/json-db', () => ({
  getMediaDb: jest.fn(),
  withRetry: jest.fn(),
}));

jest.mock('@/lib/r2', () => ({
  generatePresignedDownloadUrl: jest.fn(),
}));

jest.mock('@/lib/server-auth', () => ({
  checkUserHasAccessSmart: jest.fn(),
}));

// Helper function to create mock NextRequest
function createMockNextRequest(url: string, body: any) {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('Batch Signed URL API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock implementations
    const { auth } = require('@clerk/nextjs/server');
    const { generatePresignedDownloadUrl } = require('@/lib/r2');
    const { checkUserHasAccessSmart } = require('@/lib/server-auth');
    const { getMediaDb, withRetry } = require('@/lib/json-db');
    
    auth.mockResolvedValue({ userId: 'test-user-id' });
    checkUserHasAccessSmart.mockResolvedValue(true);
    generatePresignedDownloadUrl.mockResolvedValue('https://signed-url.r2.dev/test-file.jpg?signature=abc123');
    
    // Mock media database
    const mockMediaData = {
      media: [
        {
          id: 'media-1',
          originalFilename: 'test-image-1.jpg',
          path: '2024/01/test-image-1.jpg',
          thumbnailPath: '2024/01/test-image-1-thumb.jpg',
          type: 'photo'
        },
        {
          id: 'media-2',
          originalFilename: 'test-image-2.jpg',
          path: '2024/01/test-image-2.jpg',
          thumbnailPath: '2024/01/test-image-2-thumb.jpg',
          type: 'photo'
        },
        {
          id: 'media-3',
          originalFilename: 'test-video.mp4',
          path: '2024/01/test-video.mp4',
          thumbnailPath: '2024/01/test-video-thumb.jpg',
          type: 'video'
        }
      ]
    };
    
    const mockMediaDb = {
      read: jest.fn().mockResolvedValue(mockMediaData)
    };
    
    getMediaDb.mockReturnValue(mockMediaDb);
    withRetry.mockImplementation((fn: () => any) => fn());
    
    // Mock media index
    const mockMediaIndex = {
      years: [2024]
    };
    
    const mockMediaIndexDb = {
      read: jest.fn().mockResolvedValue(mockMediaIndex)
    };
    
    require('@/lib/json-db').mediaIndexDb = mockMediaIndexDb;
  });

  describe('POST /api/media/signed-url/batch', () => {
    it('should generate batch signed URLs for authenticated user', async () => {
      const requestBody = {
        requests: [
          { mediaId: 'media-1', isThumbnail: true },
          { mediaId: 'media-2', isThumbnail: false },
          { mediaId: 'media-3', isThumbnail: true, expiresIn: 7200 }
        ]
      };

      const request = createMockNextRequest('http://localhost:3000/api/media/signed-url/batch', requestBody);
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(3);
      expect(data.errors).toBe(0);
      expect(data.results).toHaveLength(3);
      
      // Check first result (thumbnail)
      expect(data.results[0]).toMatchObject({
        mediaId: 'media-1',
        signedUrl: 'https://signed-url.r2.dev/test-file.jpg?signature=abc123',
        isThumbnail: true,
        expiresIn: 3600
      });
      
      // Check second result (full image)
      expect(data.results[1]).toMatchObject({
        mediaId: 'media-2',
        signedUrl: 'https://signed-url.r2.dev/test-file.jpg?signature=abc123',
        isThumbnail: false,
        expiresIn: 3600
      });
      
      // Check third result (custom expiration)
      expect(data.results[2]).toMatchObject({
        mediaId: 'media-3',
        signedUrl: 'https://signed-url.r2.dev/test-file.jpg?signature=abc123',
        isThumbnail: true,
        expiresIn: 7200
      });
    });

    it('should handle mixed success and failure results', async () => {
      const requestBody = {
        requests: [
          { mediaId: 'media-1', isThumbnail: true }, // Should succeed
          { mediaId: 'non-existent', isThumbnail: false }, // Should fail
          { mediaId: 'media-2', isThumbnail: true } // Should succeed
        ]
      };

      const request = createMockNextRequest('http://localhost:3000/api/media/signed-url/batch', requestBody);
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false); // Not all succeeded
      expect(data.processed).toBe(2);
      expect(data.errors).toBe(1);
      expect(data.results).toHaveLength(3);
      
      // Check successful results
      expect(data.results[0]).toMatchObject({
        mediaId: 'media-1',
        signedUrl: expect.any(String),
        isThumbnail: true
      });
      
      // Check failed result
      expect(data.results[1]).toMatchObject({
        mediaId: 'non-existent',
        isThumbnail: false,
        error: 'Media not found'
      });
      
      // Check second successful result
      expect(data.results[2]).toMatchObject({
        mediaId: 'media-2',
        signedUrl: expect.any(String),
        isThumbnail: true
      });
    });

    it('should limit batch size to 50 requests', async () => {
      const requests = Array.from({ length: 51 }, (_, i) => ({
        mediaId: `media-${i}`,
        isThumbnail: true
      }));

      const requestBody = { requests };
      const request = createMockNextRequest('http://localhost:3000/api/media/signed-url/batch', requestBody);
      
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Batch size limited to 50 requests');
    });

    it('should reject unauthorized requests', async () => {
      const { auth } = require('@clerk/nextjs/server');
      auth.mockResolvedValue({ userId: null });

      const requestBody = {
        requests: [{ mediaId: 'media-1', isThumbnail: true }]
      };

      const request = createMockNextRequest('http://localhost:3000/api/media/signed-url/batch', requestBody);
      
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should reject users without access', async () => {
      const { checkUserHasAccessSmart } = require('@/lib/server-auth');
      checkUserHasAccessSmart.mockResolvedValue(false);

      const requestBody = {
        requests: [{ mediaId: 'media-1', isThumbnail: true }]
      };

      const request = createMockNextRequest('http://localhost:3000/api/media/signed-url/batch', requestBody);
      
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('should validate request body format', async () => {
      const invalidBodies = [
        {}, // Missing requests
        { requests: null }, // Invalid requests
        { requests: 'not-an-array' }, // Invalid requests type
        { requests: [] } // Empty requests
      ];

      for (const body of invalidBodies) {
        const request = createMockNextRequest('http://localhost:3000/api/media/signed-url/batch', body);
        const response = await POST(request);
        
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Missing or invalid requests array');
      }
    });

    it('should handle R2 service errors gracefully', async () => {
      const { generatePresignedDownloadUrl } = require('@/lib/r2');
      generatePresignedDownloadUrl.mockRejectedValue(new Error('R2 service unavailable'));

      const requestBody = {
        requests: [{ mediaId: 'media-1', isThumbnail: true }]
      };

      const request = createMockNextRequest('http://localhost:3000/api/media/signed-url/batch', requestBody);
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.processed).toBe(0);
      expect(data.errors).toBe(1);
      expect(data.results[0]).toMatchObject({
        mediaId: 'media-1',
        isThumbnail: true,
        error: 'Failed to generate signed URL'
      });
    });

    it('should respect expiration time limits', async () => {
      const requestBody = {
        requests: [
          { mediaId: 'media-1', isThumbnail: true, expiresIn: 999999 } // Exceeds 24 hour limit
        ]
      };

      const request = createMockNextRequest('http://localhost:3000/api/media/signed-url/batch', requestBody);
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results[0].expiresIn).toBe(24 * 60 * 60); // 24 hours max
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/media/signed-url/batch', {
        method: 'POST',
        body: 'invalid-json',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid JSON in request body');
    });
  });
}); 