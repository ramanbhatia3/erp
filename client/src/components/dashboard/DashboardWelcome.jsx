import { motion } from 'motion/react'

function DashboardWelcome({ title, user, subtitle }) {
  return (
    <motion.section
      className="flex flex-col justify-between gap-5 py-1 sm:flex-row sm:items-end"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {title} workspace
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[2.15rem]">
          Welcome back, {user.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          {subtitle}
        </p>
      </div>
      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        University workspace
      </div>
    </motion.section>
  )
}

export default DashboardWelcome
