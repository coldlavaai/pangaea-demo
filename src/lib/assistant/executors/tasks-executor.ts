import { createClient } from '@/lib/supabase/server'
import type { ToolResult } from '../types'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeTasks(input: any, userId: string, conversationId?: string): Promise<ToolResult> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  switch (input.action) {
    case 'create_task': {
      const { data, error } = await db
        .from('assistant_tasks')
        .insert({
          organization_id: ORG_ID,
          created_by: userId,
          assigned_to: input.assigned_to_user_id ?? userId,
          title: input.title,
          description: input.description,
          due_date: input.due_date ?? null,
          reminder_at: input.reminder_at ?? null,
          conversation_id: conversationId ?? null,
        })
        .select()
        .single()
      if (error) return { text_result: `Error creating task: ${error.message}` }
      return { text_result: `Task "${data.title}" created${data.due_date ? ` (due: ${data.due_date})` : ''}.` }
    }

    case 'list_tasks': {
      const { data, error } = await db
        .from('assistant_tasks')
        .select('*')
        .eq('organization_id', ORG_ID)
        .neq('status', 'cancelled')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(20)
      if (error) return { text_result: `Error listing tasks: ${error.message}` }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tasks = (data ?? []) as any[]
      return {
        text_result: `Found ${tasks.length} active tasks.`,
        rich_result: { type: 'data_table', data: {
          columns: ['Title', 'Status', 'Due Date'],
          rows: tasks.map(t => [t.title, t.status, t.due_date ?? 'No date']),
        } },
      }
    }

    case 'complete_task': {
      if (!input.task_id) return { text_result: 'task_id required' }
      const { error } = await db
        .from('assistant_tasks')
        .update({ status: 'done' })
        .eq('id', input.task_id)
        .eq('organization_id', ORG_ID)
      if (error) return { text_result: `Error completing task: ${error.message}` }
      return { text_result: 'Task marked as done.' }
    }

    default:
      return { text_result: `Task action ${input.action} not implemented.` }
  }
}
