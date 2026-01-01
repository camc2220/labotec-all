import React from 'react'

export default function Table({ columns, data, rowKey }) {
  const resolveRowKey = (row, idx) => {
    if (typeof rowKey === 'function') {
      const result = rowKey(row, idx)
      return result ?? idx
    }

    if (typeof rowKey === 'string' && row && row[rowKey] !== undefined && row[rowKey] !== null) {
      return row[rowKey]
    }

    return idx
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>{columns.map(c => (<th key={c.key} className="px-4 py-3 text-left font-semibold">{c.header}</th>))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => (
              <tr key={resolveRowKey(row, idx)} className="hover:bg-slate-50/60">
                {columns.map(c => (
                  <td key={c.key} className="px-4 py-3 align-top text-slate-700">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
