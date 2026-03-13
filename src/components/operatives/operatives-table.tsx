'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { GripVertical, Lock, SlidersHorizontal, AlignJustify, List, Rows3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { CSCS_DOT_CLASS, CSCS_COLOUR_LABEL } from '@/lib/cscs-colours'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

export type OperativeRow = {
  id: string
  reference_number: string | null
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  ni_number: string | null
  date_of_birth: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  county: string | null
  postcode: string | null
  next_of_kin_name: string | null
  next_of_kin_phone: string | null
  bank_sort_code: string | null
  bank_account_number: string | null
  utr_number: string | null
  cscs_card_type: string | null
  cscs_card_number: string | null
  cscs_expiry: string | null
  cscs_card_title: string | null
  cscs_card_description: string | null
  day_rate: number | null
  hourly_rate: number | null
  charge_rate: number | null
  grade: string | null
  status: string | null
  avg_rap_score: number | null
  rap_traffic_light: string | null
  total_jobs: number | null
  labour_type: string | null
  nationality: string | null
  preferred_language: string | null
  compliance_alert: string | null
  agency_name: string | null
  start_date: string | null
  last_worked_date: string | null
  notes: string | null
  trade_category: { name: string } | null
  entry_source: 'manual' | 'import' | 'sophie' | 'referral' | 'other' | null
  data_completeness_score: number | null
  has_verified_photo_id: boolean | null
  has_verified_rtw: boolean | null
}

type SearchParams = {
  q?: string; status?: string; trade_id?: string; labour_type?: string
  compliance?: string; data_issues?: string; missing?: string; page?: string
  nationality?: string; grade?: string; language?: string; cscs_type?: string
  rap_min?: string; rate_min?: string; rate_max?: string; sort?: string
}

type ColDef = {
  id: string
  label: string
  sortField?: string
  locked?: boolean
  defaultHidden?: boolean
  render: (op: OperativeRow) => React.ReactNode
}

const COLUMN_DEFS: ColDef[] = [
  {
    id: 'ref', label: 'Ref', sortField: 'reference_number', locked: true,
    render: op => <span className="font-mono text-slate-400">{op.reference_number ?? '—'}</span>,
  },
  {
    id: 'first_name', label: 'First Name(s)', sortField: 'first_name', locked: true,
    render: op => (
      <div className="flex items-center gap-1.5">
        {op.cscs_card_type && CSCS_DOT_CLASS[op.cscs_card_type] && (
          <span
            title={`${CSCS_COLOUR_LABEL[op.cscs_card_type] ?? op.cscs_card_type} CSCS`}
            className={`inline-block h-2 w-2 rounded-full shrink-0 ${CSCS_DOT_CLASS[op.cscs_card_type]}`}
          />
        )}
        <Link href={`/operatives/${op.id}`} className="font-medium text-slate-200 hover:text-emerald-400 transition-colors max-w-[100px] truncate block">
          {op.first_name}
        </Link>
      </div>
    ),
  },
  {
    id: 'last_name', label: 'Surname', sortField: 'last_name', locked: true,
    render: op => <span className="font-medium text-slate-200 max-w-[100px] truncate block">{op.last_name}</span>,
  },
  {
    id: 'data_issues', label: 'Issues', sortField: 'data_completeness_score',
    render: op => {
      const checks = [
        { label: 'Phone',        missing: !op.phone },
        { label: 'Email',        missing: !op.email },
        { label: 'NI',           missing: !op.ni_number },
        { label: 'DOB',          missing: !op.date_of_birth },
        { label: 'Addr 1',       missing: !op.address_line1 },
        { label: 'City',         missing: !op.city },
        { label: 'Postcode',     missing: !op.postcode },
        { label: 'NOK Name',     missing: !op.next_of_kin_name },
        { label: 'NOK Phone',    missing: !op.next_of_kin_phone },
        { label: 'Sort Code',    missing: !op.bank_sort_code },
        { label: 'Account',      missing: !op.bank_account_number },
        { label: 'UTR',          missing: !op.utr_number },
        { label: 'CSCS Type',    missing: !op.cscs_card_type },
        { label: 'CSCS No',      missing: !op.cscs_card_number },
        { label: 'CSCS Exp',     missing: !!(op.cscs_card_type && !op.cscs_expiry) },
        { label: 'CSCS Title',   missing: !op.cscs_card_title },
        { label: 'Photo ID (verified)',  missing: !op.has_verified_photo_id },
        { label: 'RTW Doc (verified)',  missing: !op.has_verified_rtw },
        { label: 'Day Rate',     missing: !op.day_rate },
        { label: 'Hrly Rate',    missing: !op.hourly_rate },
        { label: 'Charge Rate',  missing: !op.charge_rate },
        { label: 'Grade',        missing: !op.grade },
        { label: 'Labour Type',  missing: !op.labour_type },
        { label: 'Nationality',  missing: !op.nationality },
        { label: 'Start Date',   missing: !op.start_date },
        { label: 'Trade',        missing: !op.trade_category },
      ]
      const missing = checks.filter(c => c.missing)
      const total = checks.length
      const complete = total - missing.length
      if (missing.length === 0) return (
        <span className="text-[10px] font-medium text-emerald-500">✓ {total}/{total}</span>
      )
      const pct = complete / total
      const color = pct >= 0.9 ? 'text-amber-400' : pct >= 0.7 ? 'text-orange-400' : 'text-red-400'
      const bgColor = pct >= 0.9 ? 'bg-amber-950/60 border-amber-900/50' : pct >= 0.7 ? 'bg-orange-950/60 border-orange-900/50' : 'bg-red-950/60 border-red-900/50'
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border cursor-help ${color} ${bgColor}`}>
              {complete}/{total}
            </span>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-900 border border-slate-700 text-slate-200 p-2 max-w-[280px]">
            <p className="text-[10px] font-semibold text-slate-400 mb-1.5">Missing ({missing.length} fields)</p>
            <div className="flex flex-wrap gap-1">
              {missing.map(c => (
                <span key={c.label} className="text-[10px] px-1 py-px bg-orange-950/60 text-orange-400 border border-orange-900/50 rounded">{c.label}</span>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )
    },
  },
  {
    id: 'entry_source', label: 'Source',
    render: op => {
      const cfg: Record<string, { label: string; cls: string }> = {
        manual:   { label: 'Manual',   cls: 'bg-slate-800 text-slate-400 border-slate-700' },
        import:   { label: 'Import',   cls: 'bg-blue-950/60 text-blue-400 border-blue-900/50' },
        sophie:   { label: 'Amber',   cls: 'bg-emerald-950/60 text-emerald-400 border-emerald-900/50' },
        referral: { label: 'Referral', cls: 'bg-purple-950/60 text-purple-400 border-purple-900/50' },
        other:    { label: 'Other',    cls: 'bg-slate-800 text-slate-500 border-slate-700' },
      }
      const s = op.entry_source ?? 'manual'
      const c = cfg[s] ?? cfg.other
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${c.cls} whitespace-nowrap`}>{c.label}</span>
    },
  },
  { id: 'ni_number', label: 'NI', sortField: 'ni_number', render: op => <span className="font-mono text-slate-400">{op.ni_number ?? '—'}</span> },
  { id: 'phone', label: 'Phone', sortField: 'phone', render: op => <span className="text-slate-400">{op.phone ?? '—'}</span> },
  { id: 'email', label: 'Email', sortField: 'email', render: op => <span className="text-slate-400 max-w-[160px] truncate block">{op.email ?? '—'}</span> },
  { id: 'last_worked_date', label: 'Last Worked', sortField: 'last_worked_date', render: op => <span className="text-slate-400">{op.last_worked_date ? new Date(op.last_worked_date).toLocaleDateString('en-GB') : '—'}</span> },
  { id: 'status', label: 'Status', sortField: 'status', render: op => (
    <div className="flex flex-col gap-1">
      {op.status ? <StatusBadge status={op.status} /> : '—'}
      {op.compliance_alert === 'expiring_soon' && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400 border border-amber-800 w-fit">Expiring</span>
      )}
      {op.compliance_alert === 'expired_document' && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-800 w-fit">Expired</span>
      )}
    </div>
  )},
  { id: 'trade', label: 'Trade', render: op => <span className="text-slate-400">{op.trade_category?.name ?? '—'}</span> },
  { id: 'grade', label: 'Grade', sortField: 'grade', render: op => <span className="text-slate-400">{op.grade ?? '—'}</span> },
  { id: 'rap', label: 'RAP', sortField: 'avg_rap_score', render: op => op.rap_traffic_light ? (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${op.rap_traffic_light === 'green' ? 'bg-emerald-500' : op.rap_traffic_light === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`} />
      <span className="text-slate-300 tabular-nums">{op.avg_rap_score?.toFixed(1) ?? '—'}</span>
    </span>
  ) : <span className="text-slate-600">—</span> },
  { id: 'jobs', label: 'Jobs', sortField: 'total_jobs', render: op => <span className="text-slate-400 tabular-nums">{op.total_jobs ?? 0}</span> },
  { id: 'charge_rate', label: 'Charge £', sortField: 'charge_rate', render: op => <span className="text-slate-400">{op.charge_rate != null ? `£${op.charge_rate}` : '—'}</span> },
  { id: 'hourly_rate', label: 'Hourly £', sortField: 'hourly_rate', render: op => <span className="text-slate-400">{op.hourly_rate != null ? `£${op.hourly_rate}` : '—'}</span> },
  { id: 'day_rate', label: 'Day £', sortField: 'day_rate', render: op => <span className="text-slate-400">{op.day_rate != null ? `£${op.day_rate}` : '—'}</span> },
  { id: 'agency', label: 'Agency', sortField: 'agency_name', render: op => <span className="text-slate-400">{op.agency_name ?? '—'}</span> },
  { id: 'start_date', label: 'Start Date', sortField: 'start_date', render: op => <span className="text-slate-400">{op.start_date ? new Date(op.start_date).toLocaleDateString('en-GB') : '—'}</span> },
  { id: 'cscs_type', label: 'CSCS', sortField: 'cscs_card_type', render: op => op.cscs_card_type ? (
    <span className="flex items-center gap-1">
      {CSCS_DOT_CLASS[op.cscs_card_type] && <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${CSCS_DOT_CLASS[op.cscs_card_type]}`} />}
      <span className="text-slate-400 capitalize">{op.cscs_card_type}</span>
    </span>
  ) : <span className="text-slate-600">—</span> },
  { id: 'cscs_expiry', label: 'CSCS Expiry', sortField: 'cscs_expiry', render: op => <span className="text-slate-400">{op.cscs_expiry ? new Date(op.cscs_expiry).toLocaleDateString('en-GB') : '—'}</span> },
  { id: 'date_of_birth', label: 'DOB', sortField: 'date_of_birth', defaultHidden: true, render: op => <span className="text-slate-400">{op.date_of_birth ? new Date(op.date_of_birth).toLocaleDateString('en-GB') : '—'}</span> },
  { id: 'postcode', label: 'Postcode', sortField: 'postcode', render: op => <span className="text-slate-400">{op.postcode ?? '—'}</span> },
  { id: 'city', label: 'Town', sortField: 'city', render: op => <span className="text-slate-400">{op.city ?? '—'}</span> },
  { id: 'county', label: 'Borough', sortField: 'county', render: op => <span className="text-slate-400">{op.county ?? '—'}</span> },
  { id: 'address', label: 'Address', defaultHidden: true, render: op => <span className="text-slate-400 max-w-[160px] truncate block">{[op.address_line2, op.address_line1].filter(Boolean).join(', ') || '—'}</span> },
  { id: 'nok_name', label: 'Emerg. Name', defaultHidden: true, render: op => <span className="text-slate-400 max-w-[120px] truncate block">{op.next_of_kin_name ?? '—'}</span> },
  { id: 'nok_phone', label: 'Emerg. Phone', defaultHidden: true, render: op => <span className="text-slate-400">{op.next_of_kin_phone ?? '—'}</span> },
  { id: 'sort_code', label: 'Sort Code', defaultHidden: true, render: op => <span className="font-mono text-slate-500">{op.bank_sort_code ? `${op.bank_sort_code.slice(0, 2)}–••••` : '—'}</span> },
  { id: 'account_number', label: 'Account No', defaultHidden: true, render: op => <span className="font-mono text-slate-500">{op.bank_account_number ? `••••${op.bank_account_number.slice(-3)}` : '—'}</span> },
  { id: 'utr', label: 'UTR', defaultHidden: true, render: op => <span className="font-mono text-slate-500">{op.utr_number ? `${op.utr_number.slice(0, 3)}•••••` : '—'}</span> },
  { id: 'cscs_number', label: 'CSCS No', defaultHidden: true, render: op => <span className="font-mono text-slate-400">{op.cscs_card_number ?? '—'}</span> },
  { id: 'cscs_title', label: 'CSCS Title', defaultHidden: true, render: op => <span className="text-slate-400 max-w-[120px] truncate block">{op.cscs_card_title ?? '—'}</span> },
  { id: 'notes', label: 'Notes', defaultHidden: true, render: op => <span className="text-slate-500 max-w-[160px] truncate block">{op.notes ?? '—'}</span> },
]

const DEFAULT_ORDER = COLUMN_DEFS.map(c => c.id)
const DEFAULT_HIDDEN = new Set(COLUMN_DEFS.filter(c => c.defaultHidden).map(c => c.id))
const STORAGE_KEY = 'operatives_table_layout_v2'
const DENSITY_KEY = 'operatives_table_density'

type Density = 'normal' | 'compact' | 'micro'

const DENSITY_CONFIG: Record<Density, { th: string; td: string; tdLocked: string; text: string }> = {
  normal:  { th: 'px-3 py-2.5', td: 'px-3 py-2',   tdLocked: 'px-3 py-2',   text: 'text-xs' },
  compact: { th: 'px-3 py-1.5', td: 'px-3 py-1',   tdLocked: 'px-3 py-1',   text: 'text-xs' },
  micro:   { th: 'px-2 py-1',   td: 'px-2 py-0.5', tdLocked: 'px-2 py-0.5', text: 'text-[10px]' },
}

// Sticky left offsets for locked columns
const STICKY: Record<string, string> = {
  ref: 'left-0',
  first_name: 'left-[72px]',
  last_name: 'left-[192px]',
}
// Explicit min-widths for locked columns — must match STICKY offsets
const LOCKED_MIN_W: Record<string, string> = {
  ref: 'min-w-[72px] w-[72px]',
  first_name: 'min-w-[120px] w-[120px]',
  last_name: 'min-w-[100px] w-[100px]',
}

function buildParams(current: SearchParams, overrides: Record<string, string | undefined>): string {
  const p = new URLSearchParams()
  const merged = { ...current, ...overrides }
  for (const [k, v] of Object.entries(merged)) {
    if (v) p.set(k, v)
  }
  return p.toString()
}

function SortIcon({ isActive, dir }: { isActive: boolean; dir?: string }) {
  return (
    <span className="inline-flex flex-col gap-px ml-0.5 shrink-0">
      <svg width="5" height="3" viewBox="0 0 5 3" fill="none" aria-hidden>
        <path d="M2.5 0L5 3H0L2.5 0Z" fill={isActive && dir === 'asc' ? '#34d399' : '#475569'} />
      </svg>
      <svg width="5" height="3" viewBox="0 0 5 3" fill="none" aria-hidden>
        <path d="M2.5 3L0 0H5L2.5 3Z" fill={isActive && dir === 'desc' ? '#34d399' : '#475569'} />
      </svg>
    </span>
  )
}

interface Props {
  rows: OperativeRow[]
  currentSort: string
  params: SearchParams
  toolbarLeft?: React.ReactNode
}

export function OperativesTable({ rows, currentSort, params, toolbarLeft }: Props) {
  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_ORDER)
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(DEFAULT_HIDDEN)
  const [panelOpen, setPanelOpen] = useState(false)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [density, setDensity] = useState<Density>('normal')
  const panelRef = useRef<HTMLDivElement>(null)

  // Load persisted density on mount
  useEffect(() => {
    try {
      const d = localStorage.getItem(DENSITY_KEY) as Density | null
      if (d && d in DENSITY_CONFIG) setDensity(d)
    } catch { /* ignore */ }
  }, [])

  // Load persisted layout on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as { order: string[]; hidden: string[] }
      const allIds = COLUMN_DEFS.map(c => c.id)
      const savedOrder = saved.order.filter(id => allIds.includes(id))
      const newCols = allIds.filter(id => !savedOrder.includes(id))
      setColumnOrder([...savedOrder, ...newCols])
      setHiddenCols(new Set(
        (saved.hidden as string[]).filter(id => {
          const col = COLUMN_DEFS.find(c => c.id === id)
          return col && !col.locked
        })
      ))
    } catch { /* ignore */ }
  }, [])

  // Close panel on outside click
  useEffect(() => {
    if (!panelOpen) return
    function onMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [panelOpen])

  function persist(order: string[], hidden: Set<string>) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, hidden: [...hidden] })) } catch { /* ignore */ }
  }

  function reorder(sourceId: string, targetId: string) {
    if (sourceId === targetId) return
    if (COLUMN_DEFS.find(c => c.id === sourceId)?.locked) return
    const next = [...columnOrder]
    const from = next.indexOf(sourceId)
    const to = next.indexOf(targetId)
    if (from === -1 || to === -1) return
    next.splice(from, 1)
    next.splice(to, 0, sourceId)
    setColumnOrder(next)
    persist(next, hiddenCols)
  }

  function toggleCol(id: string) {
    if (COLUMN_DEFS.find(c => c.id === id)?.locked) return
    const next = new Set(hiddenCols)
    next.has(id) ? next.delete(id) : next.add(id)
    setHiddenCols(next)
    persist(columnOrder, next)
  }

  function resetLayout() {
    setColumnOrder(DEFAULT_ORDER)
    setHiddenCols(DEFAULT_HIDDEN)
    persist(DEFAULT_ORDER, DEFAULT_HIDDEN)
  }

  // Drag handlers (used by both table headers and panel list)
  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(id)
  }
  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }
  function onDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    reorder(e.dataTransfer.getData('text/plain'), targetId)
    setDragOverId(null)
    setDraggingId(null)
  }
  function onDragEnd() {
    setDragOverId(null)
    setDraggingId(null)
  }

  const [activeField, activeDir] = currentSort.split(':')
  const orderedDefs = columnOrder.map(id => COLUMN_DEFS.find(c => c.id === id)!).filter(Boolean)
  const visibleDefs = orderedDefs.filter(c => !hiddenCols.has(c.id))
  const lockedDefs = visibleDefs.filter(c => c.locked)
  const moveableDefs = visibleDefs.filter(c => !c.locked)

  // Panel: locked pinned at top, moveable in current order
  const panelMoveable = columnOrder
    .map(id => COLUMN_DEFS.find(c => c.id === id)!)
    .filter(c => c && !c.locked)

  const visibleMoveableCount = panelMoveable.filter(c => !hiddenCols.has(c.id)).length
  const totalMoveable = panelMoveable.length

  function thSortLink(col: ColDef) {
    if (!col.sortField) return null
    const isActive = activeField === col.sortField
    const nextDir = isActive ? (activeDir === 'asc' ? 'desc' : 'asc') : 'asc'
    return `/operatives?${buildParams(params, { sort: `${col.sortField}:${nextDir}`, page: '1' })}`
  }

  return (
    <TooltipProvider delayDuration={0}>
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        {toolbarLeft && <div className="flex items-center gap-2 min-w-0 flex-1">{toolbarLeft}</div>}
        <div className="flex items-center gap-2">
          {/* Density toggle */}
          <div className="flex items-center rounded-md border border-slate-700 overflow-hidden">
            {([
              { key: 'normal',  icon: AlignJustify, title: 'Normal' },
              { key: 'compact', icon: List,          title: 'Compact' },
              { key: 'micro',   icon: Rows3,         title: 'Micro' },
            ] as const).map(({ key, icon: Icon, title }) => (
              <button
                key={key}
                title={title}
                onClick={() => { setDensity(key); try { localStorage.setItem(DENSITY_KEY, key) } catch { /* ignore */ } }}
                className={`px-2 py-1.5 transition-colors ${density === key ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
              >
                <Icon className="h-3 w-3" />
              </button>
            ))}
          </div>

        <div className="relative" ref={panelRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPanelOpen(v => !v)}
            className={`border-slate-700 text-slate-300 hover:bg-slate-800 h-7 px-2.5 text-xs gap-1.5 ${panelOpen ? 'bg-slate-800' : ''}`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Columns
            <span className="text-slate-500 text-[10px]">{visibleMoveableCount}/{totalMoveable}</span>
          </Button>

          {panelOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                <span className="text-xs font-medium text-slate-200">Arrange columns</span>
                <button
                  onClick={resetLayout}
                  className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Reset
                </button>
              </div>

              <div className="overflow-y-auto max-h-[400px] py-1">
                {/* Pinned locked columns */}
                <div className="px-3 pt-1 pb-0.5">
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider">Pinned</span>
                </div>
                {COLUMN_DEFS.filter(c => c.locked).map(col => (
                  <div key={col.id} className="flex items-center gap-2 px-3 py-1.5 opacity-40 select-none">
                    <Lock className="h-3 w-3 text-slate-600 shrink-0" />
                    <span className="text-xs text-slate-400">{col.label}</span>
                  </div>
                ))}

                {/* Draggable columns */}
                <div className="px-3 pt-2 pb-0.5">
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider">Columns — drag to reorder</span>
                </div>
                {panelMoveable.map(col => (
                  <div
                    key={col.id}
                    draggable
                    onDragStart={e => onDragStart(e, col.id)}
                    onDragOver={e => onDragOver(e, col.id)}
                    onDrop={e => onDrop(e, col.id)}
                    onDragEnd={onDragEnd}
                    className={`flex items-center gap-2 px-3 py-1.5 select-none transition-colors cursor-grab active:cursor-grabbing
                      ${draggingId === col.id ? 'opacity-40' : ''}
                      ${dragOverId === col.id && draggingId !== col.id ? 'border-t border-emerald-500' : 'border-t border-transparent'}
                      hover:bg-slate-800/50`}
                  >
                    <input
                      type="checkbox"
                      checked={!hiddenCols.has(col.id)}
                      onChange={() => toggleCol(col.id)}
                      onClick={e => e.stopPropagation()}
                      className="w-3 h-3 rounded-sm accent-emerald-500 cursor-pointer shrink-0"
                    />
                    <GripVertical className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                    <span className="text-xs text-slate-300 truncate">{col.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-800 overflow-x-auto">
        <table className={`${DENSITY_CONFIG[density].text} whitespace-nowrap`}>
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80">
              {/* Sticky locked headers */}
              {lockedDefs.map(col => {
                const href = thSortLink(col)
                const isActive = activeField === col.sortField
                return (
                  <th
                    key={col.id}
                    className={`text-left ${DENSITY_CONFIG[density].th} ${LOCKED_MIN_W[col.id] ?? ''} font-medium sticky ${STICKY[col.id] ?? ''} z-10 transition-colors ${isActive ? 'bg-emerald-950/40 border-b-2 border-emerald-500' : 'bg-slate-900/95'}`}
                  >
                    {href ? (
                      <Link href={href} className={`flex items-center gap-0.5 transition-colors hover:text-slate-200 ${isActive ? 'text-slate-200' : 'text-slate-400'}`}>
                        {col.label}
                        <SortIcon isActive={isActive} dir={isActive ? activeDir : undefined} />
                      </Link>
                    ) : (
                      <span className="text-slate-400">{col.label}</span>
                    )}
                  </th>
                )
              })}

              {/* Draggable/sortable headers */}
              {moveableDefs.map(col => {
                const href = thSortLink(col)
                const isActive = activeField === col.sortField
                const isOver = dragOverId === col.id && draggingId !== col.id
                return (
                  <th
                    key={col.id}
                    draggable
                    onDragStart={e => onDragStart(e, col.id)}
                    onDragOver={e => onDragOver(e, col.id)}
                    onDrop={e => onDrop(e, col.id)}
                    onDragEnd={onDragEnd}
                    className={`text-left ${DENSITY_CONFIG[density].th} font-medium cursor-grab active:cursor-grabbing transition-colors
                      ${draggingId === col.id ? 'opacity-40' : ''}
                      ${isOver ? 'border-l-2 border-emerald-500 bg-slate-800/40' : 'border-l-2 border-transparent'}
                      ${isActive ? 'bg-emerald-950/40 border-b-2 border-emerald-500' : ''}`}
                  >
                    {href ? (
                      <Link href={href} className={`flex items-center gap-0.5 transition-colors hover:text-slate-200 ${isActive ? 'text-slate-200' : 'text-slate-400'}`}>
                        {col.label}
                        <SortIcon isActive={isActive} dir={isActive ? activeDir : undefined} />
                      </Link>
                    ) : (
                      <span className="text-slate-400 flex items-center">{col.label}</span>
                    )}
                  </th>
                )
              })}

              <th className={DENSITY_CONFIG[density].th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map(op => (
              <tr key={op.id} className="hover:bg-slate-900/50 transition-colors">
                {lockedDefs.map(col => {
                  const isActive = !!(col.sortField && col.sortField === activeField)
                  return (
                    <td key={col.id} className={`${DENSITY_CONFIG[density].tdLocked} ${LOCKED_MIN_W[col.id] ?? ''} sticky ${STICKY[col.id] ?? ''} z-10 transition-colors ${isActive ? 'bg-emerald-950/20' : 'bg-slate-950'}`}>
                      {col.render(op)}
                    </td>
                  )
                })}
                {moveableDefs.map(col => {
                  const isActive = !!(col.sortField && col.sortField === activeField)
                  return (
                    <td key={col.id} className={`${DENSITY_CONFIG[density].td} transition-colors ${isActive ? 'bg-emerald-950/20' : ''}`}>
                      {col.render(op)}
                    </td>
                  )
                })}
                <td className={DENSITY_CONFIG[density].td}>
                  <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 h-6 px-2 text-[10px]">
                    <Link href={`/operatives/${op.id}`}>View</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </TooltipProvider>
  )
}
