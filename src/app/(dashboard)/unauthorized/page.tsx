import Link from 'next/link'
import { ShieldOff } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <ShieldOff className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
      <p className="text-muted-foreground max-w-sm">
        You don&apos;t have permission to view this page. Contact your administrator if you believe this is an error.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 text-sm text-forest-400 hover:text-forest-300 transition-colors"
      >
        ← Back to Dashboard
      </Link>
    </div>
  )
}
