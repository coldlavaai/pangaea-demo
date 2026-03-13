'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, CalendarDays } from 'lucide-react'

interface TradeCategory {
  id: string
  name: string
}

interface Site {
  id: string
  name: string
}

interface RequestFormProps {
  mode: 'create' | 'edit'
  sites: Site[]
  tradeCategories: TradeCategory[]
  defaultSiteId?: string
  request?: {
    id: string
    site_id: string
    trade_category_id: string | null
    headcount_required: number
    start_date: string
    end_date: string | null
    duration_weeks: number | null
    day_rate: number | null
    notes: string | null
    required_skills: string[] | null
  }
}

const requestSchema = z.object({
  site_id: z.string().min(1, 'Required'),
  trade_category_id: z.string().optional(),
  headcount_required: z.string().min(1, 'Required'),
  start_date: z.string().min(1, 'Required'),
  duration_weeks: z.string().optional(),
  day_rate: z.string().optional(),
  notes: z.string().optional(),
  required_skills: z.string().optional(),
})

type FormValues = z.infer<typeof requestSchema>

// Derive duration_weeks from start/end dates for edit mode
function deriveDurationWeeks(start: string, end: string | null): string {
  if (!start || !end) return ''
  const diffDays = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  const weeks = Math.round(diffDays / 7)
  return weeks > 0 ? String(weeks) : ''
}

export function RequestForm({ mode, sites, tradeCategories, defaultSiteId, request }: RequestFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues:
      mode === 'edit' && request
        ? {
            site_id: request.site_id,
            trade_category_id: request.trade_category_id ?? '',
            headcount_required: String(request.headcount_required),
            start_date: request.start_date,
            // Use stored duration_weeks first, fall back to deriving from end_date
            duration_weeks: request.duration_weeks
              ? String(request.duration_weeks)
              : deriveDurationWeeks(request.start_date, request.end_date),
            day_rate: request.day_rate != null ? String(request.day_rate) : '',
            notes: request.notes ?? '',
            required_skills: (request.required_skills ?? []).join(', '),
          }
        : {
            site_id: defaultSiteId ?? '',
            headcount_required: '1',
            start_date: '',
            duration_weeks: '',
            day_rate: '',
            notes: '',
            required_skills: '',
          },
  })

  const startDate = watch('start_date')
  const durationWeeks = watch('duration_weeks')

  // Reactively compute end date from start + duration
  const computedEndDate = useMemo(() => {
    if (!startDate || !durationWeeks) return null
    const weeks = parseInt(durationWeeks, 10)
    if (isNaN(weeks) || weeks <= 0) return null
    const start = new Date(startDate)
    if (isNaN(start.getTime())) return null
    const end = new Date(start)
    end.setDate(end.getDate() + weeks * 7)
    return end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }, [startDate, durationWeeks])

  const onSubmit = async (values: FormValues) => {
    setSaving(true)
    setError(null)

    const skills = values.required_skills
      ? values.required_skills.split(',').map((s) => s.trim()).filter(Boolean)
      : []

    // Calculate end_date from duration_weeks + start_date
    let endDate: string | null = null
    if (values.duration_weeks && values.start_date) {
      const weeks = parseInt(values.duration_weeks, 10)
      if (!isNaN(weeks) && weeks > 0) {
        const start = new Date(values.start_date)
        const end = new Date(start)
        end.setDate(end.getDate() + weeks * 7)
        endDate = end.toISOString().slice(0, 10)
      }
    }

    const durationWeeksNum = values.duration_weeks ? parseInt(values.duration_weeks, 10) || null : null

    const payload = {
      organization_id: orgId,
      site_id: values.site_id,
      trade_category_id: values.trade_category_id || null,
      headcount_required: parseInt(values.headcount_required, 10),
      start_date: values.start_date,
      end_date: endDate,
      duration_weeks: durationWeeksNum,
      day_rate: values.day_rate ? parseFloat(values.day_rate) : null,
      notes: values.notes || null,
      required_skills: skills.length > 0 ? skills : null,
      updated_at: new Date().toISOString(),
    }

    try {
      if (mode === 'create') {
        const { data, error: err } = await supabase
          .from('labour_requests')
          .insert(payload)
          .select('id')
          .single()
        if (err || !data) throw new Error(err?.message ?? 'Failed to create request')
        router.push(`/requests/${data.id}`)
      } else {
        const { error: err } = await supabase
          .from('labour_requests')
          .update(payload)
          .eq('id', request!.id)
        if (err) throw new Error(err.message)
        router.push(`/requests/${request!.id}`)
      }
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

      {/* Site */}
      <div>
        <Label htmlFor="site_id">Site *</Label>
        <select
          id="site_id"
          {...register('site_id')}
          className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="">Select a site…</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {errors.site_id && <p className="text-xs text-destructive mt-1">{errors.site_id.message}</p>}
      </div>

      {/* Trade + Headcount */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="trade_category_id">Trade Category</Label>
          <select
            id="trade_category_id"
            {...register('trade_category_id')}
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">Any trade</option>
            {tradeCategories.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="headcount_required">Headcount *</Label>
          <Input
            id="headcount_required"
            type="number"
            min={1}
            {...register('headcount_required')}
            className="mt-1"
          />
          {errors.headcount_required && (
            <p className="text-xs text-destructive mt-1">{errors.headcount_required.message}</p>
          )}
        </div>
      </div>

      {/* Start Date + Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date">Start Date *</Label>
          <Input id="start_date" type="date" {...register('start_date')} className="mt-1" />
          {errors.start_date && <p className="text-xs text-destructive mt-1">{errors.start_date.message}</p>}
        </div>
        <div>
          <Label htmlFor="duration_weeks">Duration (weeks)</Label>
          <Input
            id="duration_weeks"
            type="number"
            min={1}
            max={104}
            placeholder="e.g. 13"
            {...register('duration_weeks')}
            className="mt-1"
          />
          {computedEndDate && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <CalendarDays className="h-3 w-3" />
              Ends {computedEndDate}
            </p>
          )}
        </div>
      </div>

      {/* Day rate */}
      <div>
        <Label htmlFor="day_rate">Day Rate (£)</Label>
        <Input
          id="day_rate"
          type="number"
          step="0.01"
          min={0}
          {...register('day_rate')}
          className="mt-1"
          placeholder="e.g. 180.00"
        />
      </div>

      {/* Required skills */}
      <div>
        <Label htmlFor="required_skills">
          Required Skills{' '}
          <span className="text-muted-foreground font-normal">(comma separated)</span>
        </Label>
        <Input
          id="required_skills"
          {...register('required_skills')}
          className="mt-1"
          placeholder="e.g. IPAF, First Aid, PASMA"
        />
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register('notes')} rows={3} className="mt-1" />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mode === 'create' ? 'Create Request' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
