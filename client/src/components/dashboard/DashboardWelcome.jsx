function DashboardWelcome({ title, user, subtitle }) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-700 px-6 py-7 text-white shadow-[0_18px_48px_rgba(37,99,235,0.2)] sm:px-8 sm:py-8">
      <div aria-hidden="true" className="absolute -right-12 -top-24 -z-10 h-64 w-64 rounded-full border-[36px] border-white/[0.07]" />
      <div aria-hidden="true" className="absolute -bottom-28 right-28 -z-10 h-56 w-56 rounded-full bg-sky-300/10 blur-2xl" />
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.9)]" />
            University workspace
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {user.name}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100/90 sm:text-base">
            {subtitle}
          </p>
        </div>
        <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-200">
            Your workspace
          </p>
          <p className="mt-1 text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs text-blue-100/80">
            RBPU Hub · Academic operations
          </p>
        </div>
      </div>
    </section>
  )
}

export default DashboardWelcome
