function Table({ columns = [], rows = [], getRowKey, emptyMessage = 'No records found.' }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-[#2b2e36] dark:text-[#8a919e]">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-[#242730]">
      <table className="table-row-hover min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-[#242730]">
        <thead className="bg-slate-50/90 text-[11px] uppercase tracking-[0.1em] text-slate-500 dark:bg-[#101216] dark:text-[#8a919e]">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3.5 font-bold" key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white text-slate-700 dark:divide-[#1e2128] dark:bg-[#15171c] dark:text-[#d1d6e0]">
          {rows.map((row, index) => (
            <tr key={getRowKey ? getRowKey(row) : row.id || index}>
              {columns.map((column) => (
                <td className="px-4 py-3.5" key={column.key}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Table
