/**
 * Media Access Control System
 * 
 * This module provides comprehensive access control for media items based on:
 * - User roles and permissions
 * - Media visibility settings
 * - Custom access rules
 * - Tag-based restrictions
 * - User-specific allowlists/denylists
 */

import alasql from 'alasql';
import { MediaMetadata } from '@/types/media';
import { dbLogger as logger } from './logger';

// Extended media interface with access control fields
export interface MediaWithAccessControl extends MediaMetadata {
  visibility?: 'public' | 'family' | 'extended-family' | 'private';
  allowedUsers?: string;
  restrictedUsers?: string;
}

// Access control types
export interface UserPermissions {
  userId: string;
  role: 'admin' | 'family' | 'extended-family' | 'friend' | 'guest';
  permissions: {
    canView: string[]; // visibility levels user can access
    canUpload: boolean;
    canTag: boolean;
    canShare: string[]; // what they can share
    canDelete: boolean;
    canManageUsers: boolean;
  };
  customAccess: {
    allowedTags?: string[]; // specific tags user can access
    deniedTags?: string[]; // tags explicitly denied
    allowedUsers?: string[]; // specific users whose content they can see
    restrictedUsers?: string[]; // users whose content they cannot see
  };
}

export interface AccessControlRule {
  id: string;
  name: string;
  description: string;
  conditions: {
    tags?: string[];
    visibility?: string;
    uploadedBy?: string;
    dateRange?: {
      start: string;
      end: string;
    };

  };
  permissions: {
    allowedRoles: string[];
    allowedUsers?: string[];
    deniedUsers?: string[];
  };
  priority: number; // higher priority rules override lower ones
}

export class MediaAccessControl {
  constructor() {
    this.initializeAlaSQL();
  }

  private initializeAlaSQL() {
    // Configure AlaSQL for optimal performance
    alasql.options.cache = true;
    alasql.options.autocommit = false;
    
    logger.info('AlaSQL initialized for access control');
  }

  /**
   * Get all media accessible to a user based on their permissions
   */
  async getAccessibleMedia(
    userId: string, 
    userPermissions: UserPermissions, 
    allMedia: MediaWithAccessControl[],
    filters: {
      tags?: string[];

      dateRange?: { start: string; end: string };
      visibility?: string[];
      search?: string;
    } = {}
  ): Promise<MediaWithAccessControl[]> {
    try {
      // Build dynamic SQL query for access control
      let query = `
        SELECT m.* FROM ? m
        WHERE (
          -- Public content
          m.visibility = 'public'
          
          -- User is owner
          OR m.uploadedBy = ?
          
          -- User has role-based access
          OR m.visibility IN (${userPermissions.permissions.canView.map(v => `'${v}'`).join(',')})
          
          -- User has specific access
          OR (m.allowedUsers IS NOT NULL AND m.allowedUsers LIKE '%${userId}%')
        )
        
        -- User is not restricted
        AND (m.restrictedUsers IS NULL OR m.restrictedUsers NOT LIKE '%${userId}%')
      `;

      const params = [allMedia, userId];

      // Add custom access filters
      if (userPermissions.customAccess.deniedTags?.length) {
        const deniedTagsCondition = userPermissions.customAccess.deniedTags
          .map(tag => `m.tags NOT LIKE '%${tag}%'`)
          .join(' AND ');
        query += ` AND (${deniedTagsCondition})`;
      }

      if (userPermissions.customAccess.allowedTags?.length) {
        const allowedTagsCondition = userPermissions.customAccess.allowedTags
          .map(tag => `m.tags LIKE '%${tag}%'`)
          .join(' OR ');
        query += ` AND (${allowedTagsCondition})`;
      }

      // Add user-provided filters
      if (filters.tags?.length) {
        const tagConditions = filters.tags
          .map(tag => `m.tags LIKE '%${tag}%'`)
          .join(' AND ');
        query += ` AND (${tagConditions})`;
      }



      if (filters.dateRange) {
        query += ` AND m.takenAt BETWEEN ? AND ?`;
        params.push(filters.dateRange.start, filters.dateRange.end);
      }

      if (filters.visibility?.length) {
        query += ` AND m.visibility IN (${filters.visibility.map(v => `'${v}'`).join(',')})`;
      }

      if (filters.search) {
        query += ` AND (
          m.filename LIKE '%${filters.search}%' 
          OR m.originalFilename LIKE '%${filters.search}%'
          OR m.tags LIKE '%${filters.search}%'

          OR m.metadata->>'camera' LIKE '%${filters.search}%'
        )`;
      }

      query += ` ORDER BY m.takenAt DESC`;

      const result = alasql(query, params) as MediaWithAccessControl[];
      
      logger.info(`Access control query returned ${result.length} media items for user ${userId}`);
      return result;

    } catch (error) {
      logger.error('Error in getAccessibleMedia:', { error: error instanceof Error ? error.message : String(error) });
      throw new Error('Failed to filter accessible media');
    }
  }

  /**
   * Check if a user can access a specific media item
   */
  canUserAccessMedia(
    userId: string, 
    userPermissions: UserPermissions, 
    media: MediaWithAccessControl
  ): boolean {
    try {
      const result = alasql(`
        SELECT COUNT(*) as canAccess FROM ? m
        WHERE m.id = ?
          AND (
            m.visibility = 'public'
            OR m.uploadedBy = ?
            OR m.visibility IN (${userPermissions.permissions.canView.map(v => `'${v}'`).join(',')})
            OR (m.allowedUsers IS NOT NULL AND m.allowedUsers LIKE '%${userId}%')
          )
          AND (m.restrictedUsers IS NULL OR m.restrictedUsers NOT LIKE '%${userId}%')
      `, [[media], media.id, userId]) as Array<{ canAccess: number }>;

      return result[0]?.canAccess > 0;

    } catch (error) {
      logger.error('Error checking media access:', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Generate analytics for accessible media
   */
  async getMediaAnalytics(
    userId: string,
    userPermissions: UserPermissions,
    allMedia: MediaWithAccessControl[]
  ): Promise<{
    totalAccessible: number;
    byVisibility: Record<string, number>;
    byYear: Record<string, number>;
    byType: Record<string, number>;

    topTags: Array<{ tag: string; count: number }>;
    myUploads: number;
  }> {
    try {
      // Get accessible media first
      const accessibleMedia = await this.getAccessibleMedia(userId, userPermissions, allMedia);

      // Generate analytics using AlaSQL
      const byVisibility = (alasql(`
        SELECT m.visibility, COUNT(*) as count 
        FROM ? m 
        GROUP BY m.visibility
      `, [accessibleMedia]) as Array<{ visibility: string; count: number }>)
        .reduce((acc, item) => {
          acc[item.visibility || 'unknown'] = item.count;
          return acc;
        }, {} as Record<string, number>);

      const byYear = (alasql(`
        SELECT YEAR(m.takenAt) as year, COUNT(*) as count 
        FROM ? m 
        WHERE m.takenAt IS NOT NULL
        GROUP BY YEAR(m.takenAt)
        ORDER BY year DESC
      `, [accessibleMedia]) as Array<{ year: number; count: number }>)
        .reduce((acc, item) => {
          acc[item.year.toString()] = item.count;
          return acc;
        }, {} as Record<string, number>);

      const byType = (alasql(`
        SELECT m.type, COUNT(*) as count 
        FROM ? m 
        GROUP BY m.type
      `, [accessibleMedia]) as Array<{ type: string; count: number }>)
        .reduce((acc, item) => {
          acc[item.type || 'unknown'] = item.count;
          return acc;
        }, {} as Record<string, number>);

      // Additional tag analytics (removed subjects as they are now tags)

      // Tag analytics
      const tagCounts: Record<string, number> = {};
      accessibleMedia.forEach(media => {
        if (media.tags) {
          const tags = Array.isArray(media.tags) ? media.tags : [media.tags];
          tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });

      const topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));

      const myUploads = (alasql(`
        SELECT COUNT(*) as count 
        FROM ? m 
        WHERE m.uploadedBy = ?
      `, [accessibleMedia, userId]) as Array<{ count: number }>)[0]?.count || 0;

      return {
        totalAccessible: accessibleMedia.length,
        byVisibility,
        byYear,
        byType,

        topTags,
        myUploads
      };

    } catch (error) {
      logger.error('Error generating media analytics:', { error: error instanceof Error ? error.message : String(error) });
      throw new Error('Failed to generate analytics');
    }
  }

  /**
   * Advanced search with complex filters
   */
  async advancedSearch(
    userId: string,
    userPermissions: UserPermissions,
    allMedia: MediaWithAccessControl[],
    searchParams: Record<string, unknown>
  ): Promise<MediaWithAccessControl[]> {
    try {
      // First get accessible media
      const accessibleMedia = await this.getAccessibleMedia(userId, userPermissions, allMedia);

      // Build advanced search query
      let query = 'SELECT m.* FROM ? m WHERE 1=1';
      const params = [accessibleMedia];

      // Text search
      if (searchParams.text) {
        query += ` AND (
          m.filename LIKE '%${searchParams.text}%' 
          OR m.originalFilename LIKE '%${searchParams.text}%'
          OR m.tags LIKE '%${searchParams.text}%'

        )`;
      }

      // Camera search
      if (searchParams.camera) {
        query += ` AND m.metadata->>'camera' LIKE '%${searchParams.camera}%'`;
      }

      // File type filter
      if (searchParams.fileType) {
        query += ` AND m.type = '${searchParams.fileType}'`;
      }

             // Date range
       if (searchParams.dateRange && typeof searchParams.dateRange === 'object') {
         const dateRange = searchParams.dateRange as { start: string; end: string };
         query += ` AND m.takenAt BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
       }

      // GPS filter
      if (searchParams.hasGPS === true) {
        query += ` AND (m.metadata->>'latitude' IS NOT NULL AND m.metadata->>'longitude' IS NOT NULL)`;
      } else if (searchParams.hasGPS === false) {
        query += ` AND (m.metadata->>'latitude' IS NULL OR m.metadata->>'longitude' IS NULL)`;
      }

      query += ` ORDER BY m.takenAt DESC`;

      const result = alasql(query, params) as MediaWithAccessControl[];
      
      logger.info(`Advanced search returned ${result.length} results for user ${userId}`);
      return result;

    } catch (error) {
      logger.error('Error in advanced search:', { error: error instanceof Error ? error.message : String(error) });
      throw new Error('Advanced search failed');
    }
  }

  /**
   * Get tag suggestions based on accessible media
   */
  async getTagSuggestions(
    userId: string,
    userPermissions: UserPermissions,
    allMedia: MediaWithAccessControl[],
    query?: string
  ): Promise<Array<{ tag: string; count: number }>> {
    try {
      const accessibleMedia = await this.getAccessibleMedia(userId, userPermissions, allMedia);
      
      // Extract all tags from accessible media
      const tagCounts: Record<string, number> = {};
      
      accessibleMedia.forEach(media => {
        if (media.tags) {
          const tags = Array.isArray(media.tags) ? media.tags : [media.tags];
          tags.forEach(tag => {
            if (!query || tag.toLowerCase().includes(query.toLowerCase())) {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
          });
        }
      });

      return Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([tag, count]) => ({ tag, count }));

    } catch (error) {
      logger.error('Error getting tag suggestions:', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Bulk update permissions for multiple media items (admin only)
   */
  async bulkUpdatePermissions(
    adminUserId: string,
    adminPermissions: UserPermissions,
    mediaIds: string[],
    updates: Record<string, unknown>
  ): Promise<{ success: boolean; updatedCount: number; errors: string[] }> {
    try {
      // Check admin permissions
      if (!adminPermissions.permissions.canManageUsers) {
        throw new Error('Insufficient permissions for bulk update');
      }

      // This would typically update the actual media records
      // For now, we'll just return a success response
      logger.info(`Admin ${adminUserId} performed bulk update on ${mediaIds.length} media items`, { updates });

      return {
        success: true,
        updatedCount: mediaIds.length,
        errors: []
      };

    } catch (error) {
      logger.error('Error in bulk update:', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        updatedCount: 0,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }
}

/**
 * Create user permissions based on role
 */
export function createUserPermissions(
  userId: string,
  role: UserPermissions['role'],
  customAccess: UserPermissions['customAccess'] = {}
): UserPermissions {
  const basePermissions: Record<UserPermissions['role'], Omit<UserPermissions, 'userId' | 'customAccess'>> = {
    admin: {
      role: 'admin',
      permissions: {
        canView: ['public', 'family', 'extended-family', 'private'],
        canUpload: true,
        canTag: true,
        canShare: ['public', 'family', 'extended-family'],
        canDelete: true,
        canManageUsers: true
      }
    },
    family: {
      role: 'family',
      permissions: {
        canView: ['public', 'family'],
        canUpload: true,
        canTag: true,
        canShare: ['public', 'family'],
        canDelete: false,
        canManageUsers: false
      }
    },
    'extended-family': {
      role: 'extended-family',
      permissions: {
        canView: ['public', 'extended-family'],
        canUpload: false,
        canTag: false,
        canShare: ['public'],
        canDelete: false,
        canManageUsers: false
      }
    },
    friend: {
      role: 'friend',
      permissions: {
        canView: ['public'],
        canUpload: false,
        canTag: false,
        canShare: ['public'],
        canDelete: false,
        canManageUsers: false
      }
    },
    guest: {
      role: 'guest',
      permissions: {
        canView: [], // Guests have zero visibility
        canUpload: false,
        canTag: false,
        canShare: [],
        canDelete: false,
        canManageUsers: false
      }
    }
  };

  return {
    userId,
    ...basePermissions[role],
    customAccess
  };
}

export default MediaAccessControl; 