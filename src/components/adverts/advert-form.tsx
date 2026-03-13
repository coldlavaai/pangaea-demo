'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Sparkles, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

const PLATFORMS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'other', label: 'Other' },
]

interface GeneratedCopy {
  headline: string
  facebook_body: string
  short_version: string
  hashtags: string
}

interface AdvertFormProps {
  mode: 'advert' | 'template'
  requests: { id: string; start_date: string; headcount_required: number; site: { name: string } | null; trade_category: { name: string } | null }[]
  templates: { id: string; name: string; platform: string; headline: string; body_copy: string; call_to_action: string | null }[]
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 text-slate-500 hover:text-emerald-400 transition-colors"
      title="Copy to clipboard"
    >
      {copied
        ? <Check className="h-3.5 w-3.5 text-emerald-400" />
        : <Copy className="h-3.5 w-3.5" />
      }
    </button>
  )
}

export function AdvertForm({ mode, requests, templates }: AdvertFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  const [platform, setPlatform] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [requestId, setRequestId] = useState('')
  const [headline, setHeadline] = useState('')
  const [bodyCopy, setBodyCopy] = useState('')
  const [cta, setCta] = useState('Apply Now')
  const [name, setName] = useState('')
  const [budget, setBudget] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AI copy generation state
  const [aiTrade, setAiTrade] = useState('')
  const [aiLocation, setAiLocation] = useState('')
  const [aiRate, setAiRate] = useState('')
  const [aiDescription, setAiDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<GeneratedCopy | null>(null)

  const applyTemplate = (tid: string) => {
    const t = templates.find((x) => x.id === tid)
    if (!t) return
    setTemplateId(tid)
    setPlatform(t.platform)
    setHeadline(t.headline)
    setBodyCopy(t.body_copy)
    setCta(t.call_to_action ?? 'Apply Now')
  }

  const handleGenerate = async () => {
    if (!aiTrade.trim() || !aiLocation.trim()) {
      toast.error('Role and location are required to generate copy')
      return
    }
    setGenerating(true)
    setGenerated(null)
    try {
      const res = await fetch('/api/adverts/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trade: aiTrade.trim(),
          location: aiLocation.trim(),
          rate: aiRate.trim() || undefined,
          description: aiDescription.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Generation failed')
      } else {
        setGenerated(data as GeneratedCopy)
      }
    } catch {
      toast.error('Generation failed — please try again')
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!platform) { setError('Platform is required'); return }
    setSaving(true)
    setError(null)

    if (mode === 'template') {
      if (!name) { setError('Template name is required'); setSaving(false); return }
      const { error: err } = await supabase.from('advert_templates').insert([{
        organization_id: orgId,
        name,
        platform: platform as 'facebook' | 'linkedin' | 'indeed' | 'other',
        headline: headline || name,
        body_copy: bodyCopy || '',
        call_to_action: cta || 'Apply Now',
        is_active: true,
      }])
      if (err) { setError(err.message); setSaving(false); return }
      router.push('/adverts')
    } else {
      const { data, error: err } = await supabase
        .from('adverts')
        .insert([{
          organization_id: orgId,
          platform: platform as 'facebook' | 'linkedin' | 'indeed' | 'other',
          template_id: templateId || null,
          labour_request_id: requestId && requestId !== 'none' ? requestId : null,
          status: 'draft',
          budget: budget ? parseFloat(budget) : null,
          external_url: externalUrl || null,
          impressions: 0,
          clicks: 0,
          applications: 0,
          spend_to_date: 0,
        }])
        .select('id')
        .single()
      if (err || !data) { setError(err?.message ?? 'Failed to create'); setSaving(false); return }
      router.push(`/adverts/${data.id}`)
    }
  }

  const fieldClass = 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-500'
  const labelClass = 'text-slate-300 text-sm'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {mode === 'template' && (
        <div className="space-y-1.5">
          <Label className={labelClass}>Template Name *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. CPCS Plant Operator — Facebook"
            className={fieldClass}
          />
        </div>
      )}

      {mode === 'advert' && templates.length > 0 && (
        <div className="space-y-1.5">
          <Label className={labelClass}>Start from Template</Label>
          <Select value={templateId} onValueChange={applyTemplate}>
            <SelectTrigger className={fieldClass}>
              <SelectValue placeholder="Select a template (optional)" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-slate-200">
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className={labelClass}>Platform *</Label>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className={fieldClass}>
            <SelectValue placeholder="Select platform" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {PLATFORMS.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-slate-200">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mode === 'advert' && (
        <>
          <div className="space-y-1.5">
            <Label className={labelClass}>Link to Labour Request</Label>
            <Select value={requestId} onValueChange={setRequestId}>
              <SelectTrigger className={fieldClass}>
                <SelectValue placeholder="Select request (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="none" className="text-slate-400">None</SelectItem>
                {requests.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-slate-200">
                    {r.site?.name ?? 'Unknown site'} — {r.trade_category?.name ?? 'Any trade'} ({new Date(r.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ×{r.headcount_required})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>Budget (£)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>External URL</Label>
              <Input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
                className={fieldClass}
              />
            </div>
          </div>

          {/* ── AI Copy Generator ─────────────────────────────────────────────── */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-medium text-slate-200">Generate ad copy with AI</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Role *</Label>
                <Input
                  value={aiTrade}
                  onChange={(e) => setAiTrade(e.target.value)}
                  placeholder="e.g. Groundworker"
                  className={`${fieldClass} h-8 text-sm`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Location *</Label>
                <Input
                  value={aiLocation}
                  onChange={(e) => setAiLocation(e.target.value)}
                  placeholder="e.g. South London"
                  className={`${fieldClass} h-8 text-sm`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Rate</Label>
                <Input
                  value={aiRate}
                  onChange={(e) => setAiRate(e.target.value)}
                  placeholder="e.g. £180–220/day"
                  className={`${fieldClass} h-8 text-sm`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Extra info (optional)</Label>
                <Input
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="e.g. CSCS required, immediate start"
                  className={`${fieldClass} h-8 text-sm`}
                />
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 text-xs"
            >
              {generating
                ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Generating…</>
                : <><Sparkles className="h-3 w-3 mr-1.5" />Generate copy</>
              }
            </Button>

            {/* Results */}
            {generated && (
              <div className="space-y-3 pt-1">
                {/* Headline */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Headline</p>
                  <div className="flex items-start gap-2 rounded-md bg-slate-900/60 border border-slate-700 px-3 py-2">
                    <p className="flex-1 text-sm text-slate-200 font-medium leading-relaxed">{generated.headline}</p>
                    <CopyButton text={generated.headline} />
                  </div>
                </div>

                {/* Facebook / LinkedIn body */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Facebook / LinkedIn</p>
                  <div className="flex items-start gap-2 rounded-md bg-slate-900/60 border border-slate-700 px-3 py-2">
                    <p className="flex-1 text-sm text-slate-300 leading-relaxed whitespace-pre-line">{generated.facebook_body}</p>
                    <CopyButton text={generated.facebook_body} />
                  </div>
                </div>

                {/* Short version */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Short (Instagram / X)</p>
                  <div className="flex items-start gap-2 rounded-md bg-slate-900/60 border border-slate-700 px-3 py-2">
                    <p className="flex-1 text-sm text-slate-300 leading-relaxed">{generated.short_version}</p>
                    <CopyButton text={generated.short_version} />
                  </div>
                </div>

                {/* Hashtags */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Hashtags</p>
                  <div className="flex items-start gap-2 rounded-md bg-slate-900/60 border border-slate-700 px-3 py-2">
                    <p className="flex-1 text-sm text-emerald-400 font-mono leading-relaxed">{generated.hashtags}</p>
                    <CopyButton text={generated.hashtags} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {mode === 'template' && (
        <>
          <div className="space-y-1.5">
            <Label className={labelClass}>Headline</Label>
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. CPCS Plant Operator wanted — South East"
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Body Copy</Label>
            <Textarea
              rows={5}
              value={bodyCopy}
              onChange={(e) => setBodyCopy(e.target.value)}
              placeholder="Advert body text..."
              className={`${fieldClass} resize-none`}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Call to Action</Label>
            <Input
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="Apply Now"
              className={fieldClass}
            />
          </div>
        </>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mode === 'template' ? 'Save Template' : 'Create Advert'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
