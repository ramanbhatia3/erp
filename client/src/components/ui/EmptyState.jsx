function EmptyState({ title = 'Nothing here yet', message, action }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {message && <p className="mt-2 text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export default EmptyState
