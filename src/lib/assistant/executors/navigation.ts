import type { ToolResult } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeNavigation(input: any): Promise<ToolResult> {
  const pageMap: Record<string, string> = {
    dashboard: '/dashboard',
    operatives: '/operatives',
    sites: '/sites',
    requests: '/requests',
    allocations: '/allocations',
    shifts: '/shifts',
    timesheets: '/timesheets',
    documents: '/documents',
    ncrs: '/ncrs',
    reports: '/reports',
    activity: '/activity',
    comms: '/comms',
    adverts: '/adverts',
    settings: '/settings',
    'audit-log': '/audit-log',
  }

  const href = input.id
    ? `${pageMap[input.page] ?? `/${input.page}`}/${input.id}`
    : pageMap[input.page] ?? `/${input.page}`

  const label = input.page.charAt(0).toUpperCase() + input.page.slice(1).replace(/-/g, ' ')

  return {
    text_result: `Link to ${label}: ${href}`,
    rich_result: { type: 'deep_link', data: { href, label } },
  }
}
