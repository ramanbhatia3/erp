function EmptyState({ title = 'Nothing here yet', message, action }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-[#2b2e36] dark:bg-[#101216]">
      <h2 className="text-base font-semibold text-slate-800 dark:text-[#f1f3f6]">{title}</h2>
      {message && <p className="mt-2 text-sm text-slate-500 dark:text-[#8a919e]">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export default EmptyState
