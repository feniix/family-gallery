import { requireAuth } from '@/lib/server-auth'
import { currentUser } from '@clerk/nextjs/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserButton } from '@clerk/nextjs'

export default async function GalleryPage() {
  // Ensure user is authenticated
  await requireAuth()
  
  // Get current user info
  const user = await currentUser()
  
  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Family Gallery</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.firstName || user?.emailAddresses[0]?.emailAddress}!
            </p>
          </div>
          <UserButton />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Photos & Videos</CardTitle>
              <CardDescription>
                Your family memories await
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Photo and video gallery will be implemented in Stage 2
                </p>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>
                Your account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium">Email:</span>
                <p className="text-sm text-muted-foreground">
                  {user?.emailAddresses[0]?.emailAddress}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium">Name:</span>
                <p className="text-sm text-muted-foreground">
                  {user?.firstName || 'Not set'} {user?.lastName || ''}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium">Role:</span>
                <Badge variant="secondary" className="ml-2">
                  User {/* TODO: Implement role checking in Stage 1.3 */}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Authentication working! This page is protected and requires sign-in.
          </p>
        </div>
      </div>
    </div>
  )
} 