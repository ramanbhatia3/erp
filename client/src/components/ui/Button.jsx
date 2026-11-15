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
    secondary: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white shadow-sm shadow-red-900/10 hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
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
