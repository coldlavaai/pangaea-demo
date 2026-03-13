'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type CscsCardType = Database['public']['Enums']['cscs_card_type']
type OperativeStatus = Database['public']['Enums']['operative_status']
type LabourType = Database['public']['Enums']['labour_type']
type OperativeGrade = Database['public']['Enums']['operative_grade']
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CalendarIcon, Loader2 } from 'lucide-react'

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  phone: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  status: z.string().min(1, 'Required'),
  labour_type: z.string().min(1, 'Required'),
  // Identity
  date_of_birth: z.string().optional(),
  ni_number: z
    .string()
    .regex(/^[A-Z]{2}\d{6}[A-D]$/i, 'Invalid NI format (e.g. AB123456C)')
    .or(z.literal(''))
    .optional(),
  nationality: z.string().optional(),
  preferred_language: z.string().optional(),
  // Address
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  postcode: z.string().optional(),
  // Work
  trade_category_id: z.string().optional(),
  day_rate: z.string().optional(),
  charge_rate: z.string().optional(),
  experience_years: z.string().optional(),
  source: z.string().optional(),
  // RTW
  rtw_type: z.string().optional(),
  rtw_verified: z.boolean().optional(),
  rtw_expiry: z.string().optional(),
  rtw_share_code: z.string().optional(),
  // CSCS
  cscs_card_type: z.string().optional(),
  cscs_card_number: z.string().optional(),
  cscs_expiry: z.string().optional(),
  // Next of kin
  next_of_kin_name: z.string().optional(),
  next_of_kin_phone: z.string().optional(),
  // Other
  wtd_opt_out: z.boolean().optional(),
  medical_notes: z.string().optional(),
  other_certifications: z.string().optional(),
  notes: z.string().optional(),
  // Grade / pay
  grade: z.string().optional(),
  hourly_rate: z.string().optional(),
  start_date: z.string().optional(),
  // Payroll (sensitive)
  bank_sort_code: z.string().optional(),
  bank_account_number: z.string().optional(),
  utr_number: z.string().optional(),
  // CSCS detail
  cscs_card_title: z.string().optional(),
  cscs_card_description: z.string().optional(),
  // Migration 00011
  gender: z.string().optional(),
  machine_operator: z.boolean().optional(),
  // Migration 00021
  engagement_method: z.string().optional(),
  agency_name: z.string().optional(),
  trading_name: z.string().optional(),
  min_acceptable_rate: z.string().optional(),
  gov_rtw_checked: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

// ── Props ──────────────────────────────────────────────────────────────────────

interface TradeCategory {
  id: string
  name: string
}

interface OperativeFormProps {
  mode: 'create' | 'edit'
  operativeId?: string
  defaultValues?: Partial<FormValues>
  tradeCategories: TradeCategory[]
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUSES = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'qualifying', label: 'Qualifying' },
  { value: 'pending_docs', label: 'Docs Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'available', label: 'Available' },
  { value: 'working', label: 'Working' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'blocked', label: 'Blocked' },
]

const RTW_TYPES = [
  { value: 'british_citizen', label: 'British Citizen' },
  { value: 'irish_citizen', label: 'Irish Citizen' },
  { value: 'eu_settled_status', label: 'EU Settled Status' },
  { value: 'eu_pre_settled_status', label: 'EU Pre-Settled Status' },
  { value: 'share_code', label: 'Share Code' },
  { value: 'biometric_residence_permit', label: 'Biometric Residence Permit' },
  { value: 'work_visa', label: 'Work Visa' },
  { value: 'other', label: 'Other' },
]

const RTW_NO_EXPIRY = ['british_citizen', 'irish_citizen']
const RTW_NO_SHARE_CODE = ['british_citizen', 'irish_citizen']

const CSCS_TYPES = [
  { value: 'green', label: 'Green (Labourer)' },
  { value: 'blue', label: 'Blue (Skilled)' },
  { value: 'gold', label: 'Gold (Supervisor)' },
  { value: 'black', label: 'Black (Manager)' },
  { value: 'red', label: 'Red (Trainee)' },
  { value: 'white', label: 'White (Professional)' },
]

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

const ENGAGEMENT_METHODS = [
  { value: 'self_employed',  label: 'Self-Employed' },
  { value: 'cis_sole_trader', label: 'CIS Sole Trader' },
  { value: 'limited_company', label: 'Limited Company' },
  { value: 'agency',          label: 'Agency' },
  { value: 'direct_paye',     label: 'Direct PAYE' },
]

const AGENCIES = [
  { value: 'Giant', label: 'Giant' },
  { value: 'Elite', label: 'Elite' },
  { value: 'Direct', label: 'Direct' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Job Board', label: 'Job Board' },
  { value: 'Other', label: 'Other' },
]

const GRADES = [
  // Operational grades (new)
  { value: 'operative',          label: 'Operative' },
  { value: 'mobile_crew',        label: 'Mobile Crew' },
  { value: 'agency_labour',      label: 'Agency Labour' },
  { value: 'groundworker',       label: 'Groundworker' },
  { value: 'skilled_landscaper', label: 'Skilled Landscaper' },
  { value: 'plant_operator',     label: 'Plant Operator' },
  { value: 'site_supervisor',    label: 'Site Supervisor' },
  { value: 'site_manager',       label: 'Site Manager' },
  { value: 'document_controller',label: 'Document Controller' },
  // Skill-band grades (original)
  { value: 'skilled',            label: 'Skilled' },
  { value: 'highly_skilled',     label: 'Highly Skilled' },
  { value: 'exceptional_skill',  label: 'Exceptional Skill' },
  { value: 'specialist_skill',   label: 'Specialist Skill' },
  { value: 'engineer',           label: 'Engineer' },
  { value: 'manager',            label: 'Manager' },
  { value: 'senior_manager',     label: 'Senior Manager' },
  { value: 'contracts_manager',  label: 'Contracts Manager' },
  { value: 'project_manager',    label: 'Project Manager' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'pl', label: 'Polish' },
  { value: 'ro', label: 'Romanian' },
  { value: 'bg', label: 'Bulgarian' },
  { value: 'lt', label: 'Lithuanian' },
  { value: 'lv', label: 'Latvian' },
  { value: 'sk', label: 'Slovak' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'pa', label: 'Punjabi' },
  { value: 'ur', label: 'Urdu' },
  { value: 'hi', label: 'Hindi' },
]

// ── Date Picker ─────────────────────────────────────────────────────────────────

function DatePicker({
  value,
  onChange,
  placeholder,
  fromYear,
  toYear,
  fieldClass,
}: {
  value?: string
  onChange: (v: string) => void
  placeholder: string
  fromYear?: number
  toYear?: number
  fieldClass: string
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseISO(value) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`${fieldClass} flex h-9 w-full items-center justify-between rounded-md border px-3 py-1 text-sm`}
        >
          <span className={selected ? 'text-slate-100' : 'text-slate-500'}>
            {selected ? format(selected, 'dd/MM/yyyy') : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700" align="start">
        <div className="dark">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected}
            startMonth={fromYear ? new Date(fromYear, 0) : undefined}
            endMonth={toYear ? new Date(toYear, 11) : undefined}
            onSelect={(d) => {
              onChange(d ? format(d, 'yyyy-MM-dd') : '')
              setOpen(false)
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export function OperativeForm({
  mode,
  operativeId,
  defaultValues,
  tradeCategories,
}: OperativeFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [serverError, setServerError] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const geocodedRef = useRef<{ lat: number; lng: number } | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'prospect',
      labour_type: 'blue_collar',
      rtw_verified: false,
      wtd_opt_out: false,
      grade: '',
      hourly_rate: '',
      start_date: '',
      notes: '',
      bank_sort_code: '',
      bank_account_number: '',
      utr_number: '',
      cscs_card_title: '',
      cscs_card_description: '',
      gender: '',
      machine_operator: false,
      ...defaultValues,
    },
  })

  const rtwType = useWatch({ control, name: 'rtw_type' })
  const engagementMethod = useWatch({ control, name: 'engagement_method' })

  // ── Postcode geocoding ──────────────────────────────────────────────────────

  const handlePostcodeBlur = async () => {
    const postcode = getValues('postcode')
    if (!postcode) return
    const clean = postcode.replace(/\s+/g, '').toUpperCase()
    if (clean.length < 5) return

    setGeocoding(true)
    try {
      const res = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`
      )
      const json = await res.json()
      if (json.status === 200) {
        setValue('postcode', json.result.postcode)
        geocodedRef.current = {
          lat: json.result.latitude,
          lng: json.result.longitude,
        }
      }
    } catch {
      // Geocoding is optional — silently fail
    } finally {
      setGeocoding(false)
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  const onSubmit = async (values: FormValues) => {
    setServerError('')
    const orgId = process.env.NEXT_PUBLIC_ORG_ID!

    // Geocode on submit if blur didn't complete in time
    if (values.postcode && !geocodedRef.current) {
      const clean = values.postcode.replace(/\s+/g, '').toUpperCase()
      try {
        const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`)
        const json = await res.json()
        if (json.status === 200) {
          geocodedRef.current = { lat: json.result.latitude, lng: json.result.longitude }
        }
      } catch { /* geocoding is optional */ }
    }

    const geo = geocodedRef.current

    const payload = {
      organization_id: orgId,
      first_name: values.first_name,
      last_name: values.last_name,
      phone: values.phone,
      email: values.email || null,
      status: values.status as OperativeStatus,
      labour_type: values.labour_type as LabourType,
      date_of_birth: values.date_of_birth || null,
      ni_number: values.ni_number || null,
      nationality: values.nationality || null,
      preferred_language: values.preferred_language || null,
      address_line1: values.address_line1 || null,
      address_line2: values.address_line2 || null,
      city: values.city || null,
      county: values.county || null,
      postcode: values.postcode || null,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      trade_category_id: (values.trade_category_id && values.trade_category_id !== 'none') ? values.trade_category_id : null,
      day_rate: values.day_rate ? parseFloat(values.day_rate) || null : null,
      charge_rate: values.charge_rate ? parseFloat(values.charge_rate) || null : null,
      experience_years: values.experience_years ? parseInt(values.experience_years, 10) || null : null,
      source: (values.source && values.source !== 'none') ? values.source : null,
      rtw_type: (values.rtw_type && values.rtw_type !== 'none') ? values.rtw_type : null,
      rtw_verified: values.rtw_verified ?? false,
      rtw_expiry: values.rtw_expiry || null,
      rtw_share_code: values.rtw_share_code || null,
      cscs_card_type: (values.cscs_card_type && values.cscs_card_type !== 'none') ? values.cscs_card_type as CscsCardType : null,
      cscs_card_number: values.cscs_card_number || null,
      cscs_expiry: values.cscs_expiry || null,
      next_of_kin_name: values.next_of_kin_name || null,
      next_of_kin_phone: values.next_of_kin_phone || null,
      wtd_opt_out: values.wtd_opt_out ?? false,
      medical_notes: values.medical_notes || null,
      other_certifications: values.other_certifications || null,
      notes: values.notes || null,
      grade: (values.grade && values.grade !== 'none') ? values.grade as OperativeGrade : null,
      hourly_rate: values.hourly_rate ? parseFloat(values.hourly_rate) || null : null,
      start_date: values.start_date || null,
      bank_sort_code: values.bank_sort_code || null,
      bank_account_number: values.bank_account_number || null,
      utr_number: values.utr_number || null,
      cscs_card_title: values.cscs_card_title || null,
      cscs_card_description: values.cscs_card_description || null,
      gender: (values.gender && values.gender !== 'none') ? values.gender : null,
      machine_operator: values.machine_operator ?? false,
      engagement_method: (values.engagement_method || null) as 'self_employed' | 'cis_sole_trader' | 'limited_company' | 'agency' | 'direct_paye' | null,
      agency_name: values.agency_name || null,
      trading_name: values.trading_name || null,
      min_acceptable_rate: values.min_acceptable_rate ? parseFloat(values.min_acceptable_rate) : null,
      gov_rtw_checked: values.gov_rtw_checked ?? false,
      gov_rtw_checked_at: values.gov_rtw_checked ? new Date().toISOString() : null,
    }

    if (mode === 'create') {
      const { data, error } = await supabase
        .from('operatives')
        .insert([{ ...payload, entry_source: 'manual' }])
        .select('id')
        .single()

      if (error) {
        setServerError(error.message)
        return
      }
      router.push(`/operatives/${data.id}`)
    } else {
      const { error } = await supabase
        .from('operatives')
        .update(payload)
        .eq('id', operativeId!)
        .eq('organization_id', orgId)

      if (error) {
        setServerError(error.message)
        return
      }
      router.push(`/operatives/${operativeId}`)
      router.refresh()
    }
  }

  // ── UI helpers ──────────────────────────────────────────────────────────────

  const fieldClass =
    'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-500'

  const labelClass = 'text-slate-300 text-sm'

  const errorMsg = (field: keyof FormValues) =>
    errors[field] ? (
      <p className="text-xs text-red-400 mt-1">{errors[field]!.message as string}</p>
    ) : null

  const sectionHeader = (title: string) => (
    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2 pb-1 border-b border-slate-800">
      {title}
    </h3>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {serverError && (
        <div className="rounded-md bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-300">
          {serverError}
        </div>
      )}

      {/* ── Basic Info ─────────────────────────────────────────────────────── */}
      {sectionHeader('Basic Information')}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="first_name" className={labelClass}>First Name *</Label>
          <Input id="first_name" {...register('first_name')} className={fieldClass} />
          {errorMsg('first_name')}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name" className={labelClass}>Last Name *</Label>
          <Input id="last_name" {...register('last_name')} className={fieldClass} />
          {errorMsg('last_name')}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone" className={labelClass}>Phone *</Label>
          <Input id="phone" type="tel" {...register('phone')} className={fieldClass} />
          {errorMsg('phone')}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className={labelClass}>Email</Label>
          <Input id="email" type="email" {...register('email')} className={fieldClass} />
          {errorMsg('email')}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>Status *</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-slate-200">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errorMsg('status')}
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>Labour Type *</Label>
          <Controller
            control={control}
            name="labour_type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="blue_collar" className="text-slate-200">Blue Collar</SelectItem>
                  <SelectItem value="white_collar" className="text-slate-200">White Collar</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errorMsg('labour_type')}
        </div>
      </div>

      {/* ── Identity ───────────────────────────────────────────────────────── */}
      {sectionHeader('Identity')}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>Date of Birth</Label>
          <Controller
            control={control}
            name="date_of_birth"
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="Select date of birth"
                fromYear={1940}
                toYear={new Date().getFullYear() - 16}
                fieldClass={fieldClass}
              />
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ni_number" className={labelClass}>NI Number</Label>
          <Input
            id="ni_number"
            placeholder="AB123456C"
            {...register('ni_number')}
            className={`${fieldClass} font-mono uppercase`}
          />
          {errorMsg('ni_number')}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>Gender</Label>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none" className="text-slate-400">Not set</SelectItem>
                  {GENDERS.map((g) => (
                    <SelectItem key={g.value} value={g.value} className="text-slate-200">
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nationality" className={labelClass}>Nationality</Label>
          <Input id="nationality" {...register('nationality')} className={fieldClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5 col-span-1">
          <Label className={labelClass}>Preferred Language</Label>
          <Controller
            control={control}
            name="preferred_language"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value} className="text-slate-200">
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* ── Address ────────────────────────────────────────────────────────── */}
      {sectionHeader('Address')}

      <div className="space-y-1.5">
        <Label htmlFor="address_line1" className={labelClass}>Address Line 1</Label>
        <Input id="address_line1" {...register('address_line1')} className={fieldClass} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address_line2" className={labelClass}>Address Line 2</Label>
        <Input id="address_line2" {...register('address_line2')} className={fieldClass} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="city" className={labelClass}>City</Label>
          <Input id="city" {...register('city')} className={fieldClass} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="county" className={labelClass}>County</Label>
          <Input id="county" {...register('county')} className={fieldClass} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="postcode" className={labelClass}>
            Postcode {geocoding && <span className="text-slate-500 text-xs">(locating…)</span>}
          </Label>
          <Input
            id="postcode"
            {...register('postcode')}
            onBlur={handlePostcodeBlur}
            className={`${fieldClass} uppercase`}
            placeholder="SW1A 1AA"
          />
        </div>
      </div>

      {/* ── Work ───────────────────────────────────────────────────────────── */}
      {sectionHeader('Work Details')}

      <div className="space-y-1.5">
        <Label className={labelClass}>Trade Category</Label>
        <Controller
          control={control}
          name="trade_category_id"
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger className={fieldClass}>
                <SelectValue placeholder="Select trade" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="none" className="text-slate-400">None</SelectItem>
                {tradeCategories.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-slate-200">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>Grade</Label>
          <Controller
            control={control}
            name="grade"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none" className="text-slate-400">Not set</SelectItem>
                  {GRADES.map((g) => (
                    <SelectItem key={g.value} value={g.value} className="text-slate-200">
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>Start Date</Label>
          <Controller
            control={control}
            name="start_date"
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="Date started with Aztec"
                fromYear={2000}
                toYear={new Date().getFullYear() + 1}
                fieldClass={fieldClass}
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="day_rate" className={labelClass}>Day Rate / Pay Rate (£)</Label>
          <Input
            id="day_rate"
            type="number"
            step="0.01"
            min="0"
            {...register('day_rate')}
            className={fieldClass}
          />
          {errorMsg('day_rate')}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="charge_rate" className={labelClass}>Charge Rate (£)</Label>
          <Input
            id="charge_rate"
            type="number"
            step="0.01"
            min="0"
            {...register('charge_rate')}
            className={fieldClass}
          />
          {errorMsg('charge_rate')}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hourly_rate" className={labelClass}>Hourly Rate (£)</Label>
          <Input
            id="hourly_rate"
            type="number"
            step="0.01"
            min="0"
            {...register('hourly_rate')}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="experience_years" className={labelClass}>Experience (years)</Label>
          <Input
            id="experience_years"
            type="number"
            min="0"
            max="60"
            {...register('experience_years')}
            className={fieldClass}
          />
          {errorMsg('experience_years')}
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>Agency / Source</Label>
          <Controller
            control={control}
            name="source"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select agency / source" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none" className="text-slate-400">Not set</SelectItem>
                  {AGENCIES.map((a) => (
                    <SelectItem key={a.value} value={a.value} className="text-slate-200">
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>Engagement Method</Label>
          <Controller
            control={control}
            name="engagement_method"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select engagement" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none" className="text-slate-400">Not set</SelectItem>
                  {ENGAGEMENT_METHODS.map((e) => (
                    <SelectItem key={e.value} value={e.value} className="text-slate-200">
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="min_acceptable_rate" className={labelClass}>Min. Acceptable Rate (£/day)</Label>
          <Input
            id="min_acceptable_rate"
            type="number"
            step="0.01"
            min="0"
            {...register('min_acceptable_rate')}
            className={fieldClass}
          />
        </div>
      </div>

      {engagementMethod === 'agency' && (
        <div className="space-y-1.5">
          <Label htmlFor="agency_name" className={labelClass}>Agency Name</Label>
          <Input id="agency_name" {...register('agency_name')} className={fieldClass} placeholder="e.g. Giant, Elite" />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="trading_name" className={labelClass}>Trading / Company Name</Label>
        <Input id="trading_name" {...register('trading_name')} className={fieldClass} placeholder="Ltd company or trading name" />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Controller
          control={control}
          name="machine_operator"
          render={({ field }) => (
            <button
              type="button"
              role="switch"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                field.value ? 'bg-emerald-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                  field.value ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          )}
        />
        <Label className={labelClass}>Machine Operator (Digger / Telehandler / Dumper)</Label>
      </div>

      {/* ── Right to Work ──────────────────────────────────────────────────── */}
      {sectionHeader('Right to Work')}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>RTW Type</Label>
          <Controller
            control={control}
            name="rtw_type"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none" className="text-slate-400">Not set</SelectItem>
                  {RTW_TYPES.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="text-slate-200">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        {!RTW_NO_EXPIRY.includes(rtwType ?? '') && (
          <div className="space-y-1.5">
            <Label className={labelClass}>RTW Expiry</Label>
            <Controller
              control={control}
              name="rtw_expiry"
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select expiry date"
                  fromYear={new Date().getFullYear()}
                  toYear={new Date().getFullYear() + 30}
                  fieldClass={fieldClass}
                />
              )}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {!RTW_NO_SHARE_CODE.includes(rtwType ?? '') && (
          <div className="space-y-1.5">
            <Label htmlFor="rtw_share_code" className={labelClass}>Share Code</Label>
            <Input
              id="rtw_share_code"
              placeholder="e.g. W2X-3Y7-D4A"
              {...register('rtw_share_code')}
              className={`${fieldClass} font-mono uppercase`}
            />
          </div>
        )}
        <div className="flex items-center gap-3 pt-6">
          <Controller
            control={control}
            name="rtw_verified"
            render={({ field }) => (
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  field.value ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                    field.value ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            )}
          />
          <Label className={labelClass}>RTW Verified</Label>
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Controller
            control={control}
            name="gov_rtw_checked"
            render={({ field }) => (
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  field.value ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                    field.value ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            )}
          />
          <Label className={labelClass}>GOV.UK RTW check completed</Label>
        </div>
      </div>

      {/* ── CSCS / Tickets ─────────────────────────────────────────────────── */}
      {sectionHeader('CSCS / Tickets')}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>CSCS Card Type</Label>
          <Controller
            control={control}
            name="cscs_card_type"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select card type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none" className="text-slate-400">None</SelectItem>
                  {CSCS_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-slate-200">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cscs_card_number" className={labelClass}>Card Number</Label>
          <Input
            id="cscs_card_number"
            {...register('cscs_card_number')}
            className={`${fieldClass} font-mono`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>CSCS Expiry</Label>
          <Controller
            control={control}
            name="cscs_expiry"
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="Select expiry date"
                fromYear={new Date().getFullYear()}
                toYear={new Date().getFullYear() + 10}
                fieldClass={fieldClass}
              />
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cscs_card_title" className={labelClass}>Title on Card</Label>
          <Input
            id="cscs_card_title"
            placeholder="e.g. Plant Operator"
            {...register('cscs_card_title')}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cscs_card_description" className={labelClass}>Description on Back of Card</Label>
        <Input
          id="cscs_card_description"
          placeholder="e.g. Plant Operations - Forward Tipping Dumper"
          {...register('cscs_card_description')}
          className={fieldClass}
        />
      </div>

      {/* ── Next of Kin ────────────────────────────────────────────────────── */}
      {sectionHeader('Next of Kin')}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="next_of_kin_name" className={labelClass}>Name</Label>
          <Input id="next_of_kin_name" {...register('next_of_kin_name')} className={fieldClass} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="next_of_kin_phone" className={labelClass}>Phone</Label>
          <Input
            id="next_of_kin_phone"
            type="tel"
            {...register('next_of_kin_phone')}
            className={fieldClass}
          />
        </div>
      </div>

      {/* ── Payroll ────────────────────────────────────────────────────────── */}
      {sectionHeader('Payroll (Sensitive)')}

      <p className="text-xs text-slate-500">These fields are masked in the operative profile. Confirm with Martin whether payroll runs inside the BOS — see Q3 and Q6 in JJ handoff notes.</p>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="bank_sort_code" className={labelClass}>Sort Code</Label>
          <Input
            id="bank_sort_code"
            placeholder="XX-XX-XX"
            {...register('bank_sort_code')}
            className={`${fieldClass} font-mono`}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bank_account_number" className={labelClass}>Account Number</Label>
          <Input
            id="bank_account_number"
            placeholder="XXXXXXXX"
            {...register('bank_account_number')}
            className={`${fieldClass} font-mono`}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="utr_number" className={labelClass}>UTR Number</Label>
          <Input
            id="utr_number"
            placeholder="1234567890"
            {...register('utr_number')}
            className={`${fieldClass} font-mono`}
          />
        </div>
      </div>

      {/* ── Other ──────────────────────────────────────────────────────────── */}
      {sectionHeader('Other')}

      <div className="flex items-center gap-3">
        <Controller
          control={control}
          name="wtd_opt_out"
          render={({ field }) => (
            <button
              type="button"
              role="switch"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                field.value ? 'bg-emerald-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                  field.value ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          )}
        />
        <Label className={labelClass}>WTD Opt-out signed</Label>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="medical_notes" className={labelClass}>Medical Notes</Label>
        <Textarea
          id="medical_notes"
          rows={3}
          {...register('medical_notes')}
          className={`${fieldClass} resize-none`}
          placeholder="Any medical conditions, allergies, or requirements"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="other_certifications" className={labelClass}>Other Certifications</Label>
        <Textarea
          id="other_certifications"
          rows={2}
          {...register('other_certifications')}
          className={`${fieldClass} resize-none`}
          placeholder="e.g. CPCS plant card, NPORS, GQA, EUSR, first aid, asbestos awareness"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes" className={labelClass}>General Notes</Label>
        <Textarea
          id="notes"
          rows={3}
          {...register('notes')}
          className={`${fieldClass} resize-none`}
          placeholder="Any general notes about this operative"
        />
      </div>

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mode === 'create' ? 'Create Operative' : 'Save Changes'}
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
