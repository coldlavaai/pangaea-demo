'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Pencil, Plus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'

export type OperativeCard = {
  id: string
  card_scheme: string
  card_number: string | null
  card_type: string | null
  categories: string | null
  expiry_date: string | null
  scheme_name: string | null
}

interface OperativeCardsSectionProps {
  operativeId: string
  cards: OperativeCard[]
}

const SCHEMES = [
  {
    value: 'cpcs',
    label: 'CPCS',
    description: 'Plant Operators',
    types: ['Red (Trained)', 'Blue (Competent)'],
  },
  {
    value: 'pal_ipaf',
    label: 'PAL / IPAF',
    description: 'Powered Access',
    types: [],
  },
  {
    value: 'cisrs',
    label: 'CISRS',
    description: 'Scaffolding',
    types: ['Operative', 'Advanced Scaffolder', 'Supervisor'],
  },
  {
    value: 'nrswa',
    label: 'NRSWA',
    description: 'Highway Works',
    types: [],
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other scheme',
    types: [],
    hasSchemeName: true,
  },
] as const

function fmtDate(d: string | null) {
  if (!d) return '—'
  return format(parseISO(d), 'd MMM yyyy')
}

function MiniDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseISO(value) : undefined
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-card px-3 py-1 text-sm text-foreground"
        >
          <span className={selected ? '' : 'text-muted-foreground'}>
            {selected ? format(selected, 'dd/MM/yyyy') : 'Expiry date'}
          </span>
          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
        <div className="dark">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected}
            startMonth={new Date(new Date().getFullYear(), 0)}
            endMonth={new Date(new Date().getFullYear() + 15, 11)}
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

function CardSlot({
  scheme,
  existing,
  operativeId,
}: {
  scheme: (typeof SCHEMES)[number]
  existing: OperativeCard | undefined
  operativeId: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [cardNumber, setCardNumber] = useState(existing?.card_number ?? '')
  const [cardType, setCardType] = useState(existing?.card_type ?? '')
  const [categories, setCategories] = useState(existing?.categories ?? '')
  const [expiryDate, setExpiryDate] = useState(existing?.expiry_date ?? '')
  const [schemeName, setSchemeName] = useState(existing?.scheme_name ?? '')

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    const payload = {
      operative_id: operativeId,
      organization_id: orgId,
      card_scheme: scheme.value,
      card_number: cardNumber || null,
      card_type: cardType || null,
      categories: categories || null,
      expiry_date: expiryDate || null,
      scheme_name: 'hasSchemeName' in scheme ? schemeName || null : null,
    }

    const { error: err } = await supabase
      .from('operative_cards')
      .upsert(payload, { onConflict: 'operative_id,card_scheme' })

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    setEditing(false)
    router.refresh()
    setSaving(false)
  }

  const hasData = existing?.card_number || existing?.expiry_date

  return (
    <div className="rounded-md border border-border bg-background/40 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-muted-foreground">{scheme.label}</span>
          <span className="ml-2 text-xs text-muted-foreground">{scheme.description}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-muted-foreground hover:text-muted-foreground"
          onClick={() => setEditing((e) => !e)}
        >
          {hasData ? (
            <><Pencil className="h-3.5 w-3.5 mr-1" />Edit</>
          ) : (
            <><Plus className="h-3.5 w-3.5 mr-1" />Add</>
          )}
        </Button>
      </div>

      {!editing && hasData && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {existing?.card_number && (
            <>
              <span className="text-xs text-muted-foreground">Card No.</span>
              <span className="text-xs font-mono text-muted-foreground">{existing.card_number}</span>
            </>
          )}
          {existing?.card_type && (
            <>
              <span className="text-xs text-muted-foreground">Type</span>
              <span className="text-xs text-muted-foreground">{existing.card_type}</span>
            </>
          )}
          {existing?.categories && (
            <>
              <span className="text-xs text-muted-foreground">Categories</span>
              <span className="text-xs text-muted-foreground">{existing.categories}</span>
            </>
          )}
          {existing?.expiry_date && (
            <>
              <span className="text-xs text-muted-foreground">Expiry</span>
              <span className="text-xs text-muted-foreground">{fmtDate(existing.expiry_date)}</span>
            </>
          )}
          {'hasSchemeName' in scheme && existing?.scheme_name && (
            <>
              <span className="text-xs text-muted-foreground">Scheme</span>
              <span className="text-xs text-muted-foreground">{existing.scheme_name}</span>
            </>
          )}
        </div>
      )}

      {!editing && !hasData && (
        <p className="text-xs text-muted-foreground italic">Not recorded</p>
      )}

      {editing && (
        <div className="space-y-2 pt-1">
          {error && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-2 py-1">{error}</p>
          )}

          {'hasSchemeName' in scheme && (
            <div>
              <Label className="text-xs text-muted-foreground">Scheme Name</Label>
              <Input
                value={schemeName}
                onChange={(e) => setSchemeName(e.target.value)}
                placeholder="e.g. NPORS, PASMA, IPAF"
                className="mt-1 h-8 text-xs bg-card border-border text-foreground"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Card Number</Label>
              <Input
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="mt-1 h-8 text-xs font-mono bg-card border-border text-foreground"
              />
            </div>
            {scheme.types.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Card Type</Label>
                <select
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value)}
                  className="mt-1 h-8 w-full rounded-md border border-border bg-card px-2 text-xs text-foreground"
                >
                  <option value="">Select type</option>
                  {scheme.types.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Main Categories on Card</Label>
            <Input
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="e.g. 360° Excavator, Forward Tipping Dumper"
              className="mt-1 h-8 text-xs bg-card border-border text-foreground"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Expiry Date</Label>
            <div className="mt-1">
              <MiniDatePicker value={expiryDate} onChange={setExpiryDate} />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-7 text-xs bg-forest-600 hover:bg-forest-700 text-white" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function OperativeCardsSection({ operativeId, cards }: OperativeCardsSectionProps) {
  return (
    <div className="space-y-2">
      {SCHEMES.map((scheme) => {
        const existing = cards.find((c) => c.card_scheme === scheme.value)
        return (
          <CardSlot
            key={scheme.value}
            scheme={scheme}
            existing={existing}
            operativeId={operativeId}
          />
        )
      })}
    </div>
  )
}
