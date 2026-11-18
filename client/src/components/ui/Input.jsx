function Input({ label, id, error, className = '', ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-[#d1d6e0]" htmlFor={id}>
      {label}
      <input
        id={id}
        className={`mt-1 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition duration-200 focus:ring-4 dark:bg-[#101216] dark:text-[#f1f3f6] dark:placeholder-[#68707f] ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:ring-red-950/30'
            : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 dark:border-[#2b2e36] dark:focus:border-blue-500 dark:focus:ring-blue-500/20'
        } ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  )
}

export default Input
