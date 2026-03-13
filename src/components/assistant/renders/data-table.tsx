'use client'

interface DataTableData {
  columns: string[]
  rows: (string | number | null | undefined)[][]
}

export function DataTable({ data }: { data: DataTableData }) {
  if (!data?.columns?.length) return null

  return (
    <div className="my-2 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700">
            {data.columns.map((col, i) => (
              <th key={i} className="text-left py-1.5 px-2 text-slate-400 font-medium">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-slate-800/50 hover:bg-slate-800/30">
              {row.map((cell, ci) => (
                <td key={ci} className="py-1.5 px-2 text-slate-300">
                  {cell == null ? '-' : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.rows.length === 0 && <p className="text-xs text-slate-500 py-2 px-2">No results.</p>}
    </div>
  )
}
