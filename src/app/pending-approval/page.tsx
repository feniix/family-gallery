'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Mail, RefreshCw } from 'lucide-react';
import { authLogger } from '@/lib/logger'

interface UserStatus {
  role: string;
  status: string;
  approved: boolean;
  hasAccess: boolean;
}

export default function PendingApprovalPage() {
  const { user, isLoaded } = useUser();
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUserStatus = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // First, try to auto-create admin user if they're an admin email
      try {
        const adminResponse = await fetch('/api/auto-create-admin', {
          method: 'POST',
        });
        if (adminResponse.ok) {
          const adminData = await adminResponse.json();
          authLogger.debug('Admin auto-creation result', { adminData })
          
          // If admin was created or already exists, redirect to gallery
          if (adminData.success || adminData.message === 'User already exists') {
            window.location.href = '/gallery';
            return;
          }
        }
      } catch (adminError) {
        authLogger.debug('Not an admin email or auto-creation failed', { adminError })
        // Continue with normal status check
      }
      
      // Try to create user in database if they don't exist
      try {
        const createResponse = await fetch('/api/user/create', {
          method: 'POST',
        });
        if (createResponse.ok) {
          const createData = await createResponse.json();
          authLogger.debug('User creation result', { createData })
        }
      } catch (createError) {
        authLogger.debug('Error creating user in database', { createError })
        // Continue with status check even if creation fails
      }
      
      const response = await fetch('/api/user/status');
      if (response.ok) {
        const data = await response.json();
        const currentUser = data.user;
        if (currentUser) {
          setUserStatus({
            role: currentUser.role,
            status: currentUser.status,
            approved: currentUser.approved,
            hasAccess: currentUser.hasAccess
          });
          
          // If user now has access, redirect to gallery
          if (currentUser.hasAccess) {
            window.location.href = '/gallery';
          }
        }
      } else {
        authLogger.error('Failed to fetch user status', { 
          status: response.status, 
          statusText: response.statusText 
        });
      }
    } catch (error) {
      authLogger.error('Error checking user status', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isLoaded && user) {
      checkUserStatus();
    }
  }, [isLoaded, user, checkUserStatus]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking your status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
            <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <CardTitle>Approval Pending</CardTitle>
          <CardDescription>
            Your account is waiting for administrator approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Account Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Email:</span>
                <span className="font-medium">{user?.primaryEmailAddress?.emailAddress}</span>
              </div>
              <div className="flex justify-between">
                <span>Role:</span>
                <span className="font-medium capitalize">{userStatus?.role || 'Guest'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium capitalize">{userStatus?.status || 'Pending'}</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>What happens next?</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>An administrator will review your account</li>
              <li>You&apos;ll be assigned to an appropriate access level</li>
              <li>Once approved, you&apos;ll have access to family content</li>
            </ul>
          </div>

          {userStatus?.role === 'guest' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Guest Access
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    You currently have guest access with no content visibility. 
                    Contact an administrator to request access to family content.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={checkUserStatus} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Status
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/sign-out'} 
              variant="ghost" 
              className="w-full"
            >
              Sign Out
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <p>Questions? Contact your family administrator</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 