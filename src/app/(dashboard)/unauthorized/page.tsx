import Link from 'next/link'
import { ShieldOff } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <ShieldOff className="h-12 w-12 text-slate-600" />
      <h1 className="text-2xl font-bold text-slate-100">Access Denied</h1>
      <p className="text-slate-400 max-w-sm">
        You don&apos;t have permission to view this page. Contact your administrator if you believe this is an error.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        ← Back to Dashboard
      </Link>
    </div>
  )
}
