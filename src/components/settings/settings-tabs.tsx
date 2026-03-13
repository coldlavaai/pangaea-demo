'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { OrgSettingsForm } from './org-settings-form'
import { TradeCategoriesPanel } from './trade-categories-panel'
import { UsersPanel } from './users-panel'
import { IntegrationsPanel } from './integrations-panel'
import { EmailTemplatesPanel } from './email-templates-panel'

interface TradeCategory {
  id: string
  name: string
  labour_type: string
  typical_day_rate: number | null
  job_description: string | null
  is_active: boolean | null
  sort_order: number | null
}

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  is_active: boolean | null
  created_at: string | null
  phone_number: string | null
  auth_user_id: string | null
  receive_notifications: boolean | null
  telegram_chat_id: number | null
}

interface Site {
  id: string
  name: string
}

interface UserSite {
  user_id: string
  site_id: string
}

interface Org {
  id: string
  name: string
  slug: string
  settings: Record<string, unknown>
}

interface SavedTemplate {
  template_key: string
  subject: string
  body_html: string
}

interface EmailIntegration {
  email_address: string
  display_name: string | null
  token_expires_at: string
  updated_at: string
}

interface SettingsTabsProps {
  orgId: string
  currentAuthUserId: string
  org: Org
  trades: TradeCategory[]
  users: User[]
  sites: Site[]
  userSites: UserSite[]
  emailIntegration: EmailIntegration | null
  savedTemplates: SavedTemplate[]
  defaultTab?: string
}

const TABS = [
  { key: 'org', label: 'Organisation' },
  { key: 'trades', label: 'Trade Categories' },
  { key: 'users', label: 'Users' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'templates',    label: 'Email Templates' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function SettingsTabs({ orgId, currentAuthUserId, org, trades, users, sites, userSites, emailIntegration, savedTemplates, defaultTab }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>((defaultTab as TabKey) ?? 'org')

  const activeTrades = trades.filter((t) => t.is_active !== false).length
  const activeUsers = users.filter((u) => u.is_active !== false).length

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-800">
        {TABS.map((t) => {
          const isActive = activeTab === t.key
          const count = t.key === 'trades' ? activeTrades : t.key === 'users' ? activeUsers : null
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap flex items-center gap-2',
                isActive
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              )}
            >
              {t.label}
              {count !== null && (
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full tabular-nums',
                    isActive
                      ? 'bg-emerald-900/50 text-emerald-300'
                      : 'bg-slate-800 text-slate-500'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Panels — all mounted, hidden via CSS so local state is preserved across tab switches */}
      <div className={activeTab !== 'org' ? 'hidden' : ''}>
        <OrgSettingsForm
          orgId={orgId}
          name={org.name}
          slug={org.slug}
          settings={org.settings}
        />
      </div>

      <div className={activeTab !== 'trades' ? 'hidden' : ''}>
        <TradeCategoriesPanel orgId={orgId} categories={trades} />
      </div>

      <div className={activeTab !== 'users' ? 'hidden' : ''}>
        <UsersPanel users={users} sites={sites} userSites={userSites} currentAuthUserId={currentAuthUserId} />
      </div>

      <div className={activeTab !== 'integrations' ? 'hidden' : ''}>
        <IntegrationsPanel emailIntegration={emailIntegration} />
      </div>

      <div className={activeTab !== 'templates' ? 'hidden' : ''}>
        <EmailTemplatesPanel savedTemplates={savedTemplates} />
      </div>
    </div>
  )
}
