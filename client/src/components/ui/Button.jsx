import { motion } from 'motion/react'

function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) {
  const styles = {
    primary: 'bg-blue-700 text-white shadow-sm shadow-blue-900/10 hover:bg-blue-800',
    secondary: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-[#2b2e36] dark:bg-[#181b22] dark:text-[#e2e6ed] dark:hover:bg-[#22252c] dark:hover:border-[#383c46]',
    danger: 'bg-red-600 text-white shadow-sm shadow-red-900/10 hover:bg-red-700 dark:bg-red-600 dark:text-white dark:border dark:border-red-500/50 dark:hover:bg-red-500 dark:hover:border-red-400/60 dark:shadow-[0_2px_12px_rgba(239,68,68,0.3)] dark:active:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b5bcc9] dark:hover:bg-[#181b22] dark:hover:text-[#f1f3f6]',
  }

  return (
    <motion.button
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant] || styles.primary} ${className}`}
      type={type}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.985 }}
      {...props}
    >
      {children}
    </motion.button>
  )
}

export default Button
