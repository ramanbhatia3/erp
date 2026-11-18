import { useEffect } from 'react'

function Modal({ isOpen, onClose, title, children, className = '' }) {
  useEffect(() => {
    if (!isOpen) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 dark:bg-black/80 dark:backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        aria-labelledby="modal-title"
        aria-modal="true"
        className={`w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:border dark:border-[#2b2e36] dark:bg-[#15171c] dark:shadow-2xl dark:shadow-black ${className}`}
        role="dialog"
      >
        {title && (
          <h2 id="modal-title" className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
        )}
        {children}
      </section>
    </div>
  )
}

export default Modal
