import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import useAuth from '../context/useAuth'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import Loader from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'

const eventTypes = [
  'holiday',
  'exam',
  'workshop',
  'seminar',
  'function',
  'competition',
  'placement',
  'deadline',
]
const eventColors = {
  holiday: 'border-emerald-500 bg-emerald-50 text-emerald-800',
  exam: 'border-red-500 bg-red-50 text-red-800',
  workshop: 'border-sky-500 bg-sky-50 text-sky-800',
  seminar: 'border-violet-500 bg-violet-50 text-violet-800',
  function: 'border-pink-500 bg-pink-50 text-pink-800',
  competition: 'border-amber-500 bg-amber-50 text-amber-800',
  placement: 'border-indigo-500 bg-indigo-50 text-indigo-800',
  deadline: 'border-orange-500 bg-orange-50 text-orange-800',
}
const eventAccents = {
  holiday: 'bg-emerald-500',
  exam: 'bg-red-500',
  workshop: 'bg-sky-500',
  seminar: 'bg-violet-500',
  function: 'bg-pink-500',
  competition: 'bg-amber-500',
  placement: 'bg-indigo-500',
  deadline: 'bg-orange-500',
}
const visibilityOptions = [
  { value: 'university', label: 'University' },
  { value: 'department', label: 'Department' },
  { value: 'class', label: 'Class' },
]
const blankForm = {
  title: '',
  description: '',
  type: 'function',
  date: '',
  endDate: '',
  visibility: 'university',
  department: '',
  class: '',
}
const initialDate = new Date()
const initialMonth = new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
const upcomingStart = new Date(initialDate)
upcomingStart.setHours(0, 0, 0, 0)
const upcomingEnd = new Date(upcomingStart)
upcomingEnd.setFullYear(upcomingEnd.getFullYear() + 1)

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10)
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDate(value, options) {
  const isCalendarDate = value instanceof Date
  return new Intl.DateTimeFormat(undefined, {
    ...(!isCalendarDate ? { timeZone: 'UTC' } : {}),
    ...options,
  }).format(isCalendarDate ? value : new Date(value))
}

function messageFrom(error, fallback) {
  return error.response?.data?.message || fallback
}

function getCalendarDays(month) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const firstCell = new Date(
    firstDay.getFullYear(),
    firstDay.getMonth(),
    1 - firstDay.getDay(),
  )
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(
      firstCell.getFullYear(),
      firstCell.getMonth(),
      firstCell.getDate() + index,
    )
    return {
      date: day,
      key: localDateKey(day),
      inMonth: day.getMonth() === month.getMonth(),
    }
  })
}

function eventIncludesDate(event, key) {
  const start = dateKey(event.date)
  const end = event.endDate ? dateKey(event.endDate) : start
  return start <= key && end >= key
}

function EventsPage() {
  const { user } = useAuth()
  const canManage = ['superadmin', 'teacher'].includes(user.role)
  const isClassAdvisor = user.role === 'teacher' && user.isClassAdvisor
  const [month, setMonth] = useState(initialMonth)
  const [view, setView] = useState('calendar')
  const [typeFilter, setTypeFilter] = useState('')
  const [events, setEvents] = useState([])
  const [departments, setDepartments] = useState([])
  const [classes, setClasses] = useState([])
  const [selectedDate, setSelectedDate] = useState(localDateKey(initialDate))
  const [loadedQuery, setLoadedQuery] = useState('')
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [form, setForm] = useState({
    ...blankForm,
    visibility: isClassAdvisor
      ? 'class'
      : user.role === 'superadmin'
        ? 'university'
        : 'department',
    department: user.department || '',
  })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  const range = useMemo(() => {
    if (view === 'list') {
      return {
        from: localDateKey(upcomingStart),
        to: localDateKey(upcomingEnd),
      }
    }

    const days = getCalendarDays(month)
    return {
      from: days[0].key,
      to: days[days.length - 1].key,
    }
  }, [month, view])
  const queryKey = JSON.stringify([range.from, range.to, typeFilter])
  const loading = loadedQuery !== queryKey

  const loadEvents = useCallback(async (signal) => {
    try {
      const response = await api.get('/events', {
        params: {
          ...range,
          ...(typeFilter ? { type: typeFilter } : {}),
        },
        signal,
      })
      setEvents(response.data.events)
      setLoadError('')
      setLoadedQuery(queryKey)
    } catch (error) {
      if (signal?.aborted) return
      const message = messageFrom(error, 'Unable to load events.')
      setLoadError(message)
      setLoadedQuery(queryKey)
      toast.error(message)
    }
  }, [queryKey, range, typeFilter])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => loadEvents(controller.signal), 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [loadEvents])

  useEffect(() => {
    if (!canManage) return undefined

    let active = true
    const requests = [api.get('/departments'), api.get('/classes')]
    if (user.role === 'teacher') requests.push(api.get('/subjects'))

    Promise.all(requests)
      .then(([departmentResponse, classResponse, subjectResponse]) => {
        if (!active) return
        setDepartments(departmentResponse.data.departments)
        const allClasses = classResponse.data.classes
        if (isClassAdvisor) {
          setClasses(
            allClasses.filter((item) => item.advisor?._id === user.id),
          )
        } else if (user.role === 'teacher') {
          const subjectClassIds = new Set(
            subjectResponse.data.subjects.map((subject) =>
              String(subject.class?._id || subject.class),
            ),
          )
          setClasses(
            allClasses.filter((item) => subjectClassIds.has(String(item._id))),
          )
        } else {
          setClasses(allClasses)
        }
      })
      .catch((error) => {
        if (active) toast.error(messageFrom(error, 'Unable to load event scopes.'))
      })

    return () => {
      active = false
    }
  }, [canManage, isClassAdvisor, user.id, user.role])

  const calendarDays = useMemo(() => getCalendarDays(month), [month])
  const eventsByDay = useMemo(() => {
    const result = new Map()
    for (const day of calendarDays) {
      result.set(
        day.key,
        events.filter((event) => eventIncludesDate(event, day.key)),
      )
    }
    return result
  }, [calendarDays, events])
  const visibleListEvents = useMemo(
    () =>
      events.filter((event) => {
        const key = dateKey(event.endDate || event.date)
        return key >= range.from
      }),
    [events, range.from],
  )
  const selectedEvents = selectedDate
    ? events.filter((event) => eventIncludesDate(event, selectedDate))
    : []
  const todayKey = localDateKey(initialDate)

  function openCreate(date = '') {
    setEditingEvent(null)
    setForm({
      ...blankForm,
      date: date || localDateKey(new Date()),
      visibility: isClassAdvisor
        ? 'class'
        : user.role === 'superadmin'
          ? 'university'
          : 'department',
      department: user.department || '',
    })
    setModalOpen(true)
  }

  function openEdit(event) {
    setEditingEvent(event)
    setForm({
      title: event.title,
      description: event.description || '',
      type: event.type,
      date: dateKey(event.date),
      endDate: event.endDate ? dateKey(event.endDate) : '',
      visibility: event.visibility,
      department: event.department?._id || '',
      class: event.class?._id || '',
    })
    setModalOpen(true)
  }

  function updateForm(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
      ...(event.target.name === 'visibility'
        ? { department: user.role === 'teacher' ? user.department || '' : '', class: '' }
        : {}),
    }))
  }

  async function submitEvent(event) {
    event.preventDefault()
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      date: form.date,
      endDate: form.endDate || null,
      visibility: form.visibility,
    }
    if (form.visibility === 'department') payload.department = form.department
    if (form.visibility === 'class') payload.class = form.class

    try {
      if (editingEvent) {
        await api.put(`/events/${editingEvent._id}`, payload)
        toast.success('Event updated.')
        await loadEvents()
      } else {
        await api.post('/events', payload)
        toast.success('Event created.')
        await loadEvents()
      }
      setModalOpen(false)
    } catch (error) {
      toast.error(messageFrom(error, 'Unable to save event.'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteEvent(event) {
    if (!window.confirm(`Delete "${event.title}"?`)) return
    setDeletingId(event._id)
    try {
      await api.delete(`/events/${event._id}`)
      setEvents((current) => current.filter((item) => item._id !== event._id))
      toast.success('Event deleted.')
    } catch (error) {
      toast.error(messageFrom(error, 'Unable to delete event.'))
    } finally {
      setDeletingId('')
    }
  }

  function scopeLabel(event) {
    if (event.visibility === 'university') return 'University'
    if (event.visibility === 'department') {
      return event.department?.name || 'Department'
    }
    return event.class
      ? `${event.class.name} · ${event.class.section}`
      : 'Class'
  }

  const canEditEvent = (event) =>
    user.role === 'superadmin' ||
    (user.role === 'teacher' &&
      event.createdBy?._id === user.id)

  const activeTypeCount = new Set(events.map((event) => event.type)).size

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-5 py-6 text-white shadow-sm sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-blue-200 ring-1 ring-white/15 sm:flex">
              <svg
                aria-hidden="true"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                viewBox="0 0 24 24"
              >
                <path
                  d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                University calendar
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Events
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Keep track of academic dates, campus activities, and deadlines
                relevant to you.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-slate-100 ring-1 ring-white/10">
                  {events.length} {events.length === 1 ? 'event' : 'events'} in view
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-slate-100 ring-1 ring-white/10">
                  {activeTypeCount} {activeTypeCount === 1 ? 'type' : 'types'}
                </span>
              </div>
            </div>
          </div>
          {canManage && (
            <Button
              className="w-full shrink-0 bg-white text-slate-900 shadow-sm hover:bg-blue-50 sm:w-auto"
              onClick={() => openCreate()}
            >
              <span aria-hidden="true" className="mr-2 text-lg leading-none">+</span>
              Create event
            </Button>
          )}
        </div>
      </section>

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {view === 'calendar' && (
              <>
                <Button
                  aria-label="Previous month"
                  className="h-10 w-10 px-0 text-xl"
                  onClick={() => {
                    setSelectedDate('')
                    setMonth((current) =>
                      new Date(current.getFullYear(), current.getMonth() - 1, 1),
                    )
                  }}
                  variant="secondary"
                >
                  ‹
                </Button>
                <h2 className="min-w-36 text-center text-base font-semibold text-slate-900 sm:min-w-44 sm:text-lg">
                  {formatDate(month, { month: 'long', year: 'numeric' })}
                </h2>
                <Button
                  className="px-3"
                  onClick={() => {
                    setSelectedDate(todayKey)
                    setMonth(
                      new Date(
                        initialDate.getFullYear(),
                        initialDate.getMonth(),
                        1,
                      ),
                    )
                  }}
                  variant="secondary"
                >
                  Today
                </Button>
                <Button
                  aria-label="Next month"
                  className="h-10 w-10 px-0 text-xl"
                  onClick={() => {
                    setSelectedDate('')
                    setMonth((current) =>
                      new Date(current.getFullYear(), current.getMonth() + 1, 1),
                    )
                  }}
                  variant="secondary"
                >
                  ›
                </Button>
              </>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-40 flex-1 sm:flex-none">
              <Select
                id="event-type-filter"
                label="Filter by type"
                className="mt-1 min-w-40"
                options={[
                  { value: '', label: 'All event types' },
                  ...eventTypes.map((type) => ({
                    value: type,
                    label: type[0].toUpperCase() + type.slice(1),
                  })),
                ]}
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              />
            </div>
            <div
              aria-label="Calendar view"
              className="flex rounded-xl bg-slate-100 p-1"
              role="group"
            >
              <Button
                aria-pressed={view === 'calendar'}
                className="flex-1 px-4 py-2 sm:flex-none"
                onClick={() => setView('calendar')}
                variant={view === 'calendar' ? 'primary' : 'ghost'}
              >
                <svg
                  aria-hidden="true"
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Month
              </Button>
              <Button
                aria-pressed={view === 'list'}
                className="flex-1 px-4 py-2 sm:flex-none"
                onClick={() => setView('list')}
                variant={view === 'list' ? 'primary' : 'ghost'}
              >
                <svg
                  aria-hidden="true"
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                List
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 pt-3">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Types
          </span>
          {eventTypes.map((type) => (
            <button
              aria-pressed={typeFilter === type}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition ${
                typeFilter === type
                  ? eventColors[type]
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
              type="button"
            >
              {type}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <Loader />
      ) : loadError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {loadError}
        </p>
      ) : view === 'calendar' ? (
        <>
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/60 px-4 py-3 sm:px-5">
              <p className="text-sm font-semibold text-slate-800">
                {formatDate(month, { month: 'long', year: 'numeric' })}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Select a date to see its schedule
              </p>
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-200 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div className="bg-white py-2.5 sm:py-3" key={day}>
                  <span className="sm:hidden">{day.slice(0, 1)}</span>
                  <span className="hidden sm:inline">{day}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-200">
              {calendarDays.map(({ date, key, inMonth }) => {
                const dayEvents = eventsByDay.get(key) || []
                return (
                  <button
                    aria-label={`${formatDate(date, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}, ${dayEvents.length} events`}
                    className={`min-h-20 p-1 text-left align-top transition hover:bg-blue-50 sm:min-h-28 sm:p-2 ${
                      inMonth ? 'bg-white' : 'bg-slate-50 text-slate-400'
                    } ${selectedDate === key ? 'ring-2 ring-inset ring-blue-500' : ''}`}
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    type="button"
                  >
                    <span
                      className={`mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-medium ${
                        key === todayKey
                          ? 'bg-blue-700 text-white'
                          : inMonth
                            ? 'text-slate-700'
                            : 'text-slate-400'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    <span className="block space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <span
                          className={`block truncate rounded border-l-2 px-1 py-0.5 text-left text-[9px] leading-tight sm:text-xs ${eventColors[event.type]}`}
                          key={event._id}
                          title={`${event.title} (${event.type})`}
                        >
                          <span className="hidden sm:inline">{event.title}</span>
                          <span className="sm:hidden">{event.title.slice(0, 9)}</span>
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="block text-[10px] text-slate-500">
                          +{dayEvents.length - 2} more
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {selectedDate
                ? `Events on ${formatDate(selectedDate, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}`
                : 'Select a date to view its events'}
            </h2>
            {selectedDate && selectedEvents.length > 0 && (
              <p className="text-sm text-slate-500">
                {selectedEvents.length} event{selectedEvents.length === 1 ? '' : 's'} scheduled
              </p>
            )}
            {selectedDate && selectedEvents.length === 0 ? (
              <EmptyState title="No events on this date" />
            ) : (
              selectedEvents.map((event) => (
                <EventCard
                  canEdit={canEditEvent(event)}
                  deleting={deletingId === event._id}
                  event={event}
                  key={event._id}
                  onDelete={deleteEvent}
                  onEdit={openEdit}
                  scopeLabel={scopeLabel(event)}
                />
              ))
            )}
          </section>
        </>
      ) : visibleListEvents.length === 0 ? (
        <EmptyState
          title="No upcoming events"
          message="There are no matching events in the next 12 months."
        />
      ) : (
        <section className="space-y-3">
          {visibleListEvents.map((event) => (
            <EventCard
              canEdit={canEditEvent(event)}
              deleting={deletingId === event._id}
              event={event}
              key={event._id}
              onDelete={deleteEvent}
              onEdit={openEdit}
              scopeLabel={scopeLabel(event)}
            />
          ))}
        </section>
      )}

      {modalOpen && (
        <Modal
          className="max-h-[90vh] overflow-y-auto"
          isOpen={modalOpen}
          onClose={() => {
            if (!saving) setModalOpen(false)
          }}
          title={editingEvent ? 'Edit event' : 'Create event'}
        >
          <form className="space-y-4" onSubmit={submitEvent}>
            <Input
              id="event-title"
              label="Title"
              maxLength={150}
              name="title"
              onChange={updateForm}
              required
              value={form.title}
            />
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="event-description"
            >
              Description
              <textarea
                className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                id="event-description"
                maxLength={5000}
                name="description"
                onChange={updateForm}
                value={form.description}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                id="event-type"
                label="Type"
                name="type"
                onChange={updateForm}
                options={eventTypes.map((type) => ({
                  value: type,
                  label: type[0].toUpperCase() + type.slice(1),
                }))}
                value={form.type}
              />
              <Select
                id="event-visibility"
                label="Visibility"
                name="visibility"
                onChange={updateForm}
                options={
                  isClassAdvisor
                    ? [{ value: 'class', label: 'My class' }]
                    : user.role === 'superadmin'
                      ? visibilityOptions
                      : visibilityOptions.filter(
                          (option) => option.value !== 'university',
                        )
                }
                value={form.visibility}
              />
              <Input
                id="event-date"
                label="Start date"
                name="date"
                onChange={updateForm}
                required
                type="date"
                value={form.date}
              />
              <Input
                id="event-end-date"
                label="End date (optional)"
                min={form.date}
                name="endDate"
                onChange={updateForm}
                type="date"
                value={form.endDate}
              />
              {form.visibility === 'department' && (
                <Select
                  id="event-department"
                  label="Department"
                  name="department"
                  onChange={updateForm}
                  options={[
                    { value: '', label: 'Select a department' },
                    ...departments.map((item) => ({
                      value: item._id,
                      label: item.name,
                    })),
                  ]}
                  required
                  value={form.department}
                  disabled={user.role === 'teacher'}
                />
              )}
              {form.visibility === 'class' && (
                <Select
                  id="event-class"
                  label="Class"
                  name="class"
                  onChange={updateForm}
                  options={[
                    {
                      value: '',
                      label: classes.length
                        ? 'Select a class'
                        : 'No eligible classes',
                    },
                    ...classes.map((item) => ({
                      value: item._id,
                      label: `${item.name} · ${item.section}`,
                    })),
                  ]}
                  required
                  value={form.class}
                />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                disabled={saving}
                onClick={() => setModalOpen(false)}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                disabled={
                  saving ||
                  (form.visibility === 'department' && !form.department) ||
                  (form.visibility === 'class' && !form.class)
                }
                type="submit"
              >
                {saving ? 'Saving…' : editingEvent ? 'Save changes' : 'Create event'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function EventCard({ event, scopeLabel, canEdit, onEdit, onDelete, deleting }) {
  const dateLabel = event.endDate
    ? `${formatDate(event.date, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })} – ${formatDate(event.endDate, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`
    : formatDate(event.date, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })

  return (
    <Card className="overflow-hidden p-0 transition-shadow hover:shadow-md">
      <div className="flex">
        <div className={`w-1.5 shrink-0 ${eventAccents[event.type]}`} />
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
          <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border ${eventColors[event.type]}`}>
            <span className="text-lg font-bold leading-none">
              {new Date(event.date).getUTCDate()}
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase leading-none">
              {formatDate(event.date, { month: 'short' })}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                {event.title}
              </h3>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${eventColors[event.type]}`}>
                {event.type}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {dateLabel}
              </span>
              <span className="hidden text-slate-300 sm:inline">·</span>
              <span>{scopeLabel}</span>
            </div>
            {event.description && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {event.description}
              </p>
            )}
            <p className="mt-3 text-xs text-slate-400">
              Added by {event.createdBy?.name || 'University'}
            </p>
          </div>
          {canEdit && (
            <div className="flex shrink-0 gap-2 border-t border-slate-100 pt-3 sm:border-0 sm:pt-0">
              <Button
                className="px-3"
                onClick={() => onEdit(event)}
                variant="secondary"
              >
                Edit
              </Button>
              <Button
                className="px-3"
                disabled={deleting}
                onClick={() => onDelete(event)}
                variant="danger"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default EventsPage
