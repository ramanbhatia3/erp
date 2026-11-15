import { motion } from 'motion/react'

function Card({ children, className = '', ...props }) {
  return (
    <motion.section
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(30,58,98,0.045)] transition-shadow duration-200 hover:shadow-[0_12px_34px_rgba(30,58,98,0.08)] sm:p-6 ${className}`}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.section>
  )
}

export default Card
