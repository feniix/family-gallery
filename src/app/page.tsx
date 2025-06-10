import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

export default function Home() {
  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold">Family Gallery</h1>
            <SignedIn>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <SignInButton>
                <Button>Sign In</Button>
              </SignInButton>
            </SignedOut>
          </div>
          <p className="text-muted-foreground text-lg">
            A private family photo and video gallery
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Setup Status
                <Badge variant="secondary">Stage 1.3</Badge>
              </CardTitle>
              <CardDescription>
                R2 Storage & JSON Database implemented
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">R2 client configuration</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">JSON file management with locking</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Presigned URL generation</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Upload queue system</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">API routes for media operations</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>
                Upcoming implementation stages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Authentication (Clerk)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">R2 Storage & JSON DB</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Stage 2.1</Badge>
                <span className="text-sm">Admin Upload Interface</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Environment</CardTitle>
              <CardDescription>
                Development configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Dev</Badge>
                <span className="text-sm">Environment variables ready</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Config</Badge>
                <span className="text-sm">Configuration utilities</span>
              </div>
              <Button className="w-full mt-4" variant="outline">
                Ready for Stage 2.1
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Stage 1.3 completed successfully! 🎉
          </p>
        </div>
      </div>
    </div>
  );
}
