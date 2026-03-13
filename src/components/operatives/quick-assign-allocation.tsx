'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
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
import { toast } from 'sonner'
import { quickAssignAllocation } from '@/app/(dashboard)/operatives/actions'

interface Site { id: string; name: string }

interface Props {
  operativeId: string
  sites: Site[]
}

export function QuickAssignAllocation({ operativeId, sites }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [siteId, setSiteId] = useState('')
  const [rate, setRate] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)

  const handleSubmit = () => {
    if (!siteId) { toast.error('Select a site'); return }
    if (!rate || isNaN(Number(rate))) { toast.error('Enter a valid day rate'); return }
    setSaving(true)
    startTransition(async () => {
      const result = await quickAssignAllocation({
        operativeId,
        siteId,
        agreedDayRate: Number(rate),
        startDate,
      })
      setSaving(false)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Allocation created')
        setOpen(false)
        setSiteId('')
        setRate('')
        router.refresh()
      }
    })
  }

  if (!open) {
    return (
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 bg-forest-600 hover:bg-forest-500 text-white"
      >
        <Plus className="h-4 w-4" />
        Add allocation
      </Button>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-background/60 p-4 space-y-3">
      <p className="text-sm font-medium text-muted-foreground">New allocation</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Site</Label>
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger className="bg-card border-border text-muted-foreground h-9">
              <SelectValue placeholder="Select site…" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {sites.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-muted-foreground">{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Day rate (£)</Label>
          <Input
            type="number"
            value={rate}
            onChange={e => setRate(e.target.value)}
            placeholder="175"
            className="bg-card border-border text-muted-foreground h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Start date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="bg-card border-border text-muted-foreground h-9"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={saving}
          className="bg-forest-600 hover:bg-forest-500 text-white gap-2"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          {saving ? 'Saving…' : 'Confirm'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="text-muted-foreground">
          Cancel
        </Button>
      </div>
    </div>
  )
}
