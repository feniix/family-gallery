'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();

  // Redirect anonymous users to sign-in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = '/sign-in';
    }
  }, [isLoaded, isSignedIn]);

  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not signed in (redirect will happen)
  if (!isSignedIn) {
    return null;
  }

  // Authenticated user view - show detailed information
  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Welcome to Family Gallery</h1>
          <p className="text-muted-foreground text-lg">
            A private family photo and video gallery with secure upload and sharing
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Setup Status
                <Badge variant="default">Stage 4.3</Badge>
              </CardTitle>
              <CardDescription>
                Admin Dashboard completed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Drag-and-drop upload interface</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Multi-file upload support</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Upload progress tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Admin-only access protection</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">File validation and error handling</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>
                Available functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Authentication (Google/Facebook)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Admin role management</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">R2 cloud storage</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Upload interface</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Gallery interface</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Subject filtering</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Admin dashboard</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Get started with the gallery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/gallery">
                <Button className="w-full" variant="outline">
                  View Gallery
                </Button>
              </Link>
              <Link href="/admin/upload">
                <Button className="w-full">
                  Upload Photos & Videos
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Upload requires admin privileges
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Stage 4.3 (Basic Admin Dashboard) completed successfully! 🎉
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Next: Stage 5.1 - Production Readiness & Deployment
          </p>
        </div>
      </div>
    </div>
  );
}
