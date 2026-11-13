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

const tabs = ['Clubs', 'Club Events', 'My Participation', 'Announcements']
const blankClub = { name: '', description: '', facultyCoordinator: '', logo: '' }
const blankEvent = { club: '', title: '', date: '', description: '' }
const blankAnnouncement = { club: '', title: '', message: '' }

function messageFrom(error, fallback) {
  return error.response?.data?.message || fallback
}

function dateInput(value) {
  return new Date(value).toISOString().slice(0, 10)
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function ClubsPage() {
  const { user } = useAuth()
  const isManager = ['superadmin', 'teacher'].includes(user.role)
  const isSuperadmin = user.role === 'superadmin'
  const isStudent = user.role === 'student'
  const [activeTab, setActiveTab] = useState('Clubs')
  const [period, setPeriod] = useState('upcoming')
  const [clubs, setClubs] = useState([])
  const [events, setEvents] = useState([])
  const [participation, setParticipation] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [faculty, setFaculty] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [clubModalOpen, setClubModalOpen] = useState(false)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false)
  const [editingClub, setEditingClub] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [clubForm, setClubForm] = useState(blankClub)
  const [eventForm, setEventForm] = useState(blankEvent)
  const [announcementForm, setAnnouncementForm] = useState(blankAnnouncement)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    const responses = await Promise.all([
      api.get('/clubs'),
      api.get('/club-events', { params: { period } }),
      api.get('/club-announcements'),
      ...(isStudent ? [api.get('/club-events/participation/me')] : []),
      ...(isManager ? [api.get('/faculty/availability')] : []),
    ])
    let responseIndex = 3
    const [clubResponse, eventResponse, announcementResponse] = responses
    return {
      clubs: clubResponse.data.clubs,
      events: eventResponse.data.events,
      announcements: announcementResponse.data.announcements,
      participation: isStudent ? responses[responseIndex++].data.events : [],
      faculty: isManager ? responses[responseIndex].data.faculty : [],
    }
  }, [isManager, isStudent, period])

  const reload = useCallback(async () => {
    const data = await loadData()
    setClubs(data.clubs)
    setEvents(data.events)
    setAnnouncements(data.announcements)
    setParticipation(data.participation)
    setFaculty(data.faculty)
    setLoadError('')
  }, [loadData])

  useEffect(() => {
    let active = true
    loadData()
      .then((data) => {
        if (!active) return
        setClubs(data.clubs)
        setEvents(data.events)
        setAnnouncements(data.announcements)
        setParticipation(data.participation)
        setFaculty(data.faculty)
      })
      .catch((error) => {
        if (active) {
          const message = messageFrom(error, 'Unable to load club information.')
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
  }, [loadData])

  const managedClubs = useMemo(
    () =>
      clubs.filter(
        (club) =>
          isSuperadmin ||
          String(club.facultyCoordinator?._id || club.facultyCoordinator) ===
            String(user.id),
      ),
    [clubs, isSuperadmin, user.id],
  )

  function canManageClub(club) {
    return (
      isSuperadmin ||
      (user.role === 'teacher' &&
        String(club.facultyCoordinator?._id || club.facultyCoordinator) ===
          String(user.id))
    )
  }

  async function perform(action, fallback, success) {
    try {
      await action()
      if (success) toast.success(success)
      await reload()
    } catch (error) {
      toast.error(messageFrom(error, fallback))
    }
  }

  function openCreateClub() {
    setEditingClub(null)
    setClubForm({
      ...blankClub,
      facultyCoordinator: isSuperadmin ? '' : user.id,
    })
    setClubModalOpen(true)
  }

  function openEditClub(club) {
    setEditingClub(club)
    setClubForm({
      name: club.name,
      description: club.description || '',
      facultyCoordinator: club.facultyCoordinator?._id || '',
      logo: club.logo || '',
    })
    setClubModalOpen(true)
  }

  function openCreateEvent(club = managedClubs[0]) {
    setEditingEvent(null)
    setEventForm({ ...blankEvent, club: club?._id || '' })
    setEventModalOpen(true)
  }

  function openEditEvent(event) {
    setEditingEvent(event)
    setEventForm({
      club: event.club?._id || '',
      title: event.title,
      date: dateInput(event.date),
      description: event.description || '',
    })
    setEventModalOpen(true)
  }

  async function submitClub(event) {
    event.preventDefault()
    setSaving(true)
    const payload = {
      name: clubForm.name.trim(),
      description: clubForm.description.trim(),
      logo: clubForm.logo.trim(),
    }
    if (isSuperadmin) payload.facultyCoordinator = clubForm.facultyCoordinator
    try {
      if (editingClub) {
        await api.put(`/clubs/${editingClub._id}`, payload)
        toast.success('Club updated.')
      } else {
        await api.post('/clubs', payload)
        toast.success('Club created.')
      }
      setClubModalOpen(false)
      await reload()
    } catch (error) {
      toast.error(messageFrom(error, 'Unable to save club.'))
    } finally {
      setSaving(false)
    }
  }

  async function submitEvent(event) {
    event.preventDefault()
    setSaving(true)
    const payload = {
      title: eventForm.title.trim(),
      date: eventForm.date,
      description: eventForm.description.trim(),
    }
    try {
      if (editingEvent) {
        await api.put(`/club-events/${editingEvent._id}`, payload)
        toast.success('Club event updated.')
      } else {
        await api.post('/club-events', { ...payload, club: eventForm.club })
        toast.success('Club event created.')
      }
      setEventModalOpen(false)
      await reload()
    } catch (error) {
      toast.error(messageFrom(error, 'Unable to save club event.'))
    } finally {
      setSaving(false)
    }
  }

  async function submitAnnouncement(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await api.post('/club-announcements', {
        ...announcementForm,
        title: announcementForm.title.trim(),
        message: announcementForm.message.trim(),
      })
      toast.success('Club announcement posted.')
      setAnnouncementModalOpen(false)
      setAnnouncementForm(blankAnnouncement)
      await reload()
    } catch (error) {
      toast.error(messageFrom(error, 'Unable to post announcement.'))
    } finally {
      setSaving(false)
    }
  }

  function clubMembership(club) {
    return club.isMember
  }

  const eventList = activeTab === 'My Participation' ? participation : events

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-5 py-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
            Campus community
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Clubs & Activities
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
            Find your community, keep up with club events, and track your participation.
          </p>
        </div>
        {isManager && (
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-white text-slate-900 hover:bg-indigo-50"
              onClick={openCreateClub}
            >
              Create club
            </Button>
            <Button
              className="bg-white/10 text-white hover:bg-white/20"
              disabled={!managedClubs.length}
              onClick={() => openCreateEvent()}
            >
              Create event
            </Button>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {tabs.filter((tab) => tab !== 'My Participation' || isStudent).map((tab) => (
          <button
            aria-pressed={activeTab === tab}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
              activeTab === tab
                ? 'border-blue-700 text-blue-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
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
      ) : activeTab === 'Clubs' ? (
        <section className="space-y-4">
          {clubs.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clubs.map((club) => {
                const isMember = clubMembership(club)
                return (
                  <Card className="overflow-hidden p-0" key={club._id}>
                    {club.logo ? (
                      <img
                        alt={`${club.name} logo`}
                        className="h-40 w-full object-cover"
                        src={club.logo}
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 text-4xl font-bold text-indigo-800">
                        {club.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="space-y-3 p-5">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{club.name}</h2>
                        <p className="mt-1 text-xs text-slate-500">
                          Coordinator: {club.facultyCoordinator?.name || 'Faculty'}
                          {' · '}{club.memberCount || 0} members
                        </p>
                      </div>
                      <p className="min-h-12 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {club.description || 'No club description yet.'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {isStudent && (
                          <Button
                            onClick={() =>
                              perform(
                                () =>
                                  isMember
                                    ? api.delete(`/clubs/${club._id}/membership`)
                                    : api.post(`/clubs/${club._id}/join`),
                                'Unable to update club membership.',
                                isMember ? 'You left the club.' : 'You joined the club.',
                              )
                            }
                            variant={isMember ? 'secondary' : 'primary'}
                          >
                            {isMember ? 'Leave club' : 'Join club'}
                          </Button>
                        )}
                        {canManageClub(club) && (
                          <>
                            <Button onClick={() => openEditClub(club)} variant="secondary">
                              Edit
                            </Button>
                            <Button
                              onClick={() => openCreateEvent(club)}
                              variant="secondary"
                            >
                              Add event
                            </Button>
                            <Button
                              onClick={() => {
                                setAnnouncementForm({ ...blankAnnouncement, club: club._id })
                                setAnnouncementModalOpen(true)
                              }}
                              variant="secondary"
                            >
                              Post update
                            </Button>
                            <Button
                              onClick={() => {
                                if (!window.confirm(`Delete "${club.name}" and its events?`)) return
                                perform(
                                  () => api.delete(`/clubs/${club._id}`),
                                  'Unable to delete club.',
                                  'Club deleted.',
                                )
                              }}
                              variant="danger"
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <EmptyState
              title="No clubs yet"
              message="Clubs will appear here once they have been created."
            />
          )}
        </section>
      ) : activeTab === 'Club Events' || activeTab === 'My Participation' ? (
        <section className="space-y-4">
          {activeTab === 'Club Events' && (
            <div className="flex gap-2">
              {['upcoming', 'past'].map((value) => (
                <Button
                  aria-pressed={period === value}
                  key={value}
                  onClick={() => setPeriod(value)}
                  variant={period === value ? 'primary' : 'secondary'}
                >
                  {value === 'upcoming' ? 'Upcoming events' : 'Past events'}
                </Button>
              ))}
            </div>
          )}
          {eventList.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {eventList.map((event) => {
                const canManage = isManager && event.club && canManageClub(event.club)
                const registered = event.isRegistered ||
                  (activeTab === 'My Participation' && isStudent)
                return (
                  <Card className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between" key={event._id}>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                        {event.club?.name || 'Club'}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-slate-900">{event.title}</h2>
                      <p className="mt-1 text-sm font-medium text-slate-500">{formatDate(event.date)}</p>
                      {event.description && (
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {event.description}
                        </p>
                      )}
                      <p className="mt-3 text-xs text-slate-500">
                        {event.registrationCount ?? event.registrations?.length ?? 0} registered
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {isStudent && activeTab === 'Club Events' && period === 'upcoming' && (
                        <Button
                          onClick={() =>
                            perform(
                              () =>
                                registered
                                  ? api.delete(`/club-events/${event._id}/registration`)
                                  : api.post(`/club-events/${event._id}/register`),
                              'Unable to update event registration.',
                              registered ? 'Registration cancelled.' : 'You are registered.',
                            )
                          }
                          variant={registered ? 'secondary' : 'primary'}
                        >
                          {registered ? 'Cancel registration' : 'Register'}
                        </Button>
                      )}
                      {canManage && (
                        <>
                          <Button onClick={() => openEditEvent(event)} variant="secondary">
                            Edit
                          </Button>
                          <Button
                            onClick={() => {
                              if (!window.confirm(`Delete "${event.title}"?`)) return
                              perform(
                                () => api.delete(`/club-events/${event._id}`),
                                'Unable to delete event.',
                                'Event deleted.',
                              )
                            }}
                            variant="danger"
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <EmptyState
              title={activeTab === 'My Participation' ? 'No participation yet' : `No ${period} events`}
              message={
                activeTab === 'My Participation'
                  ? 'Events you register for will appear here.'
                  : 'Club events will appear here when they are scheduled.'
              }
            />
          )}
        </section>
      ) : (
        <section className="space-y-4">
          {isManager && managedClubs.length > 0 && (
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setAnnouncementForm({
                    ...blankAnnouncement,
                    club: managedClubs[0]._id,
                  })
                  setAnnouncementModalOpen(true)
                }}
              >
                Post announcement
              </Button>
            </div>
          )}
          {announcements.length ? (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <Card key={announcement._id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    {announcement.club?.name || 'Club'} · {formatDate(announcement.createdAt)}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">{announcement.title}</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                    {announcement.message}
                  </p>
                  <p className="mt-3 text-xs text-slate-400">
                    Posted by {announcement.createdBy?.name || 'Club coordinator'}
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No club announcements"
              message="Updates posted by club coordinators will appear here."
            />
          )}
        </section>
      )}

      <Modal
        isOpen={clubModalOpen}
        onClose={() => setClubModalOpen(false)}
        title={editingClub ? 'Edit club' : 'Create club'}
      >
        <form className="space-y-4" onSubmit={submitClub}>
          <Input
            id="club-name"
            label="Club name"
            maxLength={120}
            required
            value={clubForm.name}
            onChange={(event) => setClubForm({ ...clubForm, name: event.target.value })}
          />
          <label className="block text-sm font-medium text-slate-700" htmlFor="club-description">
            Description
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              id="club-description"
              maxLength={5000}
              value={clubForm.description}
              onChange={(event) => setClubForm({ ...clubForm, description: event.target.value })}
            />
          </label>
          {isSuperadmin && (
            <Select
              id="club-coordinator"
              label="Faculty coordinator"
              options={[
                { value: '', label: 'Select a faculty coordinator' },
                ...faculty.map((teacher) => ({
                  value: teacher._id,
                  label: teacher.name,
                })),
              ]}
              required
              value={clubForm.facultyCoordinator}
              onChange={(event) =>
                setClubForm({ ...clubForm, facultyCoordinator: event.target.value })
              }
            />
          )}
          <Input
            id="club-logo"
            label="Logo URL (optional)"
            type="url"
            value={clubForm.logo}
            onChange={(event) => setClubForm({ ...clubForm, logo: event.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setClubModalOpen(false)} variant="secondary">Cancel</Button>
            <Button disabled={saving} type="submit">{saving ? 'Saving…' : 'Save club'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        title={editingEvent ? 'Edit club event' : 'Create club event'}
      >
        <form className="space-y-4" onSubmit={submitEvent}>
          {!editingEvent && (
            <Select
              id="club-event-club"
              label="Club"
              options={managedClubs.map((club) => ({ value: club._id, label: club.name }))}
              required
              value={eventForm.club}
              onChange={(event) => setEventForm({ ...eventForm, club: event.target.value })}
            />
          )}
          <Input
            id="club-event-title"
            label="Event title"
            maxLength={150}
            required
            value={eventForm.title}
            onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })}
          />
          <Input
            id="club-event-date"
            label="Date"
            type="date"
            required
            value={eventForm.date}
            onChange={(event) => setEventForm({ ...eventForm, date: event.target.value })}
          />
          <label className="block text-sm font-medium text-slate-700" htmlFor="club-event-description">
            Description
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              id="club-event-description"
              maxLength={5000}
              value={eventForm.description}
              onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setEventModalOpen(false)} variant="secondary">Cancel</Button>
            <Button disabled={saving} type="submit">{saving ? 'Saving…' : 'Save event'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={announcementModalOpen}
        onClose={() => setAnnouncementModalOpen(false)}
        title="Post club announcement"
      >
        <form className="space-y-4" onSubmit={submitAnnouncement}>
          <Select
            id="club-announcement-club"
            label="Club"
            options={managedClubs.map((club) => ({ value: club._id, label: club.name }))}
            required
            value={announcementForm.club}
            onChange={(event) =>
              setAnnouncementForm({ ...announcementForm, club: event.target.value })
            }
          />
          <Input
            id="club-announcement-title"
            label="Title"
            maxLength={150}
            required
            value={announcementForm.title}
            onChange={(event) =>
              setAnnouncementForm({ ...announcementForm, title: event.target.value })
            }
          />
          <label className="block text-sm font-medium text-slate-700" htmlFor="club-announcement-message">
            Message
            <textarea
              className="mt-1 min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              id="club-announcement-message"
              maxLength={5000}
              required
              value={announcementForm.message}
              onChange={(event) =>
                setAnnouncementForm({ ...announcementForm, message: event.target.value })
              }
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setAnnouncementModalOpen(false)} variant="secondary">Cancel</Button>
            <Button disabled={saving} type="submit">{saving ? 'Posting…' : 'Post announcement'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ClubsPage
