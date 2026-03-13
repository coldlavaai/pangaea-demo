'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2, Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'

interface TradeCategory {
  id: string
  name: string
  labour_type: string
  typical_day_rate: number | null
  job_description: string | null
  is_active: boolean | null
  sort_order: number | null
}

interface TradeCategoriesPanelProps {
  orgId: string
  categories: TradeCategory[]
}

const AZTEC_TRADES = [
  { name: 'General Operative', labour_type: 'blue_collar' },
  { name: 'CPCS Plant Operator', labour_type: 'blue_collar' },
  { name: 'Groundworker', labour_type: 'blue_collar' },
  { name: 'Labourer', labour_type: 'blue_collar' },
  { name: 'Scaffolder', labour_type: 'blue_collar' },
  { name: 'Steel Fixer', labour_type: 'blue_collar' },
  { name: 'Bricklayer', labour_type: 'blue_collar' },
  { name: 'Carpenter / Joiner', labour_type: 'blue_collar' },
  { name: 'Electrician', labour_type: 'blue_collar' },
  { name: 'Plumber', labour_type: 'blue_collar' },
  { name: 'Painter / Decorator', labour_type: 'blue_collar' },
  { name: 'Highway Operative (NRSWA)', labour_type: 'blue_collar' },
  { name: 'Site Manager', labour_type: 'white_collar' },
  { name: 'Quantity Surveyor', labour_type: 'white_collar' },
  { name: 'Project Manager', labour_type: 'white_collar' },
]

function EditRow({
  cat,
  onDone,
}: {
  cat: TradeCategory
  onDone: (updated: TradeCategory) => void
}) {
  const supabase = createClient()
  const [name, setName] = useState(cat.name)
  const [rate, setRate] = useState(cat.typical_day_rate != null ? String(cat.typical_day_rate) : '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const updated: TradeCategory = {
      ...cat,
      name,
      typical_day_rate: rate ? parseFloat(rate) : null,
    }
    const { error } = await supabase
      .from('trade_categories')
      .update({ name, typical_day_rate: rate ? parseFloat(rate) : null })
      .eq('id', cat.id)

    if (error) {
      toast.error('Failed to save trade')
      setSaving(false)
      return
    }
    toast.success('Trade updated')
    onDone(updated)
  }

  return (
    <tr className="border-b border-slate-800 bg-slate-900/60">
      <td className="px-4 py-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-7 text-xs bg-slate-800 border-slate-700 text-slate-100"
          autoFocus
        />
      </td>
      <td className="px-4 py-2 text-xs text-slate-400 capitalize">
        {cat.labour_type.replace('_', ' ')}
      </td>
      <td className="px-4 py-2">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="—"
          className="h-7 text-xs bg-slate-800 border-slate-700 text-slate-100 w-24"
        />
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex gap-1 justify-end">
          <Button
            size="sm"
            className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={save}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => onDone(cat)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

export function TradeCategoriesPanel({ orgId, categories: initialCategories }: TradeCategoriesPanelProps) {
  const supabase = createClient()
  const [categories, setCategories] = useState(initialCategories)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLabourType, setNewLabourType] = useState('blue_collar')
  const [newRate, setNewRate] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  const fieldClass =
    'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-500'

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      setAddError('Name required')
      return
    }
    setAdding(true)
    setAddError(null)

    const { data, error } = await supabase
      .from('trade_categories')
      .insert([
        {
          organization_id: orgId,
          name: newName.trim(),
          labour_type: newLabourType as 'blue_collar' | 'white_collar',
          typical_day_rate: newRate ? parseFloat(newRate) : null,
          is_active: true,
          sort_order: categories.length + 1,
        },
      ])
      .select()
      .single()

    setAdding(false)

    if (error) {
      setAddError(error.message)
      return
    }

    setCategories((prev) => [...prev, data as TradeCategory])
    setNewName('')
    setNewRate('')
    setShowAdd(false)
    toast.success(`${newName.trim()} added`)
  }

  const toggleActive = async (id: string, current: boolean | null) => {
    const prev = [...categories]
    const next = !current
    // Optimistic update
    setCategories((c) => c.map((x) => (x.id === id ? { ...x, is_active: next } : x)))
    setToggling(id)

    const { error } = await supabase
      .from('trade_categories')
      .update({ is_active: next })
      .eq('id', id)

    setToggling(null)
    if (error) {
      setCategories(prev)
      toast.error('Failed to update trade')
    } else {
      toast.success(current ? 'Trade disabled' : 'Trade enabled')
    }
  }

  const seedAztecTrades = async () => {
    setSeeding(true)
    const existingNames = new Set(categories.map((c) => c.name.toLowerCase()))
    const toInsert = AZTEC_TRADES.filter((t) => !existingNames.has(t.name.toLowerCase())).map(
      (t, i) => ({
        organization_id: orgId,
        name: t.name,
        labour_type: t.labour_type as 'blue_collar' | 'white_collar',
        is_active: true,
        sort_order: categories.length + i + 1,
      })
    )

    if (toInsert.length === 0) {
      toast.info('All standard trades already added')
      setSeeding(false)
      return
    }

    const { data, error } = await supabase
      .from('trade_categories')
      .insert(toInsert)
      .select()

    setSeeding(false)

    if (error) {
      toast.error('Failed to seed trades')
      return
    }

    setCategories((prev) => [...prev, ...(data as TradeCategory[])])
    toast.success(`${toInsert.length} trade${toInsert.length !== 1 ? 's' : ''} added`)
  }

  const hasMissingTrades = AZTEC_TRADES.some(
    (t) => !categories.map((c) => c.name.toLowerCase()).includes(t.name.toLowerCase())
  )

  const active = categories.filter((c) => c.is_active !== false)
  const inactive = categories.filter((c) => c.is_active === false)

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {active.length} active trade{active.length !== 1 ? 's' : ''}
          {inactive.length > 0 && `, ${inactive.length} inactive`}
        </p>
        <div className="flex gap-2">
          {hasMissingTrades && (
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
              onClick={seedAztecTrades}
              disabled={seeding}
            >
              {seeding && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Seed Aztec Trades
            </Button>
          )}
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Trade
          </Button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 space-y-3"
        >
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            New Trade Category
          </h3>
          {addError && <p className="text-xs text-red-400">{addError}</p>}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-slate-400">Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. CPCS Plant Operator"
                className={`h-8 text-xs ${fieldClass}`}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Typical Day Rate (£)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder="—"
                className={`h-8 text-xs ${fieldClass}`}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Labour Type</Label>
            <Select value={newLabourType} onValueChange={setNewLabourType}>
              <SelectTrigger className={`h-8 text-xs ${fieldClass}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="blue_collar" className="text-xs text-slate-200">
                  Blue Collar
                </SelectItem>
                <SelectItem value="white_collar" className="text-xs text-slate-200">
                  White Collar
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={adding}
            >
              {adding && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Table */}
      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 p-10 text-center">
          <p className="text-sm text-slate-500 mb-3">No trade categories yet</p>
          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={seedAztecTrades}
            disabled={seeding}
          >
            {seeding && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Seed Aztec Standard Trades
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Trade</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Day Rate</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {categories.map((cat) => {
                if (editingId === cat.id) {
                  return (
                    <EditRow
                      key={cat.id}
                      cat={cat}
                      onDone={(updated) => {
                        setCategories((prev) =>
                          prev.map((c) => (c.id === updated.id ? updated : c))
                        )
                        setEditingId(null)
                      }}
                    />
                  )
                }
                return (
                  <tr
                    key={cat.id}
                    className={`transition-opacity hover:bg-slate-900/50 ${cat.is_active === false ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-2.5 text-slate-200">{cat.name}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400 capitalize">
                      {cat.labour_type.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 tabular-nums">
                      {cat.typical_day_rate != null
                        ? `£${Number(cat.typical_day_rate).toFixed(0)}/day`
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-slate-400 hover:text-slate-200"
                          onClick={() => setEditingId(cat.id)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-6 px-2 text-xs transition-colors ${cat.is_active === false ? 'text-emerald-400' : 'text-slate-500'}`}
                          onClick={() => toggleActive(cat.id, cat.is_active)}
                          disabled={toggling === cat.id}
                        >
                          {toggling === cat.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : cat.is_active === false ? (
                            'Enable'
                          ) : (
                            'Disable'
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
