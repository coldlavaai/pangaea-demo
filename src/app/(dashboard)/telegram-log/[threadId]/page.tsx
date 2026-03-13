import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/get-user-role'
import { PageHeader } from '@/components/page-header'
import Link from 'next/link'
import { ArrowLeft, Bot, User } from 'lucide-react'
import { notFound } from 'next/navigation'

export default async function TelegramThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const { threadId } = await params
  const role = await getUserRole()
  if (role !== 'admin' && role !== 'super_admin' && role !== 'staff') redirect('/unauthorized')

  const supabase = createServiceClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  const [{ data: thread }, { data: messages }] = await Promise.all([
    supabase
      .from('message_threads')
      .select('id, phone_number, last_message_at')
      .eq('id', threadId)
      .eq('organization_id', orgId)
      .maybeSingle(),
    supabase
      .from('messages')
      .select('id, body, direction, created_at, channel')
      .eq('thread_id', threadId)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true })
      .limit(500),
  ])

  if (!thread) notFound()

  // Resolve staff user from phone_number = 'tg:{chatId}'
  let staffName = 'Unknown'
  if (thread.phone_number.startsWith('tg:')) {
    const chatId = parseInt(thread.phone_number.replace('tg:', ''), 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: staffUser } = await (supabase as any)
      .from('users')
      .select('first_name, last_name, role')
      .eq('organization_id', orgId)
      .eq('telegram_chat_id', chatId)
      .maybeSingle()
    if (staffUser) staffName = `${staffUser.first_name} ${staffUser.last_name}`
  }

  const msgs = (messages ?? []) as Array<{
    id: string
    body: string | null
    direction: string
    created_at: string | null
    channel: string | null
  }>

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={`Telegram — ${staffName}`}
          description={`${msgs.length} messages`}
        />
        <Link href="/telegram-log" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground shrink-0">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      {msgs.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground text-sm">
          No messages logged yet. Messages are recorded after the migration is run.
        </div>
      ) : (
        <div className="space-y-2">
          {msgs.map((m) => {
            const isInbound = m.direction === 'inbound'
            const time = m.created_at
              ? new Date(m.created_at).toLocaleString('en-GB', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })
              : ''

            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isInbound ? '' : 'flex-row-reverse'}`}
              >
                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                  isInbound ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                }`}>
                  {isInbound
                    ? <User className="h-3.5 w-3.5" />
                    : <Bot className="h-3.5 w-3.5" />
                  }
                </div>
                <div className={`max-w-[80%] ${isInbound ? '' : 'items-end flex flex-col'}`}>
                  <div className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    isInbound
                      ? 'bg-muted text-foreground rounded-tl-sm'
                      : 'bg-primary text-primary-foreground rounded-tr-sm'
                  }`}>
                    {m.body ?? '—'}
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-0.5 px-1">{time}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
