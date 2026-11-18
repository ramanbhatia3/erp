function Select({ label, id, options = [], className = '', ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-[#d1d6e0]" htmlFor={id}>
      {label}
      <select
        id={id}
        className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-[#2b2e36] dark:bg-[#101216] dark:text-[#f1f3f6] dark:focus:border-blue-500 dark:focus:ring-blue-500/20 ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="dark:bg-[#15171c] dark:text-[#f1f3f6]">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default Select
