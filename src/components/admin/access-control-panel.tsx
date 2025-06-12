/**
 * Access Control Panel Component
 * 
 * Admin interface for managing user permissions, visibility settings,
 * and advanced tagging with AlaSQL-powered filtering.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { UserPermissions } from '@/lib/access-control';
import { MediaMetadata } from '@/types/media';
import { authLogger } from '@/lib/logger';



// Default permissions for different roles
const DEFAULT_PERMISSIONS: Record<string, UserPermissions['permissions']> = {
  admin: {
    canView: ['public', 'family', 'extended-family', 'private'],
    canUpload: true,
    canTag: true,
    canShare: ['public', 'family', 'extended-family'],
    canDelete: true,
    canManageUsers: true
  },
  family: {
    canView: ['public', 'family'],
    canUpload: true,
    canTag: true,
    canShare: ['public', 'family'],
    canDelete: false,
    canManageUsers: false
  },
  'extended-family': {
    canView: ['public', 'extended-family'],
    canUpload: false,
    canTag: false,
    canShare: ['public'],
    canDelete: false,
    canManageUsers: false
  },
  friend: {
    canView: ['public'],
    canUpload: false,
    canTag: false,
    canShare: ['public'],
    canDelete: false,
    canManageUsers: false
  },
  guest: {
    canView: ['public'],
    canUpload: false,
    canTag: false,
    canShare: [],
    canDelete: false,
    canManageUsers: false
  }
};

interface AccessControlPanelProps {
  isAdmin: boolean;
}

interface UserWithPermissions {
  id: string;
  email: string;
  name: string;
  role: UserPermissions['role'];
  permissions: UserPermissions['permissions'];
  customAccess: UserPermissions['customAccess'];
}

interface AccessControlStats {
  totalUsers: number;
  totalMedia: number;
  visibilityBreakdown: Record<string, number>;
  roleBreakdown: Record<string, number>;
  tagUsage: Array<{ tag: string; count: number }>;
}

export default function AccessControlPanel({ isAdmin }: AccessControlPanelProps) {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [stats, setStats] = useState<AccessControlStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Advanced search state
  const [advancedSearch, setAdvancedSearch] = useState({
    text: '',
    tags: [] as string[],
    dateRange: { start: '', end: '' },
    camera: '',
    fileType: '' as 'photo' | 'video' | '',
    hasGPS: undefined as boolean | undefined
  });

  const [searchResults, setSearchResults] = useState<MediaMetadata[]>([]);

  const loadAccessControlData = useCallback(async () => {
    setLoading(true);
    try {
      // Load users and stats (mock data for now)
      const mockUsers: UserWithPermissions[] = [
        {
          id: 'user1',
          email: 'admin@family.com',
          name: 'Admin User',
          role: 'admin',
          permissions: DEFAULT_PERMISSIONS.admin,
          customAccess: {}
        },
        {
          id: 'user2',
          email: 'family@example.com',
          name: 'Family Member',
          role: 'family',
          permissions: DEFAULT_PERMISSIONS.family,
          customAccess: {
            allowedTags: ['vacation', 'birthday'],
            deniedTags: ['private']
          }
        }
      ];

      const mockStats: AccessControlStats = {
        totalUsers: 2,
        totalMedia: 150,
        visibilityBreakdown: {
          public: 50,
          family: 80,
          'extended-family': 15,
          private: 5
        },
        roleBreakdown: {
          admin: 1,
          family: 1,
          'extended-family': 0,
          friend: 0,
          guest: 0
        },
        tagUsage: [
          { tag: 'vacation', count: 25 },
          { tag: 'birthday', count: 18 },
          { tag: 'holiday', count: 12 }
        ]
      };

      setUsers(mockUsers);
      setStats(mockStats);
      
    } catch (error) {
      authLogger.error('Error loading access control data', { error });
      toast.error('Failed to load access control data');
    } finally {
      setLoading(false);
    }
  }, []);



  const handleAdvancedSearch = async () => {
    setLoading(true);
    try {
      // Mock search results for now
      const mockResults: MediaMetadata[] = [
        {
          id: '1',
          filename: 'vacation_2024.jpg',
          originalFilename: 'vacation_2024.jpg',
          path: '/media/2024/vacation_2024.jpg',
          type: 'photo',
          uploadedBy: 'user1',
          uploadedAt: '2024-07-15T10:30:00Z',
          uploadSource: 'web',
          takenAt: '2024-07-15T10:30:00Z',
          dateInfo: {
            source: 'exif',
            confidence: 'high'
          },
          metadata: {
            camera: 'iPhone 15',
            width: 1920,
            height: 1080,
            size: 2048000,
            hash: 'abc123def456'
          },
          tags: ['vacation', 'beach', 'rufina', 'bernabe'],
          thumbnailPath: '/media/2024/vacation_2024_thumb.jpg',
          hasValidExif: true
        }
      ];

      setSearchResults(mockResults);
      toast.success(`Found ${mockResults.length} results`);
      
    } catch (error) {
      authLogger.error('Error performing advanced search', { error });
      toast.error('Advanced search failed');
    } finally {
      setLoading(false);
    }
  };

  const updateUserPermissions = async (userId: string, updates: Partial<UserWithPermissions>) => {
    try {
      // Mock update for now
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      ));
      toast.success('User permissions updated successfully');
    } catch (error) {
      authLogger.error('Error updating user permissions', { error });
      toast.error('Failed to update user permissions');
    }
  };

  const bulkUpdateMediaPermissions = async (mediaIds: string[], updates: Record<string, unknown>) => {
    setLoading(true);
    try {
      authLogger.debug('Bulk updating media', { mediaIds, updates });
      // Mock bulk update for now
      toast.success(`Updated permissions for ${mediaIds.length} media items`);
    } catch (error) {
      authLogger.error('Error in bulk update', { error });
      toast.error('Bulk update failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Access denied. Admin privileges required.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Access Control Panel</h2>
          <p className="text-muted-foreground">
            Manage user permissions and media visibility with advanced tagging
          </p>
        </div>
        <Button onClick={loadAccessControlData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.totalMedia}</div>
              <p className="text-sm text-muted-foreground">Total Media</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.visibilityBreakdown.public}</div>
              <p className="text-sm text-muted-foreground">Public Media</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.visibilityBreakdown.private}</div>
              <p className="text-sm text-muted-foreground">Private Media</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="search">Advanced Search</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Permissions</CardTitle>
              <CardDescription>
                Manage user roles and custom access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map(user => (
                  <div key={user.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{user.name}</h4>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Role</Label>
                        <Select
                          value={user.role}
                          onValueChange={(value) => 
                            updateUserPermissions(user.id, { 
                              role: value as UserPermissions['role'],
                              permissions: DEFAULT_PERMISSIONS[value]
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="family">Family</SelectItem>
                            <SelectItem value="extended-family">Extended Family</SelectItem>
                            <SelectItem value="friend">Friend</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Can Upload</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <Switch
                            checked={user.permissions.canUpload}
                            onCheckedChange={(checked) =>
                              updateUserPermissions(user.id, {
                                permissions: { ...user.permissions, canUpload: checked }
                              })
                            }
                          />
                          <span className="text-sm">
                            {user.permissions.canUpload ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Custom Access */}
                    <div className="space-y-2">
                      <Label>Allowed Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {user.customAccess.allowedTags?.map(tag => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <Label>Denied Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {user.customAccess.deniedTags?.map(tag => (
                          <Badge key={tag} variant="destructive">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Media Search</CardTitle>
              <CardDescription>
                Use SQL-like queries to find media with complex conditions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Text Search</Label>
                  <Input
                    placeholder="Search filenames, tags..."
                    value={advancedSearch.text}
                    onChange={(e) => setAdvancedSearch(prev => ({ ...prev, text: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label>Camera</Label>
                  <Input
                    placeholder="e.g., iPhone 13, Canon EOS"
                    value={advancedSearch.camera}
                    onChange={(e) => setAdvancedSearch(prev => ({ ...prev, camera: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label>File Type</Label>
                  <Select
                    value={advancedSearch.fileType}
                    onValueChange={(value) => 
                      setAdvancedSearch(prev => ({ ...prev, fileType: value as 'photo' | 'video' | '' }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="photo">Photos</SelectItem>
                      <SelectItem value="video">Videos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Has GPS Data</Label>
                  <Select
                    value={advancedSearch.hasGPS?.toString() || ''}
                    onValueChange={(value) => 
                      setAdvancedSearch(prev => ({ 
                        ...prev, 
                        hasGPS: value === '' ? undefined : value === 'true' 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      <SelectItem value="true">With GPS</SelectItem>
                      <SelectItem value="false">Without GPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Date Range Start</Label>
                  <Input
                    type="date"
                    value={advancedSearch.dateRange.start}
                    onChange={(e) => setAdvancedSearch(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, start: e.target.value } 
                    }))}
                  />
                </div>
                
                <div>
                  <Label>Date Range End</Label>
                  <Input
                    type="date"
                    value={advancedSearch.dateRange.end}
                    onChange={(e) => setAdvancedSearch(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, end: e.target.value } 
                    }))}
                  />
                </div>
              </div>

              <Button onClick={handleAdvancedSearch} disabled={loading} className="w-full">
                {loading ? 'Searching...' : 'Search Media'}
              </Button>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Search Results ({searchResults.length})</h4>
                  <div className="space-y-2">
                    {searchResults.map(result => (
                      <div key={result.id} className="border rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{result.filename}</span>
                          <Badge>family</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Tags: {result.tags.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Operations Tab */}
        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Media Operations</CardTitle>
              <CardDescription>
                Update permissions for multiple media items at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Media IDs (comma-separated)</Label>
                <Textarea
                  placeholder="media-id-1, media-id-2, media-id-3..."
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>New Visibility</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="extended-family">Extended Family</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Add Tags</Label>
                  <Input placeholder="tag1, tag2, tag3..." />
                </div>
              </div>

              <Button 
                onClick={() => bulkUpdateMediaPermissions(['1', '2', '3'], {})} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Updating...' : 'Apply Bulk Update'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Access Control Analytics</CardTitle>
              <CardDescription>
                Insights into media visibility and user access patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Visibility Distribution</h4>
                    <div className="space-y-2">
                      {Object.entries(stats.visibilityBreakdown).map(([visibility, count]) => (
                        <div key={visibility} className="flex items-center justify-between">
                          <span className="capitalize">{visibility}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Top Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {stats.tagUsage.map(({ tag, count }) => (
                        <Badge key={tag} variant="secondary">
                          {tag} ({count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 