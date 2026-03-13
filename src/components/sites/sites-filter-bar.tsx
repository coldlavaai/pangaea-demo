'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

export function SitesFilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const q = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? ''

  const push = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v)
        else params.delete(k)
      })
      params.delete('page')
      router.push(`/sites?${params.toString()}`)
    },
    [router, searchParams]
  )

  const onSearch = (value: string) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => push({ q: value }), 400)
  }

  const hasFilters = q || status

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, postcode…"
          defaultValue={q}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <select
        value={status}
        onChange={(e) => push({ status: e.target.value })}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push('/sites')}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
