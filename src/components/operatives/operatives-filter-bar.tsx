'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp, Check } from 'lucide-react'

interface TradeCategory {
  id: string
  name: string
}

interface OperativesFilterBarProps {
  tradeCategories: TradeCategory[]
  nationalities: string[]
  languages: string[]
  initialQ?: string
  initialStatus?: string
  initialTradeId?: string
  initialLabourType?: string
  initialNationality?: string
  initialGrade?: string
  initialLanguage?: string
  initialCscsType?: string
  initialRapMin?: string
  initialRateMin?: string
  initialRateMax?: string
  initialSort?: string
  initialMissing?: string
}

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

const GRADES = [
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

const CSCS_TYPES = [
  { value: 'green', label: 'Green (Labourer)' },
  { value: 'blue', label: 'Blue (Skilled)' },
  { value: 'gold', label: 'Gold (Advanced)' },
  { value: 'black', label: 'Black (Manager)' },
  { value: 'red', label: 'Red (Trainee)' },
  { value: 'white', label: 'White (Academic)' },
]

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest first' },
  { value: 'created_at:asc', label: 'Oldest first' },
  { value: 'last_name:asc', label: 'Name A–Z' },
  { value: 'last_name:desc', label: 'Name Z–A' },
  { value: 'day_rate:desc', label: 'Rate: High–Low' },
  { value: 'day_rate:asc', label: 'Rate: Low–High' },
  { value: 'avg_rap_score:desc', label: 'RAP: High–Low' },
  { value: 'avg_rap_score:asc', label: 'RAP: Low–High' },
  { value: 'last_worked_date:desc', label: 'Last Worked: Recent' },
  { value: 'last_worked_date:asc', label: 'Last Worked: Oldest' },
  { value: 'data_completeness_score:asc', label: 'Issues: Most first' },
  { value: 'data_completeness_score:desc', label: 'Issues: Least first' },
]

const MISSING_FIELDS = [
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'ni', label: 'NI Number' },
  { value: 'cscs_expiry', label: 'CSCS Expiry' },
  { value: 'day_rate', label: 'Day Rate' },
  { value: 'trade', label: 'Trade' },
]

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English', ro: 'Romanian', pl: 'Polish', bg: 'Bulgarian',
  pt: 'Portuguese', es: 'Spanish', lt: 'Lithuanian', lv: 'Latvian',
}

// ─── Multi-select dropdown ────────────────────────────────────────────────────
function MultiSelect({
  options,
  values,
  onToggle,
  placeholder,
  width = 'w-44',
}: {
  options: { value: string; label: string }[]
  values: string[]
  onToggle: (value: string) => void
  placeholder: string
  width?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const label = values.length === 0
    ? placeholder
    : values.length === 1
      ? (options.find(o => o.value === values[0])?.label ?? values[0])
      : `${placeholder} (${values.length})`

  return (
    <div ref={ref} className={`relative ${width}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center justify-between w-full px-3 py-2 text-sm bg-slate-900 border rounded-md hover:bg-slate-800 transition-colors ${
          values.length > 0 ? 'border-emerald-700 text-slate-200' : 'border-slate-700 text-slate-500'
        }`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-4 w-4 ml-2 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-full bg-slate-900 border border-slate-700 rounded-md shadow-xl py-1 max-h-64 overflow-y-auto">
          {options.map(opt => {
            const checked = values.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onToggle(opt.value)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-slate-800 transition-colors text-left"
              >
                <span className={`flex items-center justify-center h-4 w-4 rounded border shrink-0 transition-colors ${
                  checked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-600'
                }`}>
                  {checked && <Check className="h-3 w-3 text-white" />}
                </span>
                <span className={checked ? 'text-slate-200' : 'text-slate-400'}>{opt.label}</span>
              </button>
            )
          })}
          {values.length > 0 && (
            <div className="border-t border-slate-800 mt-1 pt-1">
              <button
                type="button"
                onClick={() => values.forEach(v => onToggle(v))}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800"
              >
                <X className="h-3 w-3" /> Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function OperativesFilterBar({
  tradeCategories,
  nationalities,
  languages,
  initialQ = '',
  initialStatus = '',
  initialTradeId = '',
  initialLabourType = '',
  initialNationality = '',
  initialGrade = '',
  initialLanguage = '',
  initialCscsType = '',
  initialRapMin = '',
  initialRateMin = '',
  initialRateMax = '',
  initialSort = '',
  initialMissing = '',
}: OperativesFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchValue, setSearchValue] = useState(initialQ)
  const [statusValues, setStatusValues] = useState<string[]>(
    initialStatus ? initialStatus.split(',').filter(Boolean) : []
  )
  const [tradeValues, setTradeValues] = useState<string[]>(
    initialTradeId ? initialTradeId.split(',').filter(Boolean) : []
  )
  const [missingValues, setMissingValues] = useState<string[]>(
    initialMissing ? initialMissing.split(',').filter(Boolean) : []
  )
  const [showMore, setShowMore] = useState(
    !!(initialNationality || initialGrade || initialLanguage || initialCscsType || initialRapMin || initialRateMin || initialRateMax)
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const advancedFilters = !!(initialNationality || initialGrade || initialLanguage || initialCscsType || initialRapMin || initialRateMin || initialRateMax)
  const hasFilters = !!(initialQ || initialStatus || initialTradeId || initialLabourType || initialMissing) || advancedFilters

  const current = {
    q: searchValue,
    status: statusValues.join(','),
    trade_id: tradeValues.join(','),
    labour_type: initialLabourType,
    missing: missingValues.join(','),
    nationality: initialNationality,
    grade: initialGrade,
    language: initialLanguage,
    cscs_type: initialCscsType,
    rap_min: initialRapMin,
    rate_min: initialRateMin,
    rate_max: initialRateMax,
    sort: initialSort,
  }

  const pushUrl = (overrides: Record<string, string>, replace = false) => {
    const merged = { ...current, ...overrides }
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v)
    }
    p.delete('page')
    const url = `${pathname}?${p.toString()}`
    // Use replace for search typing so back button skips intermediate states
    if (replace) {
      router.replace(url)
    } else {
      router.push(url)
    }
  }

  const handleSearch = (value: string) => {
    setSearchValue(value)
    clearTimeout(debounceRef.current)
    // Live search after 2+ characters, 300ms debounce, uses replace to keep back button clean
    debounceRef.current = setTimeout(() => {
      if (value.length >= 2 || value.length === 0) {
        pushUrl({ q: value }, true)
      }
    }, 300)
  }

  const toggleStatus = (val: string) => {
    const next = statusValues.includes(val) ? statusValues.filter(v => v !== val) : [...statusValues, val]
    setStatusValues(next)
    pushUrl({ status: next.join(',') })
  }

  const toggleTrade = (val: string) => {
    const next = tradeValues.includes(val) ? tradeValues.filter(v => v !== val) : [...tradeValues, val]
    setTradeValues(next)
    pushUrl({ trade_id: next.join(',') })
  }

  const toggleMissing = (val: string) => {
    const next = missingValues.includes(val) ? missingValues.filter(v => v !== val) : [...missingValues, val]
    setMissingValues(next)
    pushUrl({ missing: next.join(',') })
  }

  const clearAll = () => {
    setSearchValue('')
    setStatusValues([])
    setTradeValues([])
    setMissingValues([])
    router.push(pathname)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <Input
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name, phone, ref, NI…"
            className="pl-9 bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500 focus-visible:ring-emerald-500"
          />
        </div>

        <MultiSelect
          options={STATUSES}
          values={statusValues}
          onToggle={toggleStatus}
          placeholder="All Statuses"
          width="w-44"
        />

        <MultiSelect
          options={tradeCategories.map(t => ({ value: t.id, label: t.name }))}
          values={tradeValues}
          onToggle={toggleTrade}
          placeholder="All Trades"
          width="w-48"
        />

        <Select
          value={initialLabourType || 'all'}
          onValueChange={(v) => pushUrl({ labour_type: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-36 bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="all" className="text-slate-300">All Types</SelectItem>
            <SelectItem value="blue_collar" className="text-slate-300">Blue Collar</SelectItem>
            <SelectItem value="white_collar" className="text-slate-300">White Collar</SelectItem>
          </SelectContent>
        </Select>

        <MultiSelect
          options={MISSING_FIELDS}
          values={missingValues}
          onToggle={toggleMissing}
          placeholder="Missing Field"
          width="w-40"
        />

        <Select
          value={initialSort || 'created_at:desc'}
          onValueChange={(v) => pushUrl({ sort: v === 'created_at:desc' ? '' : v })}
        >
          <SelectTrigger className="w-44 bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-slate-300">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMore(v => !v)}
          className={`text-slate-400 hover:text-slate-200 gap-1 ${advancedFilters ? 'text-emerald-400 hover:text-emerald-300' : ''}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          More
          {advancedFilters && <span className="bg-emerald-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">+</span>}
          {showMore ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-slate-400 hover:text-slate-200">
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {showMore && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          {nationalities.length > 0 ? (
            <Select value={initialNationality || 'all'} onValueChange={(v) => pushUrl({ nationality: v === 'all' ? '' : v })}>
              <SelectTrigger className="w-44 bg-slate-900 border-slate-700 text-slate-300"><SelectValue placeholder="Nationality" /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all" className="text-slate-300">All Nationalities</SelectItem>
                {nationalities.map((n) => <SelectItem key={n} value={n} className="text-slate-300">{n}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input value={initialNationality} onChange={(e) => pushUrl({ nationality: e.target.value })} placeholder="Nationality…" className="w-36 bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500" />
          )}

          <Select value={initialGrade || 'all'} onValueChange={(v) => pushUrl({ grade: v === 'all' ? '' : v })}>
            <SelectTrigger className="w-44 bg-slate-900 border-slate-700 text-slate-300"><SelectValue placeholder="Grade" /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-slate-300">All Grades</SelectItem>
              {GRADES.map((g) => <SelectItem key={g.value} value={g.value} className="text-slate-300">{g.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={initialLanguage || 'all'} onValueChange={(v) => pushUrl({ language: v === 'all' ? '' : v })}>
            <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-slate-300"><SelectValue placeholder="Language" /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-slate-300">All Languages</SelectItem>
              {languages.map((l) => (
                <SelectItem key={l} value={l} className="text-slate-300">{LANGUAGE_LABELS[l] ?? l.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={initialCscsType || 'all'} onValueChange={(v) => pushUrl({ cscs_type: v === 'all' ? '' : v })}>
            <SelectTrigger className="w-44 bg-slate-900 border-slate-700 text-slate-300"><SelectValue placeholder="CSCS Card" /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-slate-300">All CSCS Types</SelectItem>
              {CSCS_TYPES.map((c) => <SelectItem key={c.value} value={c.value} className="text-slate-300">{c.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">RAP min</label>
            <Input type="number" min="1" max="5" step="0.1" value={initialRapMin} onChange={(e) => pushUrl({ rap_min: e.target.value })} placeholder="e.g. 3.5" className="w-24 bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-600" />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">Rate £</label>
            <Input type="number" min="0" value={initialRateMin} onChange={(e) => pushUrl({ rate_min: e.target.value })} placeholder="Min" className="w-20 bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-600" />
            <span className="text-slate-600 text-xs">–</span>
            <Input type="number" min="0" value={initialRateMax} onChange={(e) => pushUrl({ rate_max: e.target.value })} placeholder="Max" className="w-20 bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-600" />
          </div>
        </div>
      )}
    </div>
  )
}
