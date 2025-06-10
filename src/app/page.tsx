import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function Home() {
  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Family Gallery</h1>
          <p className="text-muted-foreground text-lg">
            A private family photo and video gallery
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Setup Status
                <Badge variant="secondary">Stage 1.1</Badge>
              </CardTitle>
              <CardDescription>
                Project foundation and environment setup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Next.js 15.3.3 initialized</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">TypeScript configured</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Tailwind CSS + Shadcn/ui</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Yarn 4 package manager</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓</Badge>
                <span className="text-sm">Development server running</span>
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
                <Badge variant="outline">Stage 1.2</Badge>
                <span className="text-sm">Authentication (Clerk)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Stage 1.3</Badge>
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
                Ready for Stage 1.2
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Stage 1.1 completed successfully! 🎉
          </p>
        </div>
      </div>
    </div>
  );
}
