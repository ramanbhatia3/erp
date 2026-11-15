function Input({ label, id, error, className = '', ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
      {label}
      <input
        id={id}
        className={`mt-1 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition duration-200 focus:ring-4 ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
            : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
        } ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export default Input
