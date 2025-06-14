import { NextRequest } from 'next/server';
import { GET } from '@/app/api/media/signed-url/[id]/route';

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
function createMockNextRequest(url: string, options: { method?: string } = {}) {
  return new NextRequest(url, {
    method: options.method || 'GET',
  });
}

describe('Signed URL API Endpoint', () => {
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
      media: [{
        id: 'test-media-id',
        originalFilename: 'test-image.jpg',
        path: '2024/01/test-image.jpg',
        thumbnailPath: '2024/01/test-image-thumb.jpg',
        type: 'photo'
      }]
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

  describe('GET /api/media/signed-url/[id]', () => {
    it('should generate signed URL for authenticated user', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/media/signed-url/test-media-id');
      const params = Promise.resolve({ id: 'test-media-id' });
      
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('signedUrl');
      expect(data).toHaveProperty('expiresIn');
      expect(data).toHaveProperty('expiresAt');
      expect(data).toHaveProperty('mediaId', 'test-media-id');
      expect(data.signedUrl).toBe('https://signed-url.r2.dev/test-file.jpg?signature=abc123');
    });

    it('should generate thumbnail signed URL when requested', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/media/signed-url/test-media-id?thumbnail=true');
      const params = Promise.resolve({ id: 'test-media-id' });
      
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isThumbnail).toBe(true);
      
      // Verify generatePresignedDownloadUrl was called with thumbnail path
      const { generatePresignedDownloadUrl } = require('@/lib/r2');
      expect(generatePresignedDownloadUrl).toHaveBeenCalledWith('2024/01/test-image-thumb.jpg', 3600);
    });

    it('should respect custom expiration time', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/media/signed-url/test-media-id?expires=7200');
      const params = Promise.resolve({ id: 'test-media-id' });
      
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.expiresIn).toBe(7200);
      
      // Verify generatePresignedDownloadUrl was called with custom expiration
      const { generatePresignedDownloadUrl } = require('@/lib/r2');
      expect(generatePresignedDownloadUrl).toHaveBeenCalledWith('2024/01/test-image.jpg', 7200);
    });

    it('should limit expiration time to maximum', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/media/signed-url/test-media-id?expires=999999');
      const params = Promise.resolve({ id: 'test-media-id' });
      
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.expiresIn).toBe(24 * 60 * 60); // 24 hours max
    });

    it('should reject unauthorized requests', async () => {
      const { auth } = require('@clerk/nextjs/server');
      auth.mockResolvedValue({ userId: null });

      const request = createMockNextRequest('http://localhost:3000/api/media/signed-url/test-media-id');
      const params = Promise.resolve({ id: 'test-media-id' });
      
      const response = await GET(request, { params });

      expect(response.status).toBe(401);
    });

    it('should reject users without access', async () => {
      const { checkUserHasAccessSmart } = require('@/lib/server-auth');
      checkUserHasAccessSmart.mockResolvedValue(false);

      const request = createMockNextRequest('http://localhost:3000/api/media/signed-url/test-media-id');
      const params = Promise.resolve({ id: 'test-media-id' });
      
      const response = await GET(request, { params });

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent media', async () => {
      const { getMediaDb } = require('@/lib/json-db');
      const mockMediaDb = {
        read: jest.fn().mockResolvedValue({ media: [] })
      };
      getMediaDb.mockReturnValue(mockMediaDb);

      const request = createMockNextRequest('http://localhost:3000/api/media/signed-url/non-existent-id');
      const params = Promise.resolve({ id: 'non-existent-id' });
      
      const response = await GET(request, { params });

      expect(response.status).toBe(404);
    });

    it('should handle R2 errors gracefully', async () => {
      const { generatePresignedDownloadUrl } = require('@/lib/r2');
      generatePresignedDownloadUrl.mockRejectedValue(new Error('R2 service unavailable'));

      const request = createMockNextRequest('http://localhost:3000/api/media/signed-url/test-media-id');
      const params = Promise.resolve({ id: 'test-media-id' });
      
      const response = await GET(request, { params });

      expect(response.status).toBe(500);
    });
  });
}); 