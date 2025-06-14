import { AdminDebug } from '@/components/debug/admin-debug'

export default function AdminDebugPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Debug</h1>
      <AdminDebug />
    </div>
  )
} 