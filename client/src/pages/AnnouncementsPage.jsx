import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import useAuth from '../context/useAuth'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import Loader from '../components/ui/Loader'
import Select from '../components/ui/Select'

const emptyForm = { title: '', message: '', visibility: '', department: '', class: '' }

function messageFrom(error, fallback) {
  return error.response?.data?.message || fallback
}

function AnnouncementsPage() {
  const { user } = useAuth()
  const canPost = ['superadmin', 'teacher'].includes(user.role)
  const isClassAdvisor = user.role === 'teacher' && user.isClassAdvisor
  const [announcements, setAnnouncements] = useState([])
  const [departments, setDepartments] = useState([])
  const [classes, setClasses] = useState([])
  const [form, setForm] = useState({
    ...emptyForm,
    visibility: isClassAdvisor
      ? 'class'
      : user.role === 'superadmin'
        ? 'university'
        : 'department',
    department: user.department || '',
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    const requests = [api.get('/announcements')]

    if (canPost) {
      requests.push(api.get('/departments'), api.get('/classes'))
    }

    Promise.all(requests)
      .then(([announcementResponse, departmentResponse, classResponse]) => {
        if (!active) return

        setAnnouncements(announcementResponse.data.announcements)
        if (canPost) {
          setDepartments(departmentResponse.data.departments)
          const availableClasses = classResponse.data.classes
          setClasses(
            isClassAdvisor
              ? availableClasses.filter(
                  (item) => item.advisor?._id === user.id,
                )
              : availableClasses,
          )
        }
      })
      .catch((error) => {
        if (active) {
          const message = messageFrom(error, 'Unable to load announcements.')
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
  }, [canPost, isClassAdvisor, user.id])

  const visibilityOptions = useMemo(() => {
    if (isClassAdvisor) return [{ value: 'class', label: 'My class' }]
    if (user.role === 'superadmin') {
      return [
        { value: 'university', label: 'University' },
        { value: 'department', label: 'Department' },
        { value: 'class', label: 'Class' },
      ]
    }
    return [
      { value: 'department', label: 'Department' },
      { value: 'class', label: 'Class' },
    ]
  }, [isClassAdvisor, user.role])

  const sortedAnnouncements = useMemo(
    () =>
      [...announcements].sort(
        (first, second) =>
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime(),
      ),
    [announcements],
  )

  function updateForm(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
      ...(event.target.name === 'visibility'
        ? {
            department: user.role === 'teacher' ? user.department || '' : '',
            class: '',
          }
        : {}),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)

    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      visibility: form.visibility,
    }
    if (form.visibility === 'department') payload.department = form.department
    if (form.visibility === 'class') payload.class = form.class

    try {
      const response = await api.post('/announcements', payload)
      setAnnouncements((current) => [response.data.announcement, ...current])
      setForm({
        ...emptyForm,
        visibility: isClassAdvisor
          ? 'class'
          : user.role === 'superadmin'
            ? 'university'
            : 'department',
        department: user.department || '',
      })
      toast.success('Announcement posted.')
    } catch (error) {
      toast.error(messageFrom(error, 'Unable to post announcement.'))
    } finally {
      setSaving(false)
    }
  }

  function scopeLabel(announcement) {
    if (announcement.visibility === 'university') return 'University'
    if (announcement.visibility === 'department') {
      return announcement.department?.name || 'Department'
    }
    const className = announcement.class
      ? `${announcement.class.name} · ${announcement.class.section}`
      : 'Class'
    return className
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {user.role === 'student' || user.role === 'placementAdmin'
            ? 'Notices'
            : 'Announcements'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {canPost
            ? 'Share updates with the right university community.'
            : 'Announcements relevant to you.'}
        </p>
      </div>

      {canPost && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Post an announcement
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              id="announcement-title"
              label="Title"
              name="title"
              maxLength={150}
              required
              value={form.title}
              onChange={updateForm}
            />
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="announcement-message"
            >
              Message
              <textarea
                className="mt-1 min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                id="announcement-message"
                name="message"
                maxLength={5000}
                required
                value={form.message}
                onChange={updateForm}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                id="announcement-visibility"
                label="Visibility"
                name="visibility"
                options={visibilityOptions}
                value={form.visibility}
                onChange={updateForm}
              />
              {form.visibility === 'department' && (
                <Select
                  id="announcement-department"
                  label="Department"
                  name="department"
                  options={[
                    { value: '', label: 'Select a department' },
                    ...departments.map((item) => ({
                      value: item._id,
                      label: item.name,
                    })),
                  ]}
                  required
                  value={form.department}
                  onChange={updateForm}
                  disabled={user.role === 'teacher'}
                />
              )}
              {form.visibility === 'class' && (
                <Select
                  id="announcement-class"
                  label="Class"
                  name="class"
                  options={[
                    {
                      value: '',
                      label: classes.length
                        ? 'Select a class'
                        : 'No eligible classes available',
                    },
                    ...classes.map((item) => ({
                      value: item._id,
                      label: `${item.name} · ${item.section} · ${item.department?.name || ''}`,
                    })),
                  ]}
                  required
                  value={form.class}
                  onChange={updateForm}
                />
              )}
            </div>
            <Button
              disabled={
                saving ||
                (form.visibility === 'department' && !form.department) ||
                (form.visibility === 'class' && !form.class)
              }
              type="submit"
            >
              {saving ? 'Posting…' : 'Post announcement'}
            </Button>
          </form>
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Recent announcements
        </h2>
        {loading ? (
          <Loader />
        ) : loadError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            {loadError}
          </p>
        ) : sortedAnnouncements.length === 0 ? (
          <EmptyState
            title="No announcements yet"
            message="Announcements for your university, department, or class will appear here."
          />
        ) : (
          sortedAnnouncements.map((announcement) => (
            <Card key={announcement._id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {announcement.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Posted by {announcement.createdBy?.name || 'University'}
                    {' · '}
                    <time dateTime={announcement.createdAt}>
                      {new Date(announcement.createdAt).toLocaleString()}
                    </time>
                  </p>
                </div>
                <Badge color="blue">{scopeLabel(announcement)}</Badge>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {announcement.message}
              </p>
            </Card>
          ))
        )}
      </section>
    </div>
  )
}

export default AnnouncementsPage
