'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useIsAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Image, 
  Video, 
  Calendar, 
  Database,
  Upload,
  AlertTriangle,
  CheckCircle,
  Settings,
  Activity,
  HardDrive
} from 'lucide-react'
import { toast } from 'sonner'

interface DashboardStats {
  media: {
    total: number
    images: number
    videos: number
    byYear: Record<string, number>
    recentUploads: Array<{
      id: string
      filename: string
      uploadedAt: string
      uploadedBy: string
      type: 'photo' | 'video'
    }>
  }
  users: {
    total: number
    admins: number
    regular: number
    recentUsers: Array<{
      id: string
      email: string
      name: string
      role: 'admin' | 'user'
      created: string
      lastLogin?: string
    }>
  }
  storage: {
    totalFiles: number
    estimatedSize: string
    years: number[]
  }
  system: {
    version: string
    lastIndexUpdate: string
    dbStatus: 'healthy' | 'warning' | 'error'
  }
}

export default function AdminDashboardPage() {
  const { isLoaded } = useUser()
  const isAdmin = useIsAdmin()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch dashboard statistics
  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/stats')
      if (!response.ok) {
        throw new Error('Failed to fetch statistics')
      }
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      toast.error('Failed to load dashboard statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoaded && isAdmin) {
      fetchStats()
    }
  }, [isLoaded, isAdmin])

  // Redirect if not admin
  if (isLoaded && !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              You need administrator privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Show loading state
  if (!isLoaded || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error || !stats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>
              {error || 'Failed to load dashboard data'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchStats}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage the family gallery and monitor system status
            </p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={fetchStats} variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Media</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.media.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.media.images} photos, {stats.media.videos} videos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.users.admins} admins, {stats.users.regular} users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.storage.estimatedSize}</div>
                <p className="text-xs text-muted-foreground">
                  Across {stats.storage.years.length} years
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                {stats.system.dbStatus === 'healthy' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{stats.system.dbStatus}</div>
                <p className="text-xs text-muted-foreground">
                  Version {stats.system.version}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Uploads</CardTitle>
                <CardDescription>Latest media files uploaded to the gallery</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.media.recentUploads.slice(0, 5).map((upload) => (
                    <div key={upload.id} className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {upload.type === 'photo' ? (
                          // eslint-disable-next-line jsx-a11y/alt-text
                          <Image className="h-4 w-4 text-green-500" />
                        ) : (
                          <Video className="h-4 w-4 text-purple-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{upload.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(upload.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {upload.type}
                      </Badge>
                    </div>
                  ))}
                  {stats.media.recentUploads.length === 0 && (
                    <p className="text-sm text-muted-foreground">No recent uploads</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
                <CardDescription>New users who joined the family gallery</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.users.recentUsers.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Users className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{user.name || user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(user.created).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                  ))}
                  {stats.users.recentUsers.length === 0 && (
                    <p className="text-sm text-muted-foreground">No recent users</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="media" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Media by Year</CardTitle>
                <CardDescription>Distribution of photos and videos by year</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.media.byYear)
                    .sort(([a], [b]) => parseInt(b) - parseInt(a))
                    .map(([year, count]) => (
                    <div key={year} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{year}</span>
                      </div>
                      <Badge variant="outline">{count} files</Badge>
                    </div>
                  ))}
                  {Object.keys(stats.media.byYear).length === 0 && (
                    <p className="text-sm text-muted-foreground">No media files found</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Media Types</CardTitle>
                <CardDescription>Breakdown by file type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {/* eslint-disable-next-line jsx-a11y/alt-text */}
                      <Image className="h-4 w-4 text-green-500" />
                      <span>Photos</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{stats.media.images.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {stats.media.total > 0 ? 
                          Math.round((stats.media.images / stats.media.total) * 100) : 0
                        }%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Video className="h-4 w-4 text-purple-500" />
                      <span>Videos</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{stats.media.videos.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {stats.media.total > 0 ? 
                          Math.round((stats.media.videos / stats.media.total) * 100) : 0
                        }%
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Recent Uploads</CardTitle>
              <CardDescription>Complete list of recent media uploads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.media.recentUploads.map((upload) => (
                  <div key={upload.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-3">
                                              {upload.type === 'photo' ? (
                          // eslint-disable-next-line jsx-a11y/alt-text
                          <Image className="h-5 w-5 text-green-500" />
                        ) : (
                        <Video className="h-5 w-5 text-purple-500" />
                      )}
                      <div>
                        <p className="font-medium">{upload.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(upload.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {upload.type}
                    </Badge>
                  </div>
                ))}
                {stats.media.recentUploads.length === 0 && (
                  <p className="text-sm text-muted-foreground">No uploads found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.users.recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded">
                    <div className="flex items-center space-x-4">
                      <Users className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">{user.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(user.created).toLocaleDateString()}
                          {user.lastLogin && ` • Last login ${new Date(user.lastLogin).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                ))}
                {stats.users.recentUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground">No users found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>Current system status and version info</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Version</span>
                    <Badge variant="outline">{stats.system.version}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database Status</span>
                    <Badge variant={
                      stats.system.dbStatus === 'healthy' ? 'default' : 
                      stats.system.dbStatus === 'warning' ? 'secondary' : 'destructive'
                    }>
                      {stats.system.dbStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Index Update</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(stats.system.lastIndexUpdate).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storage Information</CardTitle>
                <CardDescription>File storage and organization details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Files</span>
                    <span className="text-sm">{stats.storage.totalFiles.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estimated Size</span>
                    <span className="text-sm">{stats.storage.estimatedSize}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Years with Data</span>
                    <span className="text-sm">{stats.storage.years.length}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-sm font-medium">Years: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {stats.storage.years.sort().map(year => (
                        <Badge key={year} variant="outline" className="text-xs">
                          {year}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Actions</CardTitle>
              <CardDescription>Administrative actions and maintenance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Button variant="outline" className="justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Rebuild Media Index
                </Button>
                <Button variant="outline" className="justify-start">
                  <Database className="h-4 w-4 mr-2" />
                  Database Health Check
                </Button>
                <Button variant="outline" className="justify-start">
                  <Upload className="h-4 w-4 mr-2" />
                  Clean Orphaned Files
                </Button>
                <Button variant="outline" className="justify-start">
                  <Activity className="h-4 w-4 mr-2" />
                  Generate Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 