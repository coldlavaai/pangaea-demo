'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const DOC_TYPE_LABELS: Record<string, string> = {
  right_to_work: 'Right to Work',
  photo_id: 'Photo ID',
  cscs_card: 'CSCS Card',
  cpcs_ticket: 'CPCS Ticket',
  npors_ticket: 'NPORS Ticket',
  lantra_cert: 'Lantra Certificate',
  first_aid: 'First Aid',
  asbestos_awareness: 'Asbestos Awareness',
  chainsaw_cs30: 'Chainsaw CS30',
  chainsaw_cs31: 'Chainsaw CS31',
  cv: 'CV',
  other: 'Other',
}

export function DocTypeFilter({ currentType }: { currentType?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) params.set('type', e.target.value)
    else params.delete('type')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={currentType ?? ''}
      onChange={handleChange}
      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
    >
      <option value="">All types</option>
      {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  )
}
