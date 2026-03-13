'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

const COUNTRIES = [
  { code: 'GB', dial: '44', flag: '\u{1F1EC}\u{1F1E7}', name: 'United Kingdom' },
  { code: 'IE', dial: '353', flag: '\u{1F1EE}\u{1F1EA}', name: 'Ireland' },
  { code: 'PL', dial: '48', flag: '\u{1F1F5}\u{1F1F1}', name: 'Poland' },
  { code: 'RO', dial: '40', flag: '\u{1F1F7}\u{1F1F4}', name: 'Romania' },
  { code: 'BG', dial: '359', flag: '\u{1F1E7}\u{1F1EC}', name: 'Bulgaria' },
  { code: 'US', dial: '1', flag: '\u{1F1FA}\u{1F1F8}', name: 'United States' },
  { code: 'CA', dial: '1', flag: '\u{1F1E8}\u{1F1E6}', name: 'Canada' },
  { code: 'AU', dial: '61', flag: '\u{1F1E6}\u{1F1FA}', name: 'Australia' },
  { code: 'NZ', dial: '64', flag: '\u{1F1F3}\u{1F1FF}', name: 'New Zealand' },
  { code: 'FR', dial: '33', flag: '\u{1F1EB}\u{1F1F7}', name: 'France' },
  { code: 'DE', dial: '49', flag: '\u{1F1E9}\u{1F1EA}', name: 'Germany' },
  { code: 'ES', dial: '34', flag: '\u{1F1EA}\u{1F1F8}', name: 'Spain' },
  { code: 'PT', dial: '351', flag: '\u{1F1F5}\u{1F1F9}', name: 'Portugal' },
  { code: 'IT', dial: '39', flag: '\u{1F1EE}\u{1F1F9}', name: 'Italy' },
  { code: 'NL', dial: '31', flag: '\u{1F1F3}\u{1F1F1}', name: 'Netherlands' },
  { code: 'LT', dial: '370', flag: '\u{1F1F1}\u{1F1F9}', name: 'Lithuania' },
  { code: 'LV', dial: '371', flag: '\u{1F1F1}\u{1F1FB}', name: 'Latvia' },
  { code: 'CZ', dial: '420', flag: '\u{1F1E8}\u{1F1FF}', name: 'Czech Republic' },
  { code: 'SK', dial: '421', flag: '\u{1F1F8}\u{1F1F0}', name: 'Slovakia' },
  { code: 'HU', dial: '36', flag: '\u{1F1ED}\u{1F1FA}', name: 'Hungary' },
] as const

type Country = (typeof COUNTRIES)[number]

/**
 * Parse an E.164 phone string into { country, localNumber }.
 * Tries longest dial code first to avoid ambiguity (e.g. +353 vs +3).
 */
function parseE164(value: string): { country: Country; localNumber: string } {
  if (!value || !value.startsWith('+')) {
    return { country: COUNTRIES[0], localNumber: value?.replace(/^\+/, '') || '' }
  }

  const digits = value.slice(1) // remove leading +

  // Sort by dial code length descending so longer codes match first
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)

  for (const c of sorted) {
    if (digits.startsWith(c.dial)) {
      return { country: c, localNumber: digits.slice(c.dial.length) }
    }
  }

  // No match — default to GB, put everything in local
  return { country: COUNTRIES[0], localNumber: digits }
}

interface PhoneInputProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  id?: string
  name?: string
}

function PhoneInput({
  value = '',
  onChange,
  className,
  placeholder = '7742201349',
  disabled,
  id,
  name,
}: PhoneInputProps) {
  const parsed = parseE164(value)
  const [selectedCode, setSelectedCode] = React.useState<string>(parsed.country.code)
  const [localNumber, setLocalNumber] = React.useState(parsed.localNumber)

  // Keep internal state in sync when external value changes
  const lastValueRef = React.useRef(value)
  React.useEffect(() => {
    if (value !== lastValueRef.current) {
      lastValueRef.current = value
      const p = parseE164(value)
      setSelectedCode(p.country.code)
      setLocalNumber(p.localNumber)
    }
  }, [value])

  const country = COUNTRIES.find((c) => c.code === selectedCode) || COUNTRIES[0]

  function emitChange(dial: string, local: string) {
    // Strip leading 0 from local number
    const cleaned = local.replace(/^0+/, '').replace(/\D/g, '')
    const e164 = cleaned ? `+${dial}${cleaned}` : ''
    lastValueRef.current = e164
    onChange?.(e164)
  }

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const code = e.target.value
    setSelectedCode(code)
    const c = COUNTRIES.find((ct) => ct.code === code) || COUNTRIES[0]
    emitChange(c.dial, localNumber)
  }

  function handleLocalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setLocalNumber(raw)
    emitChange(country.dial, raw)
  }

  return (
    <div className={cn('flex gap-0', className)}>
      <select
        value={selectedCode}
        onChange={handleCountryChange}
        disabled={disabled}
        aria-label="Country code"
        className={cn(
          'h-9 rounded-l-md rounded-r-none border border-r-0 px-2 text-sm',
          'bg-card border-border text-foreground',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring',
          'disabled:pointer-events-none disabled:opacity-50',
          'appearance-none cursor-pointer'
        )}
        style={{ minWidth: '5.5rem' }}
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} +{c.dial}
          </option>
        ))}
      </select>
      <input
        id={id}
        name={name}
        type="tel"
        value={localNumber}
        onChange={handleLocalChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'h-9 w-full min-w-0 rounded-r-md rounded-l-none border px-3 py-1 text-sm',
          'bg-card border-border text-foreground placeholder:text-muted-foreground',
          'shadow-xs transition-[color,box-shadow] outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
        )}
      />
    </div>
  )
}

export { PhoneInput, COUNTRIES }
