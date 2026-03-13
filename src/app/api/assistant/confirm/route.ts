import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { toolExecutors } from '@/lib/assistant/tool-registry'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve public.users.id from auth UUID (workflow_runs FK references public.users, not auth.users)
  const { data: publicUser, error: userErr } = await db.from('users').select('id, role').eq('auth_user_id', user.id).single()
  if (!publicUser) {
    console.error('[confirm] public user not found for auth_user_id:', user.id, userErr?.message)
    return NextResponse.json({
      error: `Your account (${user.email}) is not linked to a BOS user record. ` +
        `This can happen if your role was changed or your account was recreated. ` +
        `Ask an admin to check the public.users table has a row with auth_user_id = ${user.id}`,
    }, { status: 404 })
  }
  const publicUserId = publicUser.id as string

  const body = await request.json()
  const { conversationId, tool, input, confirmed } = body as {
    conversationId: string
    tool: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input: any
    confirmed: boolean
  }

  if (!confirmed) {
    return NextResponse.json({ success: true, cancelled: true })
  }

  const executor = toolExecutors[tool]
  if (!executor) return NextResponse.json({ error: 'Unknown tool' }, { status: 400 })

  try {
    const result = await executor({ ...input, confirmed: true }, publicUserId, conversationId)

    // Append result as assistant message
    await db.from('assistant_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: result.text_result,
      rich_data: result.rich_result ? [result.rich_result] : null,
    })

    return NextResponse.json({ success: true, result })
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    console.error('[confirm] executor error:', { tool, action: input?.action, error: errMsg, publicUserId })

    // Build actionable error message
    let hint = ''
    if (errMsg.includes('foreign key constraint')) {
      hint = ' Check that the user and operative IDs exist in the database.'
    } else if (errMsg.includes('24h session window')) {
      hint = ' The operative hasn\'t messaged recently. Send them a WhatsApp first to open a session, or create a Twilio template.'
    } else if (errMsg.includes('template')) {
      hint = ' A required WhatsApp template hasn\'t been set up in Twilio yet.'
    }

    return NextResponse.json({ error: `${errMsg}${hint}` }, { status: 500 })
  }
}
