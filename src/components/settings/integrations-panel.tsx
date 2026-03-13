'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, CheckCircle2, AlertCircle, ExternalLink, LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface EmailIntegration {
  email_address: string
  display_name: string | null
  token_expires_at: string
  updated_at: string
}

interface IntegrationsPanelProps {
  emailIntegration: EmailIntegration | null
}

export function IntegrationsPanel({ emailIntegration: initial }: IntegrationsPanelProps) {
  const [integration, setIntegration] = useState<EmailIntegration | null>(initial)
  const [disconnecting, setDisconnecting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle ?connected=1 or ?error=... from OAuth callback
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected === '1') {
      toast.success('Outlook connected successfully')
      router.replace('/settings?tab=integrations')
      router.refresh()
    } else if (error) {
      toast.error(`Connection failed: ${decodeURIComponent(error)}`)
      router.replace('/settings?tab=integrations')
    }
  }, [searchParams, router])

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/integrations/outlook/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to disconnect')
      setIntegration(null)
      toast.success('Outlook disconnected')
    } catch {
      toast.error('Failed to disconnect')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Email / Outlook card */}
      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
          <Mail className="h-4 w-4 text-slate-400" />
          <div>
            <p className="text-sm font-semibold text-slate-200">Outgoing Email</p>
            <p className="text-xs text-slate-500">Used for invite emails and automated notifications</p>
          </div>
        </div>

        <div className="px-5 py-5">
          {integration ? (
            <Connected integration={integration} onDisconnect={handleDisconnect} disconnecting={disconnecting} />
          ) : (
            <NotConnected />
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-5 py-4 space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Setup guide</p>
        <ol className="space-y-1.5 text-xs text-slate-500 list-none">
          <li className="flex gap-2"><span className="text-slate-600 shrink-0">1.</span>Create an App Registration in <a href="https://portal.azure.com" target="_blank" rel="noreferrer" className="text-sky-500 hover:text-sky-400">Azure Portal <ExternalLink className="inline h-2.5 w-2.5" /></a></li>
          <li className="flex gap-2"><span className="text-slate-600 shrink-0">2.</span>Add delegated permissions: <code className="bg-slate-800 px-1 rounded text-slate-400">Mail.Send</code> <code className="bg-slate-800 px-1 rounded text-slate-400">User.Read</code> <code className="bg-slate-800 px-1 rounded text-slate-400">offline_access</code></li>
          <li className="flex gap-2"><span className="text-slate-600 shrink-0">3.</span>Set redirect URI: <code className="bg-slate-800 px-1 rounded text-slate-400 break-all">{typeof window !== 'undefined' ? window.location.origin : ''}/api/integrations/outlook/callback</code></li>
          <li className="flex gap-2"><span className="text-slate-600 shrink-0">4.</span>Add env vars <code className="bg-slate-800 px-1 rounded text-slate-400">MICROSOFT_CLIENT_ID</code> and <code className="bg-slate-800 px-1 rounded text-slate-400">MICROSOFT_CLIENT_SECRET</code> in Vercel</li>
          <li className="flex gap-2"><span className="text-slate-600 shrink-0">5.</span>Click Connect below and sign in with the email account you want to send from</li>
        </ol>
      </div>

    </div>
  )
}

function Connected({ integration, onDisconnect, disconnecting }: {
  integration: EmailIntegration
  onDisconnect: () => void
  disconnecting: boolean
}) {
  const expiresAt = new Date(integration.token_expires_at)
  const isExpiringSoon = expiresAt.getTime() - Date.now() < 60 * 60 * 1000 // < 1 hour

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-slate-200">{integration.display_name ?? integration.email_address}</p>
          <p className="text-xs text-slate-500">{integration.email_address}</p>
          <p className="text-xs text-slate-600 mt-1">
            {isExpiringSoon ? (
              <span className="text-amber-500">Token expiring soon — reconnect to refresh</span>
            ) : (
              `Connected · token valid until ${expiresAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}`
            )}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDisconnect}
        disabled={disconnecting}
        className="text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-500/50 h-8 text-xs shrink-0"
      >
        {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><LogOut className="h-3.5 w-3.5 mr-1.5" />Disconnect</>}
      </Button>
    </div>
  )
}

function NotConnected() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-slate-600 shrink-0" />
        <div>
          <p className="text-sm text-slate-400">No email account connected</p>
          <p className="text-xs text-slate-600">Invite emails won&apos;t be sent until an account is connected</p>
        </div>
      </div>
      <a
        href="/api/integrations/outlook/auth"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors shrink-0"
      >
        <Mail className="h-4 w-4" />
        Connect Outlook
      </a>
    </div>
  )
}
