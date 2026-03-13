'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload, AlertTriangle, CheckCircle2, XCircle, FileText,
  ChevronRight, RotateCcw, Users, ShieldAlert, Info,
  ChevronDown, Phone, Mail, PhoneOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ParsedRow } from '@/lib/import/operative-importer'
import { SENSITIVE_FIELDS } from '@/lib/import/operative-importer'

type Step = 'upload' | 'preview' | 'importing' | 'done'
type PreviewTab = 'all' | 'warnings' | 'skipped' | 'uncontactable'

interface Summary {
  total: number
  valid: number
  withWarnings: number
  withErrors: number
  duplicates: number
  unmappedHeaders: string[]
}

interface ImportResult {
  created: number
  skipped: number
  failed: number
  errors: Array<{ row: number; error: string }>
}

const FIELD_LABELS: Record<string, string> = {
  first_name: 'First Name', last_name: 'Last Name', phone: 'Phone',
  email: 'Email', trade_category_id: 'Trade', day_rate: 'Day Rate',
  postcode: 'Postcode', ni_number: 'NI', date_of_birth: 'DOB',
  grade: 'Grade', cscs_card_type: 'CSCS', address_line1: 'Address',
  city: 'Town', notes: 'Notes',
}

const PREVIEW_COLUMNS = [
  'first_name', 'last_name', 'phone', 'email',
  'trade_category_id', 'day_rate', 'postcode', 'cscs_card_type', 'grade',
]

function ContactBadge({ row }: { row: ParsedRow }) {
  const hasPhone = !!row.data['phone']
  const hasEmail = !!row.data['email']
  if (hasPhone) return (
    <span className="flex items-center gap-1 text-forest-400 text-xs" title="Has phone">
      <Phone className="h-3 w-3" />
    </span>
  )
  if (hasEmail) return (
    <span className="flex items-center gap-1 text-amber-400 text-xs" title="Email only — no phone">
      <Mail className="h-3 w-3" />
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-red-400 text-xs" title="No phone or email">
      <PhoneOff className="h-3 w-3" />
    </span>
  )
}

function RowDetail({ row }: { row: ParsedRow }) {
  const [open, setOpen] = useState(false)
  const hasIssues = row.errors.length > 0 || row.warnings.length > 0 || row.isDuplicate

  const rowBg = row.errors.length > 0 || row.isDuplicate
    ? 'bg-red-950/20 hover:bg-red-950/30'
    : row.warnings.length > 0
      ? 'bg-amber-950/10 hover:bg-amber-950/20'
      : 'hover:bg-background/40'

  return (
    <>
      <tr
        className={`${rowBg} transition-colors ${hasIssues ? 'cursor-pointer' : ''}`}
        onClick={() => hasIssues && setOpen(v => !v)}
      >
        <td className="px-3 py-2 text-muted-foreground text-xs">{row.rowIndex}</td>
        <td className="px-3 py-2"><ContactBadge row={row} /></td>
        {PREVIEW_COLUMNS.map(col => (
          <td key={col} className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap max-w-[100px] truncate">
            {row.data[col] != null ? String(row.data[col]) : <span className="text-muted-foreground">—</span>}
          </td>
        ))}
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            {row.isDuplicate ? (
              <span className="text-red-400 text-xs flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Duplicate
              </span>
            ) : row.errors.length > 0 ? (
              <span className="text-red-400 text-xs flex items-center gap-1">
                <XCircle className="h-3 w-3" /> {row.errors.length} error{row.errors.length !== 1 ? 's' : ''}
              </span>
            ) : row.warnings.length > 0 ? (
              <span className="text-amber-400 text-xs flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {row.warnings.length} warning{row.warnings.length !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-forest-400 text-xs flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> OK
              </span>
            )}
            {hasIssues && (
              <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            )}
          </div>
        </td>
      </tr>
      {open && hasIssues && (
        <tr className={row.errors.length > 0 || row.isDuplicate ? 'bg-red-950/30' : 'bg-amber-950/20'}>
          <td colSpan={PREVIEW_COLUMNS.length + 3} className="px-3 pb-2 pt-0">
            <div className="pl-6 space-y-1">
              {row.isDuplicate && (
                <p className="text-xs text-red-400">✗ Duplicate: this phone number or NI already exists in the system — row will be skipped</p>
              )}
              {row.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-400">✗ {e}</p>
              ))}
              {row.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-300">⚠ {w}</p>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function PreviewTable({ rows, emptyMessage }: { rows: ParsedRow[]; emptyMessage: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">{emptyMessage}</p>
  }
  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-background/80">
            <th className="text-left px-3 py-2 text-muted-foreground font-medium w-10">#</th>
            <th className="px-3 py-2 text-muted-foreground font-medium w-8" title="Contact method">📞</th>
            {PREVIEW_COLUMNS.map(col => (
              <th key={col} className="text-left px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">
                {FIELD_LABELS[col] ?? col}
                {SENSITIVE_FIELDS.has(col) && <span className="ml-1 text-amber-600 text-[10px]">*</span>}
              </th>
            ))}
            <th className="text-left px-3 py-2 text-muted-foreground font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map(row => <RowDetail key={row.rowIndex} row={row} />)}
        </tbody>
      </table>
    </div>
  )
}

export function ImportWizard() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<PreviewTab>('all')

  const [summary, setSummary] = useState<Summary | null>(null)
  const [allRows, setAllRows] = useState<ParsedRow[]>([])
  const [filename, setFilename] = useState('')

  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showAllErrors, setShowAllErrors] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setParseError('Only CSV files are supported. Export your spreadsheet as CSV first.')
      return
    }
    setSelectedFile(file)
    setParseError(null)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleParse = async () => {
    if (!selectedFile) return
    setParsing(true)
    setParseError(null)
    const fd = new FormData()
    fd.append('file', selectedFile)
    try {
      const res = await fetch('/api/operatives/import/parse', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setParseError(json.error ?? 'Failed to parse file'); setParsing(false); return }
      setSummary(json.summary)
      setAllRows(json.rows)
      setFilename(json.filename)
      setStep('preview')
    } catch { setParseError('Network error — please try again') }
    finally { setParsing(false) }
  }

  const handleImport = async () => {
    setStep('importing')
    const CHUNK = 200
    const importableRows = allRows.filter(r => r.errors.length === 0 && !r.isDuplicate)
    const chunks: typeof importableRows[] = []
    for (let i = 0; i < importableRows.length; i += CHUNK) chunks.push(importableRows.slice(i, i + CHUNK))

    let totalCreated = 0, totalSkipped = 0, totalFailed = 0
    const allErrors: { row: number; error: string }[] = []

    setImportProgress({ done: 0, total: chunks.length })

    try {
      for (let i = 0; i < chunks.length; i++) {
        const isFinalChunk = i === chunks.length - 1
        const res = await fetch('/api/operatives/import/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: chunks[i],
            filename,
            isChunk: true,
            isFinalChunk,
            // Pass running totals from previous chunks so server can add its own chunk's counts
            prevTotalCreated: isFinalChunk ? totalCreated : undefined,
            prevTotalSkipped: isFinalChunk ? totalSkipped : undefined,
            prevTotalFailed:  isFinalChunk ? totalFailed  : undefined,
          }),
        })
        const json = await res.json()
        if (!res.ok) { setParseError(json.error ?? 'Import failed'); setStep('preview'); return }
        totalCreated += json.created ?? 0
        totalSkipped += json.skipped ?? 0
        totalFailed += json.failed ?? 0
        allErrors.push(...(json.errors ?? []))
        setImportProgress({ done: i + 1, total: chunks.length })
      }
      setImportResult({ created: totalCreated, skipped: totalSkipped, failed: totalFailed, errors: allErrors })
      setStep('done')
    } catch { setParseError('Network error during import — please try again'); setStep('preview') }
  }

  const reset = () => {
    setStep('upload'); setSelectedFile(null); setSummary(null)
    setAllRows([]); setParseError(null); setImportResult(null)
    setActiveTab('all')
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Done ────────────────────────────────────────────────────────────────────
  if (step === 'done' && importResult) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-lg border border-forest-800 bg-forest-950/30 p-6 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-forest-400 mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Import Complete</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-forest-900/30 border border-forest-800 p-4">
              <div className="text-3xl font-bold text-forest-400">{importResult.created}</div>
              <div className="text-xs text-forest-300 mt-1">Created</div>
            </div>
            <div className="rounded-lg bg-card border border-border p-4">
              <div className="text-3xl font-bold text-muted-foreground">{importResult.skipped}</div>
              <div className="text-xs text-muted-foreground mt-1">Skipped</div>
            </div>
            <div className={`rounded-lg border p-4 ${importResult.failed > 0 ? 'bg-red-950/30 border-red-800' : 'bg-card border-border'}`}>
              <div className={`text-3xl font-bold ${importResult.failed > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>{importResult.failed}</div>
              <div className={`text-xs mt-1 ${importResult.failed > 0 ? 'text-red-300' : 'text-muted-foreground'}`}>Failed</div>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <div className="text-left space-y-1">
              <button onClick={() => setShowAllErrors(v => !v)} className="text-xs text-amber-400 hover:text-amber-300">
                {showAllErrors ? 'Hide' : 'Show'} row errors ({importResult.errors.length})
              </button>
              {showAllErrors && (
                <div className="bg-background rounded p-3 text-xs space-y-1 max-h-48 overflow-y-auto">
                  {importResult.errors.map((e, i) => (
                    <div key={i} className="text-red-400">Row {e.row}: {e.error}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.push('/operatives')} className="flex-1 bg-forest-600 hover:bg-forest-700 text-white">
            <Users className="h-4 w-4 mr-2" /> View Operatives
          </Button>
          <Button variant="outline" onClick={reset} className="border-border text-muted-foreground hover:bg-card">
            <RotateCcw className="h-4 w-4 mr-2" /> Import Another File
          </Button>
        </div>
      </div>
    )
  }

  // ── Importing ───────────────────────────────────────────────────────────────
  if (step === 'importing') {
    const pct = importProgress ? Math.round((importProgress.done / importProgress.total) * 100) : 0
    return (
      <div className="max-w-2xl mx-auto text-center space-y-4 py-16">
        <div className="h-12 w-12 rounded-full border-2 border-forest-500 border-t-transparent animate-spin mx-auto" />
        <p className="text-muted-foreground text-lg">Importing operatives…</p>
        {importProgress && (
          <>
            <div className="w-full bg-card rounded-full h-2">
              <div className="bg-forest-500 h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-muted-foreground text-sm">Batch {importProgress.done} of {importProgress.total} — {pct}%</p>
          </>
        )}
      </div>
    )
  }

  // ── Preview ─────────────────────────────────────────────────────────────────
  if (step === 'preview' && summary) {
    const importableCount = summary.total - summary.withErrors - summary.duplicates
    const skippedRows = allRows.filter(r => r.errors.length > 0 || r.isDuplicate)
    const warningRows = allRows.filter(r => r.warnings.length > 0 && r.errors.length === 0 && !r.isDuplicate)
    const uncontactableRows = allRows.filter(r =>
      !r.data['phone'] && !r.data['email'] && r.errors.length === 0 && !r.isDuplicate
    )
    const hasSensitive = allRows.some(r =>
      Object.keys(r.data).some(k => SENSITIVE_FIELDS.has(k) && r.data[k] != null)
    )

    const tabs: { id: PreviewTab; label: string; count: number; colour: string }[] = [
      { id: 'all', label: 'All Rows', count: summary.total, colour: 'text-muted-foreground' },
      { id: 'warnings', label: 'Warnings', count: warningRows.length, colour: 'text-amber-400' },
      { id: 'skipped', label: 'Skipped', count: skippedRows.length, colour: 'text-red-400' },
      { id: 'uncontactable', label: 'No Contact Details', count: uncontactableRows.length, colour: 'text-orange-400' },
    ]

    const tabRows: Record<PreviewTab, ParsedRow[]> = {
      all: allRows,
      warnings: warningRows,
      skipped: skippedRows,
      uncontactable: uncontactableRows,
    }

    return (
      <div className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg bg-background border border-border p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{summary.total}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Rows</div>
          </div>
          <div className="rounded-lg bg-forest-950/40 border border-forest-800 p-4 text-center">
            <div className="text-2xl font-bold text-forest-400">{importableCount}</div>
            <div className="text-xs text-forest-300 mt-1">Will Be Imported</div>
            <div className="text-[10px] text-forest-600 mt-0.5">incl. {warningRows.length} with warnings</div>
          </div>
          <div className="rounded-lg bg-amber-950/40 border border-amber-800 p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{warningRows.length}</div>
            <div className="text-xs text-amber-300 mt-1">With Warnings</div>
            <div className="text-[10px] text-amber-600 mt-0.5">click row to see detail</div>
          </div>
          <div className="rounded-lg bg-red-950/40 border border-red-800 p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{skippedRows.length}</div>
            <div className="text-xs text-red-300 mt-1">Skipped</div>
            <div className="text-[10px] text-red-600 mt-0.5">errors or duplicates</div>
          </div>
        </div>

        {/* Action bar — top */}
        <div className="flex gap-3">
          <Button
            onClick={handleImport}
            disabled={importableCount === 0}
            className="bg-forest-600 hover:bg-forest-700 text-white disabled:opacity-50"
          >
            Import {importableCount} Operative{importableCount !== 1 ? 's' : ''}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button variant="outline" onClick={reset} className="border-border text-muted-foreground hover:bg-card">
            <RotateCcw className="h-4 w-4 mr-2" /> Choose Different File
          </Button>
        </div>

        {/* Notices */}
        <div className="space-y-2">
          {hasSensitive && (
            <div className="flex gap-2 items-start rounded-lg border border-amber-800 bg-amber-950/30 p-3">
              <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                File contains <strong>sensitive personal data</strong> (NI, DOB, bank details, UTR).
                Ensure you have UK GDPR legal basis before proceeding. All imports are logged.
              </p>
            </div>
          )}
          {uncontactableRows.length > 0 && (
            <div className="flex gap-2 items-start rounded-lg border border-orange-800 bg-orange-950/20 p-3">
              <PhoneOff className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-300">
                <strong>{uncontactableRows.length} operatives</strong> have no phone number or email address.
                They will be imported but cannot be contacted. See the &quot;No Contact Details&quot; tab.
              </p>
            </div>
          )}
          {summary.unmappedHeaders.length > 0 && (
            <div className="flex gap-2 items-start rounded-lg border border-border bg-background p-3">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Unrecognised columns (skipped):{' '}
                <span className="text-muted-foreground">{summary.unmappedHeaders.join(', ')}</span>
              </p>
            </div>
          )}
        </div>

        {/* Column mapping summary */}
        <details className="rounded-lg border border-border bg-background/30">
          <summary className="px-4 py-2.5 text-xs text-muted-foreground cursor-pointer hover:text-muted-foreground select-none">
            Mapped columns — what&apos;s being imported from your spreadsheet
            <span className="ml-2 text-forest-500">(click to expand)</span>
          </summary>
          <div className="px-4 pb-3 pt-1 grid grid-cols-2 md:grid-cols-3 gap-1.5 text-xs">
            {[
              ['NI', 'NI Number'], ['Surname', 'Last Name'], ['First name(s)', 'First Name'],
              ['Contact Tel No', 'Phone (normalised to +44)'], ['E-mail', 'Email'],
              ['Last Worked', 'Last Worked Date'], ['Grade', 'Grade'],
              ['Rate', 'Day Rate (£)'], ['Date of Birth', 'Date of Birth'],
              ['Flat No.', 'Address Line 2'], ['House No. & Street name', 'Address Line 1'],
              ['Borough/locality', 'County'], ['Town', 'City'], ['Postcode', 'Postcode'],
              ['Emergency contact Name', 'Next of Kin Name'], ['Emergency contact Phone No.', 'Next of Kin Phone'],
              ['Bank Sort Code', 'Bank Sort Code ⚠'], ['Bank Acc No', 'Bank Account No ⚠'],
              ['UTR Tax Reference No', 'UTR Number ⚠'], ['Title On Cscs Card', 'CSCS Card Title'],
              ['Colour Of Cscs Card', 'CSCS Card Type'], ['Cscs Card No', 'CSCS Card Number'],
              ['Cscs Expiry Date', 'CSCS Expiry'], ['Description On Back Of Cscs Card', 'CSCS Description'],
              ['Type of work to be undertaken', 'Trade (fuzzy matched)'],
              ['Hourly Rate:', 'Hourly Rate'], ['Agency name', 'Agency'],
              ['Start Date', 'Start Date'], ['Notes', 'Notes'],
            ].map(([from, to]) => (
              <div key={from} className="flex gap-1 items-start">
                <CheckCircle2 className="h-3 w-3 text-forest-600 shrink-0 mt-0.5" />
                <span><span className="text-muted-foreground">{from}</span><span className="text-muted-foreground mx-1">→</span><span className="text-muted-foreground">{to}</span></span>
              </div>
            ))}
            <div className="flex gap-1 items-start col-span-full mt-1">
              <span className="text-muted-foreground text-[10px]">⚠ = sensitive / financial field</span>
            </div>
          </div>
        </details>

        {/* Contact method legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-forest-400" /> Has phone</span>
          <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-amber-400" /> Email only</span>
          <span className="flex items-center gap-1"><PhoneOff className="h-3 w-3 text-red-400" /> No contact details</span>
          <span className="text-muted-foreground">· Click any row with warnings/errors to expand detail</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? `border-forest-500 ${t.colour}`
                  : 'border-transparent text-muted-foreground hover:text-muted-foreground'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  activeTab === t.id ? 'bg-card' : 'bg-background'
                } ${t.colour}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table for active tab */}
        <PreviewTable
          rows={tabRows[activeTab]}
          emptyMessage={
            activeTab === 'warnings' ? 'No warnings — all rows are clean.' :
            activeTab === 'skipped' ? 'No rows skipped — all rows will be imported.' :
            activeTab === 'uncontactable' ? 'All operatives have at least one contact method.' :
            'No rows found.'
          }
        />

        {parseError && <p className="text-sm text-red-400">{parseError}</p>}

        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleImport}
            disabled={importableCount === 0}
            className="bg-forest-600 hover:bg-forest-700 text-white disabled:opacity-50"
          >
            Import {importableCount} Operative{importableCount !== 1 ? 's' : ''}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button variant="outline" onClick={reset} className="border-border text-muted-foreground hover:bg-card">
            <RotateCcw className="h-4 w-4 mr-2" /> Choose Different File
          </Button>
        </div>
      </div>
    )
  }

  // ── Upload ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-lg border border-border bg-background/50 p-4 space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" /> Before you upload
        </h3>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Export your spreadsheet as <strong className="text-muted-foreground">CSV</strong></li>
          <li>All standard headers are auto-detected — no renaming needed</li>
          <li>Up to <strong className="text-muted-foreground">5,000 rows</strong> per upload</li>
          <li>Duplicates (matched by phone or NI) are skipped automatically</li>
          <li>All operatives created with status <strong className="text-muted-foreground">Prospect</strong></li>
        </ul>
      </div>
      <div className="rounded-lg border border-amber-800 bg-amber-950/20 p-3 flex gap-2 items-start">
        <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300">
          You are uploading <strong>personal data</strong>. Ensure Pangaea has a valid legal basis
          under UK GDPR. All imports are logged with your name and timestamp.
        </p>
      </div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative rounded-lg border-2 border-dashed cursor-pointer transition-colors p-12 text-center ${
          dragging ? 'border-forest-500 bg-forest-950/20'
          : selectedFile ? 'border-forest-700 bg-forest-950/10'
          : 'border-border hover:border-border bg-background/30'
        }`}
      >
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {selectedFile ? (
          <div className="space-y-2">
            <FileText className="h-10 w-10 text-forest-400 mx-auto" />
            <p className="text-muted-foreground font-medium">{selectedFile.name}</p>
            <p className="text-muted-foreground text-xs">{(selectedFile.size / 1024).toFixed(1)} KB — click to change</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground font-medium">Drop your CSV file here</p>
            <p className="text-muted-foreground text-sm">or click to browse</p>
          </div>
        )}
      </div>
      {parseError && <p className="text-sm text-red-400 flex items-center gap-2"><XCircle className="h-4 w-4" />{parseError}</p>}
      <Button onClick={handleParse} disabled={!selectedFile || parsing}
        className="bg-forest-600 hover:bg-forest-700 text-white disabled:opacity-50 w-full">
        {parsing ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Analysing file…
          </span>
        ) : (
          <span className="flex items-center gap-2"><Upload className="h-4 w-4" />Analyse & Preview</span>
        )}
      </Button>
    </div>
  )
}
