import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import Loader from '../ui/Loader'

const typeColors = {
  holiday: 'border-emerald-500 bg-emerald-50 text-emerald-800',
  exam: 'border-red-500 bg-red-50 text-red-800',
  workshop: 'border-sky-500 bg-sky-50 text-sky-800',
  seminar: 'border-violet-500 bg-violet-50 text-violet-800',
  function: 'border-pink-500 bg-pink-50 text-pink-800',
  competition: 'border-amber-500 bg-amber-50 text-amber-800',
  placement: 'border-indigo-500 bg-indigo-50 text-indigo-800',
  deadline: 'border-orange-500 bg-orange-50 text-orange-800',
}

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10)
}

function UpcomingEventsWidget() {
  const { role } = useParams()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const from = dateKey(new Date())
    const until = new Date()
    until.setDate(until.getDate() + 30)

    api.get('/events', {
      params: { from, to: dateKey(until) },
    })
      .then((response) => {
        if (active) setEvents(response.data.events.slice(0, 5))
      })
      .catch((error) => {
        if (active) {
          toast.error(
            error.response?.data?.message || 'Unable to load upcoming events.',
          )
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
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Your schedule
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Upcoming Events
          </h2>
          <p className="mt-1 text-sm text-slate-500">The next 30 days.</p>
        </div>
        <Link
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 hover:text-blue-900"
          to={`/dashboard/${role}/events`}
        >
          View all <span aria-hidden="true">→</span>
        </Link>
      </div>
      {loading ? (
        <Loader />
      ) : events.length === 0 ? (
        <EmptyState
          title="No upcoming events"
          message="Events relevant to you will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li className="group flex gap-3" key={event._id}>
              <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-2">
                <span className="text-lg font-bold leading-none text-slate-800">
                  {new Date(event.date).getUTCDate()}
                </span>
                <span className="mt-1 text-[10px] font-semibold uppercase text-slate-500">
                  {new Date(event.date).toLocaleDateString(undefined, {
                    month: 'short',
                    timeZone: 'UTC',
                  })}
                </span>
              </div>
              <div
                className={`min-w-0 flex-1 rounded-xl border-l-4 px-3 py-2.5 transition group-hover:shadow-sm ${typeColors[event.type]}`}
              >
                <p className="truncate font-semibold">{event.title}</p>
                <p className="mt-1 line-clamp-1 text-xs capitalize">
                  {event.type}
                  {event.description ? ` · ${event.description}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default UpcomingEventsWidget
