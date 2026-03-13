'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Search, X } from 'lucide-react'

export function TimesheetsSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const update = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('page')
      if (value) params.set('operative', value)
      else params.delete('operative')
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="relative w-56">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        defaultValue={defaultValue}
        onChange={e => update(e.target.value)}
        placeholder="Filter by operative…"
        className="w-full rounded-md border border-border bg-card/60 pl-8 pr-8 py-1.5 text-sm text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-forest-600"
      />
      {defaultValue && (
        <button
          onClick={() => update('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
