function Loader({ label = 'Loading...', className = '' }) {
  return (
    <div
      className={`flex items-center justify-center gap-3 p-6 text-sm text-slate-600 ${className}`}
      role="status"
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-700 border-r-transparent" />
      <span>{label}</span>
    </div>
  )
}

export default Loader
