function Select({ label, id, options = [], className = '', ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
      {label}
      <select
        id={id}
        className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default Select
