function Input({ label, id, error, className = '', ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
      {label}
      <input
        id={id}
        className={`mt-1 w-full rounded-lg border px-3 py-2 outline-none transition focus:ring-2 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
            : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
        } ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export default Input
