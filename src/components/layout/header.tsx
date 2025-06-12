'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs'
import { useIsAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, Images, Home, BarChart3 } from 'lucide-react'

export function Header() {
  const pathname = usePathname()
  const isAdmin = useIsAdmin()
  const { isSignedIn } = useUser()

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Gallery', href: '/gallery', icon: Images },
  ]

  const adminNavigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: BarChart3 },
    { name: 'Upload', href: '/admin/upload', icon: Upload },
  ]

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-2xl font-bold">
              {isSignedIn ? 'Family Gallery' : 'Gallery'}
            </Link>
            
            <SignedIn>
              <nav className="hidden md:flex items-center space-x-4">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                        ${isActive 
                          ? 'bg-primary text-primary-foreground' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}

                {/* Admin Navigation */}
                {isAdmin && (
                  <>
                    <div className="border-l border-muted pl-4 ml-4">
                      <Badge variant="secondary" className="mb-2">Admin</Badge>
                    </div>
                    {adminNavigation.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`
                            flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                            ${isActive 
                              ? 'bg-primary text-primary-foreground' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }
                          `}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      )
                    })}
                  </>
                )}
              </nav>
            </SignedIn>
          </div>

          <div className="flex items-center space-x-4">
            <SignedIn>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <SignInButton>
                <Button>Sign In</Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>

        {/* Mobile Navigation - Only show for authenticated users */}
        <SignedIn>
          <nav className="md:hidden mt-4 pt-4 border-t">
            <div className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}

              {/* Admin Navigation for Mobile */}
              {isAdmin && (
                <>
                  <div className="pt-2 mt-2 border-t">
                    <Badge variant="secondary" className="mb-2">Admin</Badge>
                  </div>
                  {adminNavigation.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`
                          flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                          ${isActive 
                            ? 'bg-primary text-primary-foreground' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }
                        `}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </>
              )}
            </div>
          </nav>
        </SignedIn>
      </div>
    </header>
  )
} 