function Badge({ children, color = 'slate', className = '' }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-[#1f2229] dark:text-[#d1d6e0] dark:border dark:border-[#30343f]',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300 dark:border dark:border-blue-500/35',
    green: 'bg-green-100 text-green-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border dark:border-emerald-500/35',
    yellow: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 dark:border dark:border-amber-500/35',
    red: 'bg-red-100 text-red-800 dark:bg-rose-500/15 dark:text-rose-300 dark:border dark:border-rose-500/35',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300 dark:border dark:border-purple-500/35',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colors[color] || colors.slate} ${className}`}
    >
      {children}
    </span>
  )
}

export default Badge
