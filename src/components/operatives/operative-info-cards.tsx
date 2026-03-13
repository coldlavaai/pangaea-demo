'use client'

import {
  Phone, MapPin, Briefcase, Shield, User, Heart, FileText, ClipboardCheck,
} from 'lucide-react'
import { EditableInfoRow, InfoRow } from './editable-info-row'
import { MaskedField } from './masked-field'
import { OperativeCardsSection } from './operative-cards-section'
import type { OperativeCard } from './operative-cards-section'
import { OnboardingChecklist } from './onboarding-checklist'
import { cn } from '@/lib/utils'

// ── Constants ───────────────────────────────────────────────────────────────────

const LANGUAGE_OPTIONS = [
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

const LANGUAGE_LABELS: Record<string, string> = Object.fromEntries(LANGUAGE_OPTIONS.map(o => [o.value, o.label]))

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

const GRADE_OPTIONS = [
  { value: 'operative', label: 'Operative' },
  { value: 'mobile_crew', label: 'Mobile Crew' },
  { value: 'agency_labour', label: 'Agency Labour' },
  { value: 'groundworker', label: 'Groundworker' },
  { value: 'skilled_landscaper', label: 'Skilled Landscaper' },
  { value: 'plant_operator', label: 'Plant Operator' },
  { value: 'site_supervisor', label: 'Site Supervisor' },
  { value: 'site_manager', label: 'Site Manager' },
  { value: 'document_controller', label: 'Document Controller' },
  { value: 'skilled', label: 'Skilled' },
  { value: 'highly_skilled', label: 'Highly Skilled' },
  { value: 'exceptional_skill', label: 'Exceptional Skill' },
  { value: 'specialist_skill', label: 'Specialist Skill' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'manager', label: 'Manager' },
  { value: 'senior_manager', label: 'Senior Manager' },
  { value: 'contracts_manager', label: 'Contracts Manager' },
  { value: 'project_manager', label: 'Project Manager' },
]

const LABOUR_TYPE_OPTIONS = [
  { value: 'blue_collar', label: 'Blue Collar' },
  { value: 'white_collar', label: 'White Collar' },
]

const ENGAGEMENT_OPTIONS = [
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'cis_sole_trader', label: 'CIS Sole Trader' },
  { value: 'limited_company', label: 'Limited Company' },
  { value: 'agency', label: 'Agency' },
  { value: 'direct_paye', label: 'Direct PAYE' },
]

const SOURCE_OPTIONS = [
  { value: 'Giant', label: 'Giant' },
  { value: 'Elite', label: 'Elite' },
  { value: 'Direct', label: 'Direct' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Job Board', label: 'Job Board' },
  { value: 'Other', label: 'Other' },
]

const RTW_TYPE_OPTIONS = [
  { value: 'british_citizen', label: 'British Citizen' },
  { value: 'irish_citizen', label: 'Irish Citizen' },
  { value: 'eu_settled', label: 'EU Settled' },
  { value: 'eu_pre_settled', label: 'EU Pre-Settled' },
  { value: 'share_code', label: 'Share Code' },
  { value: 'biometric_residence_permit', label: 'Biometric Residence Permit' },
  { value: 'work_visa', label: 'Work Visa' },
  { value: 'other', label: 'Other' },
]

const CSCS_OPTIONS = [
  { value: 'green', label: 'Green (Labourer)' },
  { value: 'blue', label: 'Blue (Skilled)' },
  { value: 'gold', label: 'Gold (Advanced)' },
  { value: 'black', label: 'Black (Manager)' },
  { value: 'red', label: 'Red (Trainee)' },
  { value: 'white', label: 'White (Professional)' },
]

const CSCS_DOT_CLASS: Record<string, string> = {
  green: 'bg-forest-500',
  blue: 'bg-blue-500',
  gold: 'bg-amber-400',
  black: 'bg-muted',
  red: 'bg-red-500',
  white: 'bg-white',
}

const CSCS_COLOUR_LABEL: Record<string, string> = {
  green: 'Green',
  blue: 'Blue',
  gold: 'Gold',
  black: 'Black',
  red: 'Red',
  white: 'White',
}

const RTW_NO_EXPIRY = ['british_citizen', 'irish_citizen']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Op = Record<string, any>

function fmtDate(d: string | null | undefined): string | null {
  if (!d) return null
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

// ── Card wrapper ────────────────────────────────────────────────────────────────

function InfoCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      </div>
      <div className="px-3 py-2 space-y-1">{children}</div>
    </div>
  )
}

// ── Static field (read-only, same props as EditableInfoRow for easy swap) ────────

function StaticField({
  label,
  value,
  displayValue,
  mono = false,
  capitalize = false,
  highlight,
  type,
  prefix = '',
  suffix = '',
}: {
  label: string
  value: unknown
  displayValue?: string | null
  field?: string
  operativeId?: string
  type?: string
  options?: { value: string; label: string }[]
  mono?: boolean
  capitalize?: boolean
  highlight?: 'green' | 'amber' | 'red'
  suffix?: string
  prefix?: string
}) {
  let display = displayValue !== undefined ? displayValue : null
  if (display === null && value != null && value !== '') {
    let str = String(value)
    if (type === 'toggle') str = value === true ? 'Yes' : 'No'
    if (capitalize) str = str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    display = `${prefix}${str}${suffix}`
  }

  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={cn(
        'text-xs text-right',
        mono && 'font-mono',
        highlight === 'green' && 'text-forest-400',
        highlight === 'amber' && 'text-amber-400',
        highlight === 'red' && 'text-red-400',
        !highlight && 'text-muted-foreground',
      )}>
        {display ?? '—'}
      </span>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────────

interface OperativeInfoCardsProps {
  op: Op
  operativeId: string
  cards: OperativeCard[]
  /** Whether the current user can inline-edit fields (role-based) */
  canEdit?: boolean
}

export function OperativeInfoCards({ op, operativeId, cards, canEdit = false }: OperativeInfoCardsProps) {
  // Use EditableInfoRow when user has edit permission, static InfoRow otherwise
  const Field = canEdit ? EditableInfoRow : StaticField
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
      {/* Contact */}
      <InfoCard title="Contact" icon={Phone}>
        <Field label="Phone" value={op.phone} field="phone" operativeId={operativeId} />
        <Field label="Email" value={op.email} field="email" operativeId={operativeId} />
      </InfoCard>

      {/* Address */}
      <InfoCard title="Address" icon={MapPin}>
        <Field label="Line 1" value={op.address_line1} field="address_line1" operativeId={operativeId} />
        <Field label="Line 2" value={op.address_line2} field="address_line2" operativeId={operativeId} />
        <Field label="City" value={op.city} field="city" operativeId={operativeId} />
        <Field label="County" value={op.county} field="county" operativeId={operativeId} />
        <Field label="Postcode" value={op.postcode} field="postcode" operativeId={operativeId} />
      </InfoCard>

      {/* Identity */}
      <InfoCard title="Identity" icon={User}>
        <Field label="Date of Birth" value={op.date_of_birth} displayValue={fmtDate(op.date_of_birth)} field="date_of_birth" operativeId={operativeId} type="date" />
        <Field label="Nationality" value={op.nationality} field="nationality" operativeId={operativeId} />
        <InfoRow label="Document No." value={op.id_document_number} mono />
        <InfoRow label="ID Expiry" value={fmtDate(op.id_expiry)} />
        <Field label="NI Number" value={op.ni_number} field="ni_number" operativeId={operativeId} mono />
        <Field label="Gender" value={op.gender} displayValue={op.gender === 'prefer_not_to_say' ? 'Prefer not to say' : op.gender ? op.gender.charAt(0).toUpperCase() + op.gender.slice(1) : null} field="gender" operativeId={operativeId} type="select" options={GENDER_OPTIONS} />
        <Field label="Preferred Language" value={op.preferred_language} displayValue={op.preferred_language ? (LANGUAGE_LABELS[op.preferred_language] ?? op.preferred_language) : null} field="preferred_language" operativeId={operativeId} type="select" options={LANGUAGE_OPTIONS} />
      </InfoCard>

      {/* Work Details */}
      <InfoCard title="Work Details" icon={Briefcase}>
        <Field label="Labour Type" value={op.labour_type} field="labour_type" operativeId={operativeId} type="select" options={LABOUR_TYPE_OPTIONS} capitalize />
        <InfoRow label="Trade" value={op.trade_category?.name} />
        <Field label="Grade" value={op.grade} field="grade" operativeId={operativeId} type="select" options={GRADE_OPTIONS} capitalize />
        <Field label="Day Rate" value={op.day_rate} displayValue={op.day_rate != null ? `£${Number(op.day_rate).toFixed(2)}` : null} field="day_rate" operativeId={operativeId} type="number" prefix="£" />
        <Field label="Charge Rate" value={op.charge_rate} displayValue={op.charge_rate != null ? `£${Number(op.charge_rate).toFixed(2)}` : null} field="charge_rate" operativeId={operativeId} type="number" prefix="£" />
        {op.day_rate != null && op.charge_rate != null && (() => {
          const day = Number(op.day_rate)
          const charge = Number(op.charge_rate)
          const margin = charge > 0 ? ((charge - day) / charge * 100) : 0
          return <InfoRow label="Margin" value={`${margin.toFixed(1)}% (£${(charge - day).toFixed(2)}/day)`} highlight={margin >= 20 ? 'green' : margin > 0 ? 'amber' : 'red'} />
        })()}
        <Field label="Hourly Rate" value={op.hourly_rate} displayValue={op.hourly_rate != null ? `£${Number(op.hourly_rate).toFixed(2)}` : null} field="hourly_rate" operativeId={operativeId} type="number" prefix="£" />
        <Field label="Start Date" value={op.start_date} displayValue={fmtDate(op.start_date)} field="start_date" operativeId={operativeId} type="date" />
        <Field label="Experience" value={op.experience_years} displayValue={op.experience_years != null ? `${op.experience_years} yr${op.experience_years !== 1 ? 's' : ''}` : null} field="experience_years" operativeId={operativeId} type="number" suffix=" yrs" />
        <Field label="Agency / Source" value={op.source} field="source" operativeId={operativeId} type="select" options={SOURCE_OPTIONS} />
        <Field label="Engagement" value={op.engagement_method} field="engagement_method" operativeId={operativeId} type="select" options={ENGAGEMENT_OPTIONS} />
        {op.engagement_method === 'agency' && (
          <Field label="Agency Name" value={op.agency_name} field="agency_name" operativeId={operativeId} />
        )}
        <Field label="Trading Name" value={op.trading_name} field="trading_name" operativeId={operativeId} />
        <Field label="Min. Rate" value={op.min_acceptable_rate} displayValue={op.min_acceptable_rate != null ? `£${Number(op.min_acceptable_rate).toFixed(2)}/day` : null} field="min_acceptable_rate" operativeId={operativeId} type="number" prefix="£" />
        <Field label="Machine Op" value={op.machine_operator} field="machine_operator" operativeId={operativeId} type="toggle" />
      </InfoCard>

      {/* Right to Work */}
      <InfoCard title="Right to Work" icon={Shield}>
        <Field label="RTW Type" value={op.rtw_type} field="rtw_type" operativeId={operativeId} type="select" options={RTW_TYPE_OPTIONS} capitalize />
        <Field label="Verified" value={op.rtw_verified} field="rtw_verified" operativeId={operativeId} type="toggle" highlight={op.rtw_verified === true ? 'green' : op.rtw_verified === false ? 'red' : undefined} />
        {RTW_NO_EXPIRY.includes(op.rtw_type ?? '') ? (
          <InfoRow label="RTW Expiry" value="No expiry (UK/Irish citizen)" />
        ) : (
          <Field label="RTW Expiry" value={op.rtw_expiry} displayValue={fmtDate(op.rtw_expiry)} field="rtw_expiry" operativeId={operativeId} type="date" />
        )}
        {RTW_NO_EXPIRY.includes(op.rtw_type ?? '') ? (
          <InfoRow label="Share Code" value="N/A" />
        ) : (
          <Field label="Share Code" value={op.rtw_share_code} field="rtw_share_code" operativeId={operativeId} mono />
        )}
        <Field label="GOV.UK Check" value={op.gov_rtw_checked} field="gov_rtw_checked" operativeId={operativeId} type="toggle" />
      </InfoCard>

      {/* CSCS */}
      <InfoCard title="CSCS / Tickets" icon={FileText}>
        {op.cscs_card_type && (
          <div className="flex items-center gap-2 py-1">
            <span className={`inline-block h-3 w-3 rounded-full shrink-0 ${CSCS_DOT_CLASS[op.cscs_card_type] ?? 'bg-muted'}`} />
            <span className="text-sm font-medium text-muted-foreground">
              {CSCS_COLOUR_LABEL[op.cscs_card_type] ?? op.cscs_card_type} Card
              {op.cscs_card_title ? ` — ${op.cscs_card_title}` : ''}
            </span>
          </div>
        )}
        <Field label="Card Type" value={op.cscs_card_type} field="cscs_card_type" operativeId={operativeId} type="select" options={CSCS_OPTIONS} />
        <Field label="Card Number" value={op.cscs_card_number} field="cscs_card_number" operativeId={operativeId} mono />
        <Field label="Expiry" value={op.cscs_expiry} displayValue={fmtDate(op.cscs_expiry)} field="cscs_expiry" operativeId={operativeId} type="date" />
        <Field label="Title on Card" value={op.cscs_card_title} field="cscs_card_title" operativeId={operativeId} />
        <Field label="Card Description" value={op.cscs_card_description} field="cscs_card_description" operativeId={operativeId} />
      </InfoCard>

      {/* Additional Cards */}
      <InfoCard title="Additional Cards" icon={FileText}>
        <OperativeCardsSection operativeId={operativeId} cards={cards} />
      </InfoCard>

      {/* Next of Kin */}
      <InfoCard title="Next of Kin" icon={Heart}>
        <Field label="Name" value={op.next_of_kin_name} field="next_of_kin_name" operativeId={operativeId} />
        <Field label="Phone" value={op.next_of_kin_phone} field="next_of_kin_phone" operativeId={operativeId} />
      </InfoCard>

      {/* Onboarding */}
      <InfoCard title="Onboarding Checklist" icon={ClipboardCheck}>
        <OnboardingChecklist
          operativeId={operativeId}
          blueSticker={op.onboarding_blue_sticker_issued ?? false}
          buddyAllocated={op.onboarding_buddy_allocated ?? false}
          twoWeekReview={op.onboarding_two_week_review ?? false}
          inductionComplete={op.onboarding_induction_complete ?? false}
        />
      </InfoCard>

      {/* Compliance */}
      <InfoCard title="Compliance" icon={Shield}>
        <Field label="WTD Opt-out" value={op.wtd_opt_out} field="wtd_opt_out" operativeId={operativeId} type="toggle" />
        <Field label="Medical Notes" value={op.medical_notes} field="medical_notes" operativeId={operativeId} type="textarea" />
        <Field label="Other Certifications" value={op.other_certifications} field="other_certifications" operativeId={operativeId} type="textarea" />
        <Field label="Caution Reason" value={op.caution_reason} field="caution_reason" operativeId={operativeId} type="textarea" highlight={op.caution_reason ? 'amber' : undefined} />
      </InfoCard>

      {/* Payroll */}
      <InfoCard title="Payroll & Bank" icon={Briefcase}>
        <Field label="Sort Code" value={op.bank_sort_code} field="bank_sort_code" operativeId={operativeId} mono />
        <Field label="Account No" value={op.bank_account_number} field="bank_account_number" operativeId={operativeId} mono />
        <Field label="UTR" value={op.utr_number} field="utr_number" operativeId={operativeId} mono />
      </InfoCard>

      {/* Notes */}
      <InfoCard title="Notes" icon={FileText}>
        <Field label="Notes" value={op.notes} field="notes" operativeId={operativeId} type="textarea" />
      </InfoCard>
    </div>
  )
}
