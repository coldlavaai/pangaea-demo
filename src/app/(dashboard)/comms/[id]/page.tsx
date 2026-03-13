import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { CommsMessages } from '@/components/comms/comms-messages'

export default async function CommsThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  const [{ data: thread }, { data: messages }] = await Promise.all([
    supabase
      .from('message_threads')
      .select(`
        id,
        phone_number,
        unread_count,
        intake_state,
        operative:operatives!message_threads_operative_id_fkey(
          id, first_name, last_name, reference_number, status
        )
      `)
      .eq('id', id)
      .eq('organization_id', orgId)
      .single(),

    supabase
      .from('messages')
      .select('id, direction, body, media_url, media_type, status, error_message, created_at')
      .eq('thread_id', id)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true }),
  ])

  if (!thread) notFound()

  // Mark thread as read
  if ((thread.unread_count ?? 0) > 0) {
    await supabase
      .from('message_threads')
      .update({ unread_count: 0 })
      .eq('id', id)
      .eq('organization_id', orgId)
  }

  const INTAKE_LABELS: Record<string, string> = {
    start: 'Starting', awaiting_rtw: 'Awaiting RTW', awaiting_age: 'Awaiting Age',
    awaiting_cscs: 'Awaiting CSCS', awaiting_trade: 'Awaiting Trade',
    awaiting_experience: 'Awaiting Experience', awaiting_name: 'Awaiting Name',
    awaiting_email: 'Awaiting Email', docs_link_sent: 'Docs Pending',
    qualified: 'Qualified', rejected: 'Rejected',
  }

  const op = thread.operative as {
    id: string; first_name: string; last_name: string
    reference_number: string | null; status: string | null
  } | null

  const intakeState = (thread as { intake_state?: string | null }).intake_state
  const displayName = op ? `${op.first_name} ${op.last_name}` : thread.phone_number

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-3 shrink-0">
        <Link href="/comms" className="text-slate-500 hover:text-slate-200 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <PageHeader
            title={displayName}
            description={
              op
                ? `${thread.phone_number}${op.reference_number ? ` · ${op.reference_number}` : ''}`
                : thread.phone_number
            }
            action={
              <div className="flex items-center gap-3">
                {intakeState && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                    intakeState === 'rejected'   ? 'bg-red-900/40 text-red-400 border-red-800' :
                    intakeState === 'qualified'  ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800' :
                    intakeState === 'docs_link_sent' ? 'bg-sky-900/40 text-sky-400 border-sky-800' :
                    'bg-amber-900/40 text-amber-400 border-amber-800'
                  }`}>
                    Amber: {INTAKE_LABELS[intakeState] ?? intakeState}
                  </span>
                )}
                {op && (
                  <Link href={`/operatives/${op.id}`} className="text-xs text-emerald-400 hover:underline">
                    View profile →
                  </Link>
                )}
              </div>
            }
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <CommsMessages messages={messages ?? []} />
      </div>
    </div>
  )
}
