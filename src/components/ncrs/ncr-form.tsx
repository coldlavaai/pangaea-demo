'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

const NCR_TYPES = [
  { value: 'no_show', label: 'No Show' },
  { value: 'walk_off', label: 'Walk Off' },
  { value: 'late_arrival', label: 'Late Arrival' },
  { value: 'safety_breach', label: 'Safety Breach' },
  { value: 'drugs_alcohol', label: 'Drugs / Alcohol' },
  { value: 'conduct_issue', label: 'Conduct Issue' },
  { value: 'poor_attitude', label: 'Poor Attitude' },
  { value: 'poor_workmanship', label: 'Poor Workmanship' },
  { value: 'other', label: 'Other' },
] as const

const SEVERITY_OPTIONS = [
  { value: 'minor', label: 'Minor' },
  { value: 'major', label: 'Major' },
  { value: 'critical', label: 'Critical' },
] as const

interface Operative {
  id: string
  first_name: string
  last_name: string
  reference_number: string | null
}

interface Site {
  id: string
  name: string
}

interface NcrFormProps {
  operatives: Operative[]
  sites: Site[]
  defaultOperativeId?: string
  defaultSiteId?: string
}

const ncrSchema = z.object({
  operative_id: z.string().min(1, 'Required'),
  site_id: z.string().optional(),
  incident_type: z.enum([
    'no_show', 'walk_off', 'late_arrival', 'safety_breach',
    'drugs_alcohol', 'conduct_issue', 'poor_attitude', 'poor_workmanship', 'other',
  ]),
  severity: z.enum(['minor', 'major', 'critical']),
  incident_date: z.string().min(1, 'Required'),
  description: z.string().min(5, 'Please provide a description'),
  reporter_name: z.string().optional(),
  witness_name: z.string().optional(),
})

type FormValues = z.infer<typeof ncrSchema>

export function NcrForm({ operatives, sites, defaultOperativeId, defaultSiteId }: NcrFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(ncrSchema),
    defaultValues: {
      operative_id: defaultOperativeId ?? '',
      site_id: defaultSiteId ?? '',
      incident_type: 'no_show',
      severity: 'minor',
      incident_date: new Date().toISOString().split('T')[0],
      description: '',
      reporter_name: '',
      witness_name: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      organization_id: orgId,
      operative_id: values.operative_id,
      site_id: values.site_id || null,
      incident_type: values.incident_type,
      severity: values.severity,
      incident_date: values.incident_date,
      description: values.description,
      reporter_name: values.reporter_name || null,
      witness_name: values.witness_name || null,
      reported_by: user?.id ?? null,
    }

    try {
      const { data, error: err } = await supabase
        .from('non_conformance_incidents')
        .insert(payload)
        .select('id')
        .single()
      if (err || !data) throw new Error(err?.message ?? 'Failed to create NCR')
      router.push(`/ncrs/${data.id}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
      )}

      {/* Operative */}
      <div>
        <Label htmlFor="operative_id">Operative *</Label>
        <select
          id="operative_id"
          {...register('operative_id')}
          className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="">Select operative…</option>
          {operatives.map((o) => (
            <option key={o.id} value={o.id}>
              {o.first_name} {o.last_name}{o.reference_number ? ` (${o.reference_number})` : ''}
            </option>
          ))}
        </select>
        {errors.operative_id && <p className="text-xs text-destructive mt-1">{errors.operative_id.message}</p>}
      </div>

      {/* Site */}
      <div>
        <Label htmlFor="site_id">Site</Label>
        <select
          id="site_id"
          {...register('site_id')}
          className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="">No site / not applicable</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Type + Severity */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="incident_type">Type *</Label>
          <select
            id="incident_type"
            {...register('incident_type')}
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            {NCR_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="severity">Severity *</Label>
          <select
            id="severity"
            {...register('severity')}
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Date */}
      <div>
        <Label htmlFor="incident_date">Incident Date *</Label>
        <Input id="incident_date" type="date" {...register('incident_date')} className="mt-1" />
        {errors.incident_date && <p className="text-xs text-destructive mt-1">{errors.incident_date.message}</p>}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          {...register('description')}
          rows={4}
          className="mt-1"
          placeholder="Describe the incident in detail…"
        />
        {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
      </div>

      {/* Reporter + Witness */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="reporter_name">Reported By (name)</Label>
          <Input id="reporter_name" {...register('reporter_name')} className="mt-1" placeholder="e.g. Site Manager" />
        </div>
        <div>
          <Label htmlFor="witness_name">Witness</Label>
          <Input id="witness_name" {...register('witness_name')} className="mt-1" placeholder="Optional" />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Raise NCR
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
