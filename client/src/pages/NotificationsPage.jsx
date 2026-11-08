import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Loader from '../components/ui/Loader'

function messageFrom(error, fallback) {
  return error.response?.data?.message || fallback
}

function NotificationsPage() {
  const { role } = useParams()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [markingAll, setMarkingAll] = useState(false)
  const [readingId, setReadingId] = useState('')

  const loadNotifications = useCallback(async () => {
    try {
      const [listResponse, countResponse] = await Promise.all([
        api.get('/notifications', { params: { limit: 20, page } }),
        api.get('/notifications/unread-count'),
      ])
      setNotifications(listResponse.data.notifications)
      setPagination(listResponse.data.pagination)
      setUnreadCount(countResponse.data.count)
      setLoadError('')
    } catch (error) {
      const message = messageFrom(error, 'Unable to load notifications.')
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    const timer = window.setTimeout(loadNotifications, 0)
    return () => window.clearTimeout(timer)
  }, [loadNotifications])

  async function markAllRead() {
    setMarkingAll(true)
    try {
      await api.patch('/notifications/read-all')
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, isRead: true })),
      )
      setUnreadCount(0)
      window.dispatchEvent(new Event('notifications:updated'))
      toast.success('All notifications marked as read.')
    } catch (error) {
      toast.error(messageFrom(error, 'Unable to mark notifications as read.'))
    } finally {
      setMarkingAll(false)
    }
  }

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
        window.dispatchEvent(new Event('notifications:updated'))
      }
      navigate(notification.link || `/dashboard/${role}`)
    } catch (error) {
      toast.error(messageFrom(error, 'Unable to mark notification as read.'))
    } finally {
      setReadingId('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            Updates and reminders for your account.
          </p>
        </div>
        <Button
          disabled={unreadCount === 0 || markingAll}
          onClick={markAllRead}
          variant="secondary"
        >
          {markingAll ? 'Marking…' : 'Mark all as read'}
        </Button>
      </div>

      {loading ? (
        <Loader />
      ) : loadError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {loadError}
        </p>
      ) : notifications.length === 0 ? (
        <EmptyState
          title="You’re all caught up"
          message="New announcements, marks, and other updates will appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              className={!notification.isRead ? 'border-blue-200 bg-blue-50/40' : ''}
              key={notification._id}
            >
              <div className="flex items-start gap-3">
                {!notification.isRead && (
                  <span
                    aria-label="Unread"
                    className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <button
                    className="text-left font-semibold text-slate-900 hover:text-blue-700"
                    disabled={readingId === notification._id}
                    onClick={() => openNotification(notification)}
                    type="button"
                  >
                    {notification.title}
                  </button>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                    {notification.message}
                  </p>
                  <time
                    className="mt-2 block text-xs text-slate-500"
                    dateTime={notification.createdAt}
                  >
                    {new Date(notification.createdAt).toLocaleString()}
                  </time>
                </div>
                {!notification.isRead && (
                  <Button
                    className="shrink-0 px-2 py-1 text-xs"
                    disabled={readingId === notification._id}
                    onClick={async () => {
                      setReadingId(notification._id)
                      try {
                        await api.patch(
                          `/notifications/${notification._id}/read`,
                        )
                        setNotifications((current) =>
                          current.map((item) =>
                            item._id === notification._id
                              ? { ...item, isRead: true }
                              : item,
                          ),
                        )
                        setUnreadCount((count) => Math.max(0, count - 1))
                        window.dispatchEvent(new Event('notifications:updated'))
                      } catch (error) {
                        toast.error(
                          messageFrom(error, 'Unable to mark notification as read.'),
                        )
                      } finally {
                        setReadingId('')
                      }
                    }}
                    variant="ghost"
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </Card>
          ))}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                variant="secondary"
              >
                Previous
              </Button>
              <span className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((current) => current + 1)}
                variant="secondary"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
