'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckSquare, Square } from 'lucide-react'

interface OnboardingChecklistProps {
  operativeId: string
  blueSticker: boolean
  buddyAllocated: boolean
  twoWeekReview: boolean
  inductionComplete: boolean
}

type ChecklistField =
  | 'onboarding_blue_sticker_issued'
  | 'onboarding_buddy_allocated'
  | 'onboarding_two_week_review'
  | 'onboarding_induction_complete'

const ITEMS: { field: ChecklistField; label: string; description: string }[] = [
  {
    field: 'onboarding_blue_sticker_issued',
    label: 'Blue Sticker Issued',
    description: 'Provisional ID sticker — remove when CSCS card arrives',
  },
  {
    field: 'onboarding_buddy_allocated',
    label: 'Buddy Allocated',
    description: 'Buddy / mentor assigned for first day',
  },
  {
    field: 'onboarding_two_week_review',
    label: '2-Week Review Done',
    description: 'Check-in review completed at 2 weeks',
  },
  {
    field: 'onboarding_induction_complete',
    label: 'Induction Complete',
    description: 'Company induction completed and signed off',
  },
]

export function OnboardingChecklist({
  operativeId,
  blueSticker,
  buddyAllocated,
  twoWeekReview,
  inductionComplete,
}: OnboardingChecklistProps) {
  const router = useRouter()
  const supabase = createClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  const [values, setValues] = useState<Record<ChecklistField, boolean>>({
    onboarding_blue_sticker_issued: blueSticker,
    onboarding_buddy_allocated: buddyAllocated,
    onboarding_two_week_review: twoWeekReview,
    onboarding_induction_complete: inductionComplete,
  })
  const [saving, setSaving] = useState<ChecklistField | null>(null)

  const toggle = async (field: ChecklistField) => {
    const newVal = !values[field]
    setSaving(field)
    const { error } = await supabase
      .from('operatives')
      .update({ [field]: newVal })
      .eq('id', operativeId)
      .eq('organization_id', orgId)

    if (!error) {
      setValues((prev) => ({ ...prev, [field]: newVal }))
      router.refresh()
    }
    setSaving(null)
  }

  const doneCount = Object.values(values).filter(Boolean).length

  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground mb-2">
        {doneCount}/{ITEMS.length} complete
      </div>
      {ITEMS.map((item) => {
        const checked = values[item.field]
        const isSaving = saving === item.field
        return (
          <button
            key={item.field}
            type="button"
            onClick={() => toggle(item.field)}
            disabled={!!saving}
            className="w-full flex items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-card/60 disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground animate-spin" />
            ) : checked ? (
              <CheckSquare className="h-4 w-4 shrink-0 mt-0.5 text-forest-400" />
            ) : (
              <Square className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
            )}
            <div>
              <span className={`text-xs font-medium ${checked ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
              <p className="text-xs text-muted-foreground leading-tight">{item.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
