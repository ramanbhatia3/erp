import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'

function getErrorMessage(error) {
  return error.response?.data?.message || 'Unable to load notifications.'
}

function NotificationBell() {
  const { role } = useParams()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [readingId, setReadingId] = useState('')
  const containerRef = useRef(null)

  const refreshNotifications = useCallback(async () => {
    try {
      const [listResponse, countResponse] = await Promise.all([
        api.get('/notifications', { params: { limit: 5 } }),
        api.get('/notifications/unread-count'),
      ])
      setNotifications(listResponse.data.notifications)
      setUnreadCount(countResponse.data.count)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(refreshNotifications, 0)
    const interval = window.setInterval(refreshNotifications, 60000)
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(interval)
    }
  }, [refreshNotifications])

  useEffect(() => {
    function refreshAfterUpdate() {
      refreshNotifications()
    }

    window.addEventListener('notifications:updated', refreshAfterUpdate)
    return () =>
      window.removeEventListener('notifications:updated', refreshAfterUpdate)
  }, [refreshNotifications])

  useEffect(() => {
    if (!open) return undefined

    function closeOnOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  async function openNotification(notification) {
    setReadingId(notification._id)
    try {
      if (!notification.isRead) {
        await api.patch(`/notifications/${notification._id}/read`)
        setNotifications((current) =>
          current.map((item) =>
            item._id === notification._id ? { ...item, isRead: true } : item,
          ),
        )
        setUnreadCount((count) => Math.max(0, count - 1))
      }
      setOpen(false)
      navigate(notification.link || `/dashboard/${role}/notifications`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setReadingId('')
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        onClick={() => {
          setOpen((current) => !current)
          if (!open) refreshNotifications()
        }}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-semibold leading-5 text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          role="dialog"
          aria-label="Recent notifications"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="text-xs font-medium text-blue-700">
                {unreadCount} unread
              </span>
            )}
          </div>
          {loading && notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              Loading notifications…
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              You’re all caught up.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification._id}>
                  <button
                    className={`w-full px-4 py-3 text-left hover:bg-slate-50 ${
                      notification.isRead ? '' : 'bg-blue-50/70'
                    }`}
                    disabled={readingId === notification._id}
                    onClick={() => openNotification(notification)}
                    type="button"
                  >
                    <span className="flex items-start gap-2">
                      {!notification.isRead && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800">
                          {notification.title}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-xs text-slate-600">
                          {notification.message}
                        </span>
                        <time
                          className="mt-1 block text-xs text-slate-400"
                          dateTime={notification.createdAt}
                        >
                          {new Date(notification.createdAt).toLocaleString()}
                        </time>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link
            className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-medium text-blue-700 hover:bg-slate-50"
            onClick={() => setOpen(false)}
            to={`/dashboard/${role}/notifications`}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
