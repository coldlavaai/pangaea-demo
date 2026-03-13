import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use service client — assistant_messages RLS uses auth UUID but conversations use public user ID
  const db = createServiceClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const { data, error } = await db
    .from('assistant_messages')
    .select('id, role, content, rich_data, tool_calls, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // Resolve public.users.id — conversations are keyed on this, not the auth UUID
  const { data: publicUser } = await authClient
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!publicUser?.id) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { error } = await db
    .from('assistant_conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', publicUser.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
