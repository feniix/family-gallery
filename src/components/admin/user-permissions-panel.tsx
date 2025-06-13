'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { 
  Shield, 
  Eye, 
  Upload, 
  Edit, 
  Trash2, 
  Share2, 
  Users, 
  Settings,
  Lock,
  Unlock,
  Info
} from 'lucide-react'

interface UserPermissions {
  userId: string
  role: 'admin' | 'family' | 'extended-family' | 'friend' | 'guest'
  permissions: {
    canView: string[]
    canUpload: boolean
    canTag: boolean
    canShare: string[]
    canDelete: boolean
    canManageUsers: boolean
  }
  customAccess?: {
    allowedTags?: string[]
    deniedTags?: string[]
    allowedYears?: number[]
    deniedYears?: number[]
  }
}

interface UserPermissionsPanelProps {
  userId: string
  userRole: 'admin' | 'family' | 'extended-family' | 'friend' | 'guest'
  onPermissionsChange?: (permissions: UserPermissions) => void
}

const rolePermissions = {
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
    canView: [],
    canUpload: false,
    canTag: false,
    canShare: [],
    canDelete: false,
    canManageUsers: false
  }
}

export default function UserPermissionsPanel({ 
  userId, 
  userRole, 
  onPermissionsChange 
}: UserPermissionsPanelProps) {
  const [permissions, setPermissions] = useState<UserPermissions>({
    userId,
    role: userRole,
    permissions: rolePermissions[userRole],
    customAccess: {}
  })
  
  const [hasCustomPermissions, setHasCustomPermissions] = useState(false)

  // Update permissions when role changes
  useEffect(() => {
    if (!hasCustomPermissions) {
      setPermissions(prev => ({
        ...prev,
        role: userRole,
        permissions: rolePermissions[userRole]
      }))
    }
  }, [userRole, hasCustomPermissions])

  // Handle permission changes
  const updatePermission = (key: keyof UserPermissions['permissions'], value: any) => {
    const newPermissions = {
      ...permissions,
      permissions: {
        ...permissions.permissions,
        [key]: value
      }
    }
    setPermissions(newPermissions)
    setHasCustomPermissions(true)
    onPermissionsChange?.(newPermissions)
  }

  // Handle custom access changes
  const updateCustomAccess = (key: keyof NonNullable<UserPermissions['customAccess']>, value: any) => {
    const newPermissions = {
      ...permissions,
      customAccess: {
        ...permissions.customAccess,
        [key]: value
      }
    }
    setPermissions(newPermissions)
    setHasCustomPermissions(true)
    onPermissionsChange?.(newPermissions)
  }

  // Reset to role defaults
  const resetToDefaults = () => {
    const defaultPermissions = {
      userId,
      role: userRole,
      permissions: rolePermissions[userRole],
      customAccess: {}
    }
    setPermissions(defaultPermissions)
    setHasCustomPermissions(false)
    onPermissionsChange?.(defaultPermissions)
    toast.success('Permissions reset to role defaults')
  }

  const visibilityLevels = [
    { value: 'public', label: 'Public', description: 'Visible to everyone' },
    { value: 'family', label: 'Family', description: 'Core family members only' },
    { value: 'extended-family', label: 'Extended Family', description: 'Extended family and relatives' },
    { value: 'private', label: 'Private', description: 'Admin only' }
  ]

  const permissionCategories = [
    {
      key: 'canView',
      icon: Eye,
      title: 'View Permissions',
      description: 'What content this user can see',
      type: 'multi-select' as const
    },
    {
      key: 'canUpload',
      icon: Upload,
      title: 'Upload Content',
      description: 'Can upload photos and videos',
      type: 'boolean' as const
    },
    {
      key: 'canTag',
      icon: Edit,
      title: 'Tag Content',
      description: 'Can add and edit tags on media',
      type: 'boolean' as const
    },
    {
      key: 'canShare',
      icon: Share2,
      title: 'Share Permissions',
      description: 'What content this user can share',
      type: 'multi-select' as const
    },
    {
      key: 'canDelete',
      icon: Trash2,
      title: 'Delete Content',
      description: 'Can delete photos and videos',
      type: 'boolean' as const
    },
    {
      key: 'canManageUsers',
      icon: Users,
      title: 'Manage Users',
      description: 'Can approve and manage other users',
      type: 'boolean' as const
    }
  ]

  return (
    <div className="space-y-6">
      {/* Role Badge and Reset */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="font-medium">User Permissions</h3>
            <p className="text-sm text-muted-foreground">
              Role: <Badge variant="outline">{userRole}</Badge>
              {hasCustomPermissions && (
                <Badge variant="secondary" className="ml-2">Custom</Badge>
              )}
            </p>
          </div>
        </div>
        {hasCustomPermissions && (
          <Button size="sm" variant="outline" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
        )}
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Basic Permissions</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Access</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content Permissions</CardTitle>
              <CardDescription>
                Control what this user can see and do with gallery content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {permissionCategories.map((category) => {
                const Icon = category.icon
                return (
                  <div key={category.key} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="font-medium">{category.title}</Label>
                        <p className="text-xs text-muted-foreground">{category.description}</p>
                      </div>
                    </div>

                    {category.type === 'boolean' && (
                      <div className="pl-6">
                        <Checkbox
                          checked={permissions.permissions[category.key as keyof UserPermissions['permissions']] as boolean}
                          onCheckedChange={(checked: boolean) => updatePermission(category.key as any, checked)}
                        />
                      </div>
                    )}

                    {category.type === 'multi-select' && (
                      <div className="pl-6 space-y-2">
                        {visibilityLevels.map((level) => (
                          <div key={level.value} className="flex items-center space-x-2">
                            <Checkbox
                              checked={(permissions.permissions[category.key as keyof UserPermissions['permissions']] as string[])?.includes(level.value)}
                              onCheckedChange={(checked: boolean) => {
                                const currentValues = permissions.permissions[category.key as keyof UserPermissions['permissions']] as string[]
                                const newValues = checked
                                  ? [...(currentValues || []), level.value]
                                  : (currentValues || []).filter(v => v !== level.value)
                                updatePermission(category.key as any, newValues)
                              }}
                            />
                            <div>
                              <Label className="text-sm">{level.label}</Label>
                              <p className="text-xs text-muted-foreground">{level.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t my-4" />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Advanced Access Control</CardTitle>
              <CardDescription>
                Fine-tune access to specific content and features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tag-based Access */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="font-medium">Tag-based Access</Label>
                    <p className="text-xs text-muted-foreground">Control access based on content tags</p>
                  </div>
                </div>
                
                <div className="pl-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center space-x-1">
                      <Unlock className="h-3 w-3" />
                      <span>Allowed Tags (exclusive access)</span>
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      User can only see content with these tags
                    </div>
                    {/* Tag selection would go here */}
                    <div className="p-2 border rounded text-xs text-muted-foreground">
                      No specific tag restrictions
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm flex items-center space-x-1">
                      <Lock className="h-3 w-3" />
                      <span>Denied Tags (restrictions)</span>
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      User cannot see content with these tags
                    </div>
                    <div className="p-2 border rounded text-xs text-muted-foreground">
                      No tag restrictions
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t my-4" />

              {/* Year-based Access */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="font-medium">Time-based Access</Label>
                    <p className="text-xs text-muted-foreground">Control access to content by year</p>
                  </div>
                </div>
                
                <div className="pl-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Allowed Years</Label>
                    <div className="text-xs text-muted-foreground">
                      Restrict access to specific years only
                    </div>
                    <div className="p-2 border rounded text-xs text-muted-foreground">
                      All years accessible (based on visibility permissions)
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Denied Years</Label>
                    <div className="text-xs text-muted-foreground">
                      Prevent access to specific years
                    </div>
                    <div className="p-2 border rounded text-xs text-muted-foreground">
                      No year restrictions
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permission Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Info className="h-4 w-4" />
                <span>Permission Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Can View</Label>
                  <div className="flex flex-wrap gap-1">
                    {permissions.permissions.canView.length > 0 ? (
                      permissions.permissions.canView.map(level => (
                        <Badge key={level} variant="outline" className="text-xs">
                          {level}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="destructive" className="text-xs">No access</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Can Share</Label>
                  <div className="flex flex-wrap gap-1">
                    {permissions.permissions.canShare.length > 0 ? (
                      permissions.permissions.canShare.map(level => (
                        <Badge key={level} variant="outline" className="text-xs">
                          {level}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="destructive" className="text-xs">Cannot share</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Actions</Label>
                  <div className="flex flex-wrap gap-1">
                    {permissions.permissions.canUpload && (
                      <Badge variant="secondary" className="text-xs">Upload</Badge>
                    )}
                    {permissions.permissions.canTag && (
                      <Badge variant="secondary" className="text-xs">Tag</Badge>
                    )}
                    {permissions.permissions.canDelete && (
                      <Badge variant="secondary" className="text-xs">Delete</Badge>
                    )}
                    {permissions.permissions.canManageUsers && (
                      <Badge variant="secondary" className="text-xs">Manage Users</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 