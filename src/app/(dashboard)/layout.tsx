import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/get-user-role'
import { Sidebar } from '@/components/sidebar'
import { RealtimeRefresh } from '@/components/realtime-refresh'
import { AssistantWidget } from '@/components/assistant/assistant-widget'
import { DocumentReviewDialog } from '@/components/documents/document-review-dialog'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const userRole = await getUserRole()

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar userEmail={user.email} userRole={userRole ?? 'staff'} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <RealtimeRefresh />
      </div>
      <AssistantWidget />
      <Suspense fallback={null}>
        <DocumentReviewDialog />
      </Suspense>
    </div>
  )
}
