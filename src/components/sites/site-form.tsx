'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import type { Database } from '@/types/database'

type SiteRow = Database['public']['Tables']['sites']['Row']
type SiteManagerRow = Database['public']['Tables']['site_managers']['Row']

// ── Zod schema ─────────────────────────────────────────────────────────────────

const siteManagerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Required'),
  phone: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  is_primary: z.boolean(),
})

const siteSchema = z.object({
  name: z.string().min(1, 'Required'),
  address: z.string().min(1, 'Required'),
  postcode: z.string().min(1, 'Required'),
  contact_phone: z.string().optional(),
  main_duties: z.string().optional(),
  project_value: z.string().optional(),
  project_start_date: z.string().optional(),
  project_end_date: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean(),
  managers: z.array(siteManagerSchema),
})

type SiteFormValues = z.infer<typeof siteSchema>

// ── Props ───────────────────────────────────────────────────────────────────────

interface SiteFormProps {
  mode: 'create' | 'edit'
  site?: SiteRow
  managers?: SiteManagerRow[]
}

// ── Component ───────────────────────────────────────────────────────────────────

export function SiteForm({ mode, site, managers = [] }: SiteFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const geocodedRef = useRef<{ lat: number; lng: number } | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SiteFormValues>({
    resolver: zodResolver(siteSchema),
    defaultValues:
      mode === 'edit' && site
        ? {
            name: site.name,
            address: site.address,
            postcode: site.postcode,
            contact_phone: site.contact_phone ?? '',
            main_duties: site.main_duties ?? '',
            project_value: site.project_value != null ? String(site.project_value) : '',
            project_start_date: site.project_start_date ?? '',
            project_end_date: site.project_end_date ?? '',
            notes: site.notes ?? '',
            is_active: site.is_active ?? true,
            managers: managers.map((m) => ({
              id: m.id,
              name: m.name,
              phone: m.phone,
              email: m.email ?? '',
              is_primary: m.is_primary ?? false,
            })),
          }
        : {
            name: '',
            address: '',
            postcode: '',
            contact_phone: '',
            main_duties: '',
            project_value: '',
            project_start_date: '',
            project_end_date: '',
            notes: '',
            is_active: true,
            managers: [],
          },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'managers' })
  const isActive = watch('is_active')

  // Geocode postcode on blur
  const handlePostcodeBlur = async (value: string) => {
    const clean = value.replace(/\s/g, '').toUpperCase()
    if (!clean) return
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${clean}`)
      const json = await res.json()
      if (json.result) {
        geocodedRef.current = { lat: json.result.latitude, lng: json.result.longitude }
      }
    } catch {
      // ignore
    }
  }

  const onSubmit = async (values: SiteFormValues) => {
    setSaving(true)
    setError(null)

    const geo = geocodedRef.current
    const projectValue = values.project_value ? parseFloat(values.project_value) : null

    // Derive primary manager for denormalised columns
    const primaryManager = values.managers.find((m) => m.is_primary) ?? values.managers[0] ?? null

    const sitePayload = {
      organization_id: orgId,
      name: values.name,
      address: values.address,
      postcode: values.postcode,
      lat: geo?.lat ?? (mode === 'edit' ? site?.lat : null),
      lng: geo?.lng ?? (mode === 'edit' ? site?.lng : null),
      contact_phone: values.contact_phone || null,
      main_duties: values.main_duties || null,
      project_value: projectValue,
      project_start_date: values.project_start_date || null,
      project_end_date: values.project_end_date || null,
      notes: values.notes || null,
      is_active: values.is_active,
      site_manager_name: primaryManager?.name ?? null,
      site_manager_phone: primaryManager?.phone ?? null,
      site_manager_email: primaryManager?.email || null,
      updated_at: new Date().toISOString(),
    }

    try {
      let siteId: string

      if (mode === 'create') {
        const { data, error: err } = await supabase
          .from('sites')
          .insert(sitePayload)
          .select('id')
          .single()
        if (err || !data) throw new Error(err?.message ?? 'Failed to create site')
        siteId = data.id
      } else {
        const { error: err } = await supabase
          .from('sites')
          .update(sitePayload)
          .eq('id', site!.id)
        if (err) throw new Error(err.message)
        siteId = site!.id
      }

      // Sync site_managers table
      if (mode === 'edit') {
        // Delete removed managers (those with an id not in current list)
        const keepIds = values.managers.filter((m) => m.id).map((m) => m.id!)
        if (keepIds.length > 0) {
          await supabase
            .from('site_managers')
            .delete()
            .eq('site_id', siteId)
            .not('id', 'in', `(${keepIds.join(',')})`)
        } else {
          await supabase.from('site_managers').delete().eq('site_id', siteId)
        }
      }

      // Upsert managers
      for (const m of values.managers) {
        if (m.id) {
          await supabase
            .from('site_managers')
            .update({
              name: m.name,
              phone: m.phone,
              email: m.email || null,
              is_primary: m.is_primary,
            })
            .eq('id', m.id)
        } else {
          await supabase.from('site_managers').insert({
            organization_id: orgId,
            site_id: siteId,
            name: m.name,
            phone: m.phone,
            email: m.email || null,
            is_primary: m.is_primary,
          })
        }
      }

      router.push(`/sites/${siteId}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
      )}

      {/* ── Site Details ───────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Site Details</h2>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="name">Site Name *</Label>
            <Input id="name" {...register('name')} className="mt-1" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="address">Address *</Label>
            <Input id="address" {...register('address')} className="mt-1" />
            {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="postcode">Postcode *</Label>
              <Input
                id="postcode"
                {...register('postcode')}
                className="mt-1 uppercase"
                onBlur={(e) => handlePostcodeBlur(e.target.value)}
              />
              {errors.postcode && <p className="text-xs text-destructive mt-1">{errors.postcode.message}</p>}
            </div>
            <div>
              <Label htmlFor="contact_phone">Site Contact Phone</Label>
              <Input id="contact_phone" {...register('contact_phone')} className="mt-1" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Project Details ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Project Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="project_value">Project Value (£)</Label>
            <Input id="project_value" type="number" step="0.01" {...register('project_value')} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="project_start_date">Start Date</Label>
            <Input id="project_start_date" type="date" {...register('project_start_date')} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="project_end_date">End Date</Label>
            <Input id="project_end_date" type="date" {...register('project_end_date')} className="mt-1" />
          </div>
        </div>
        <div>
          <Label htmlFor="main_duties">Main Duties / Scope of Work</Label>
          <Textarea id="main_duties" {...register('main_duties')} rows={3} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" {...register('notes')} rows={3} className="mt-1" />
        </div>
      </section>

      {/* ── Site Managers ───────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Site Managers</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: '', phone: '', email: '', is_primary: fields.length === 0 })}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Manager
          </Button>
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">No managers added yet.</p>
        )}

        {fields.map((field, index) => (
          <div key={field.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Manager {index + 1}</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    {...register(`managers.${index}.is_primary`)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Primary
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Name *</Label>
                <Input {...register(`managers.${index}.name`)} className="mt-1" />
                {errors.managers?.[index]?.name && (
                  <p className="text-xs text-destructive mt-1">{errors.managers[index]?.name?.message}</p>
                )}
              </div>
              <div>
                <Label>Phone *</Label>
                <Input {...register(`managers.${index}.phone`)} className="mt-1" />
                {errors.managers?.[index]?.phone && (
                  <p className="text-xs text-destructive mt-1">{errors.managers[index]?.phone?.message}</p>
                )}
              </div>
              <div>
                <Label>Email</Label>
                <Input {...register(`managers.${index}.email`)} type="email" className="mt-1" />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Status ─────────────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Status</h2>
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          onClick={() => setValue('is_active', !isActive)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
            isActive ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <p className="text-sm text-muted-foreground">{isActive ? 'Active' : 'Inactive'}</p>
      </section>

      {/* ── Submit ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mode === 'create' ? 'Create Site' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
