function Card({ children, className = '', ...props }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(30,58,98,0.06)] transition-shadow duration-200 hover:shadow-[0_12px_34px_rgba(30,58,98,0.09)] sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </section>
  )
}

export default Card
