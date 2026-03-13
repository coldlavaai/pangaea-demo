const SESSION_GAP_MS = 2 * 60 * 1000 // 2 minutes — merges chunks of the same upload session only

type ImportableItem = {
  id: string
  type: string
  title: string
  body: string | null
  severity: string
  created_at: string
  [key: string]: unknown
}

export function collapseImports<T extends ImportableItem>(items: T[]): T[] {
  const result: T[] = []
  let importGroup: T[] = []

  const flushGroup = () => {
    if (importGroup.length === 0) return
    if (importGroup.length === 1) {
      result.push(importGroup[0])
    } else {
      let totalImported = 0, totalSkipped = 0, totalFailed = 0
      let filename = ''
      let hasFailed = false
      for (const item of importGroup) {
        const im = item.title.match(/(\d+) operatives added/)
        if (im) totalImported += parseInt(im[1])
        const sm = item.body?.match(/(\d+) skipped/)
        if (sm) totalSkipped += parseInt(sm[1])
        const fm = item.body?.match(/(\d+) failed/)
        if (fm) totalFailed += parseInt(fm[1])
        if (item.severity === 'warning') hasFailed = true
        if (!filename) {
          const fnm = item.body?.match(/File: (.+)/)
          if (fnm) filename = fnm[1]
        }
      }
      const parts = [`${totalImported} operatives added`]
      if (totalSkipped > 0) parts.push(`${totalSkipped} skipped`)
      if (totalFailed > 0) parts.push(`${totalFailed} failed`)
      if (filename) parts.push(`File: ${filename}`)
      if (importGroup.length > 1) parts.push(`${importGroup.length} batches`)
      result.push({
        ...importGroup[0],
        title: `Import complete — ${totalImported} operatives added`,
        body: parts.join(' · '),
        severity: hasFailed ? 'warning' : 'info',
      })
    }
    importGroup = []
  }

  for (const item of items) {
    if (item.type !== 'bulk_import') {
      flushGroup()
      result.push(item)
      continue
    }
    if (importGroup.length === 0) { importGroup.push(item); continue }
    const lastTs = new Date(importGroup[importGroup.length - 1].created_at).getTime()
    const gap = Math.abs(lastTs - new Date(item.created_at).getTime())
    if (gap <= SESSION_GAP_MS) { importGroup.push(item) } else { flushGroup(); importGroup.push(item) }
  }
  flushGroup()
  return result
}
