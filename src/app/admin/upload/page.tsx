'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/media-manager')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">Redirecting...</h1>
        <p className="text-muted-foreground">Taking you to the Media Manager</p>
      </div>
    </div>
  )
} 