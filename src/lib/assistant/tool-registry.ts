import type { ToolResult } from './types'
import { executeOperativeRead } from './executors/operative-read'
import { executeOperativeWrite } from './executors/operative-write'
import { executeSiteRead } from './executors/site-read'
import { executeSiteWrite } from './executors/site-write'
import { executeOperationsRead } from './executors/operations-read'
import { executeOperationsWrite } from './executors/operations-write'
import { executeQualityRead } from './executors/quality-read'
import { executeQualityWrite } from './executors/quality-write'
import { executeCommsRead } from './executors/comms-read'
import { executeMessaging } from './executors/messaging'
import { executeAdmin } from './executors/admin'
import { executeTasks } from './executors/tasks-executor'
import { executeNavigation } from './executors/navigation'
import { executeRecommendOperatives } from './executors/recommend-operatives'
import { executeWorkflows } from './executors/workflows'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExecutorFn = (input: any, userId: string, conversationId?: string) => Promise<ToolResult>

export const toolExecutors: Record<string, ExecutorFn> = {
  operative_read: (input) => executeOperativeRead(input),
  operative_write: (input) => executeOperativeWrite(input),
  site_read: (input) => executeSiteRead(input),
  site_write: (input) => executeSiteWrite(input),
  operations_read: (input) => executeOperationsRead(input),
  operations_write: (input) => executeOperationsWrite(input),
  quality_read: (input) => executeQualityRead(input),
  quality_write: (input) => executeQualityWrite(input),
  comms_read: (input) => executeCommsRead(input),
  messaging: (input) => executeMessaging(input),
  admin: (input) => executeAdmin(input),
  tasks: (input, userId, conversationId) => executeTasks(input, userId, conversationId),
  navigation: (input) => executeNavigation(input),
  recommend_operatives: (input) => executeRecommendOperatives(input),
  workflows: (input, userId, conversationId) => executeWorkflows(input, userId, conversationId),
}

export const WRITE_TOOLS = new Set([
  'operative_write', 'site_write', 'operations_write',
  'quality_write', 'messaging', 'admin', 'workflows',
])

export const WRITE_ACTIONS_THAT_SKIP_CONFIRM = new Set([
  'admin:generate_advert_copy', 'navigation:link_to_page', 'tasks:create_task',
  'tasks:list_tasks', 'tasks:complete_task',
  'workflows:get_status', 'workflows:list_active',
])
