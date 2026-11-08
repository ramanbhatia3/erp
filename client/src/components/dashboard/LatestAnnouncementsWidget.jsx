import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import Loader from '../ui/Loader'

function LatestAnnouncementsWidget() {
  const { role } = useParams()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true

    api.get('/announcements', { params: { limit: 5 } })
      .then((response) => {
        if (active) setAnnouncements(response.data.announcements)
      })
      .catch((error) => {
        if (active) {
          const message =
            error.response?.data?.message || 'Unable to load announcements.'
          setLoadError(message)
          toast.error(message)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Latest announcements
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Updates relevant to your account.
          </p>
        </div>
        <Link
          className="shrink-0 text-sm font-medium text-blue-700 hover:text-blue-900"
          to={`/dashboard/${role}/announcements`}
        >
          View all
        </Link>
      </div>
      {loading ? (
        <Loader />
      ) : loadError ? (
        <p className="text-sm text-red-700" role="alert">{loadError}</p>
      ) : announcements.length === 0 ? (
        <EmptyState
          title="No announcements yet"
          message="New announcements will appear here."
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {announcements.map((announcement) => (
            <li className="py-4 first:pt-0 last:pb-0" key={announcement._id}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="font-semibold text-slate-800">
                  {announcement.title}
                </h3>
                <time
                  className="shrink-0 text-xs text-slate-500"
                  dateTime={announcement.createdAt}
                >
                  {new Date(announcement.createdAt).toLocaleDateString()}
                </time>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                {announcement.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default LatestAnnouncementsWidget
