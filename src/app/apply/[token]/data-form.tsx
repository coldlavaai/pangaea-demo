'use client'

import { useState } from 'react'

import { t, fieldLabel } from '@/lib/i18n/apply'

interface DataFormProps {
  token: string
  firstName: string
  dataFields: string[]
  lang?: string
}

// Required fields that must be filled (others are optional but shown)
const REQUIRED_FIELDS = new Set(['ni_number', 'email', 'phone', 'bank_details'])

interface FieldConfig {
  label: string
  placeholder: string
  inputType: 'text' | 'email' | 'tel' | 'textarea'
  hint?: string
  pattern?: string
  patternMessage?: string
}

const FIELD_CONFIG: Record<string, FieldConfig> = {
  email: {
    label: 'Email Address',
    placeholder: 'your.name@example.com',
    inputType: 'email',
    hint: 'We use this for payslips and important updates',
  },
  phone: {
    label: 'Mobile Number',
    placeholder: '07700 900000',
    inputType: 'tel',
    hint: 'UK mobile number',
  },
  address: {
    label: 'Home Address',
    placeholder: '123 High Street, Liverpool, L1 1AA',
    inputType: 'textarea',
    hint: 'Include full address with postcode',
  },
  bank_details: {
    label: 'Bank Account Details',
    placeholder: 'Sort code: 12-34-56\nAccount number: 12345678',
    inputType: 'textarea',
    hint: 'Please include both your sort code and account number',
  },
  ni_number: {
    label: 'National Insurance Number',
    placeholder: 'AB 12 34 56 C',
    inputType: 'text',
    hint: 'Found on your payslip, P60, or any HMRC letter',
  },
  utr: {
    label: 'UTR Number',
    placeholder: '1234567890',
    inputType: 'text',
    hint: '10-digit Unique Taxpayer Reference — found on HMRC correspondence',
  },
  nok_name: {
    label: "Next of Kin — Full Name",
    placeholder: 'Jane Smith',
    inputType: 'text',
    hint: 'Who should we contact in an emergency?',
  },
  nok_phone: {
    label: "Next of Kin — Phone Number",
    placeholder: '07700 900000',
    inputType: 'tel',
  },
  date_of_birth: {
    label: 'Date of Birth',
    placeholder: 'DD/MM/YYYY',
    inputType: 'text',
    hint: 'Format: DD/MM/YYYY',
  },
}

export default function DataForm({ token, firstName, dataFields, lang = 'en' }: DataFormProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(dataFields.map(f => [f, '']))
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const requiredFields = dataFields.filter(f => REQUIRED_FIELDS.has(f))
  const canSubmit = requiredFields.every(f => values[f]?.trim())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // Only submit fields that have a value
    const fieldsToSubmit = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v.trim())
    )

    try {
      const res = await fetch(`/api/apply/${token}/submit-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fieldsToSubmit }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Submission failed. Please try again.')
        return
      }
      setSuccess(true)
    } catch {
      setError('Something went wrong. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-900/40 border border-emerald-700 text-2xl mx-auto">
          ✓
        </div>
        <h2 className="text-lg font-bold text-white">✓</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          {t('success', lang)}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {dataFields.map((field, i) => {
        const config = FIELD_CONFIG[field]
        if (!config) return null
        const isRequired = REQUIRED_FIELDS.has(field)
        const sectionNum = i + 1
        const displayLabel = lang !== 'en' ? fieldLabel(field, lang) : config.label

        return (
          <div key={field} className="space-y-2">
            {dataFields.length > 1 && (
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold">
                  {sectionNum}
                </span>
                <p className="text-sm font-semibold text-slate-200">
                  {displayLabel}
                  {isRequired && <span className="text-red-400 ml-1">*</span>}
                </p>
              </div>
            )}
            {dataFields.length === 1 && (
              <div>
                <p className="text-sm font-semibold text-slate-200 mb-0.5">
                  {displayLabel}
                  {isRequired && <span className="text-red-400 ml-1">*</span>}
                </p>
                {config.hint && (
                  <p className="text-xs text-slate-500">{config.hint}</p>
                )}
              </div>
            )}
            {config.inputType === 'textarea' ? (
              <textarea
                rows={3}
                placeholder={config.placeholder}
                value={values[field]}
                onChange={e => setValues(v => ({ ...v, [field]: e.target.value }))}
                required={isRequired}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
              />
            ) : (
              <input
                type={config.inputType}
                placeholder={config.placeholder}
                value={values[field]}
                onChange={e => setValues(v => ({ ...v, [field]: e.target.value }))}
                required={isRequired}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500"
              />
            )}
            {dataFields.length > 1 && config.hint && (
              <p className="text-xs text-slate-600">{config.hint}</p>
            )}
          </div>
        )
      })}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !canSubmit}
        className={`
          w-full py-3 rounded-lg font-semibold text-sm transition-all
          ${submitting || !canSubmit
            ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
            : 'bg-[#D4AF37] hover:bg-[#c9a72f] text-slate-900 active:scale-[0.98]'
          }
        `}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t('submitting', lang)}
          </span>
        ) : t('submit', lang)}
      </button>

      <p className="text-center text-xs text-slate-700">
        Securely stored · Pangaea team only
      </p>
    </form>
  )
}
