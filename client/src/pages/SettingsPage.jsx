import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import Loader from '../components/ui/Loader'

const defaultSettings = {
  attendanceThreshold: 75,
  marksComponents: [
    { name: 'MST-1', maxMarks: 24 },
    { name: 'MST-2', maxMarks: 24 },
    { name: 'Assignment', maxMarks: 10 },
    { name: 'Attendance', maxMarks: 6 },
    { name: 'Final', maxMarks: 100 },
  ],
  passingPercentage: 40,
  currentAcademicYear: '2026-27',
  currentSemester: 1,
}

function SettingsPage() {
  const [settings, setSettings] = useState(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    api.get('/settings')
      .then((response) => {
        if (active) {
          setSettings(response.data.settings)
          setLoadError('')
        }
      })
      .catch((error) => {
        if (active) {
          const message =
            error.response?.data?.message || 'Unable to load university settings.'
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

  function updateField(event) {
    const { name, value } = event.target
    setSettings((current) => ({ ...current, [name]: value }))
  }

  function updateComponent(index, field, value) {
    setSettings((current) => ({
      ...current,
      marksComponents: current.marksComponents.map((component, componentIndex) =>
        componentIndex === index
          ? { ...component, [field]: value }
          : component,
      ),
    }))
  }

  function addComponent() {
    setSettings((current) => ({
      ...current,
      marksComponents: [...current.marksComponents, { name: '', maxMarks: 100 }],
    }))
  }

  function removeComponent(index) {
    setSettings((current) => ({
      ...current,
      marksComponents: current.marksComponents.filter(
        (_, componentIndex) => componentIndex !== index,
      ),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)

    try {
      const payload = {
        ...settings,
        attendanceThreshold: Number(settings.attendanceThreshold),
        passingPercentage: Number(settings.passingPercentage),
        currentSemester: Number(settings.currentSemester),
        marksComponents: settings.marksComponents.map((component) => ({
          name: component.name.trim(),
          maxMarks: Number(component.maxMarks),
        })),
      }
      const response = await api.put('/settings', payload)
      setSettings(response.data.settings)
      toast.success(response.data.message)
    } catch (error) {
      toast.error(
        error.response?.data?.errors?.[0]?.msg ||
          error.response?.data?.message ||
          'Unable to save university settings.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <Loader label="Loading settings..." />
      </Card>
    )
  }

  if (loadError) {
    return (
      <EmptyState
        title="Unable to load settings"
        message={loadError}
        action={
          <Button
            onClick={() => {
              setLoading(true)
              setLoadError('')
              api.get('/settings')
                .then((response) => setSettings(response.data.settings))
                .catch((error) => {
                  const message =
                    error.response?.data?.message || 'Unable to load university settings.'
                  setLoadError(message)
                  toast.error(message)
                })
                .finally(() => setLoading(false))
            }}
          >
            Try again
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">University Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure academic defaults and marks components.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card className="space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">Academic settings</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="attendance-threshold"
              name="attendanceThreshold"
              label="Attendance threshold (%)"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={settings.attendanceThreshold}
              onChange={updateField}
              required
            />
            <Input
              id="passing-percentage"
              name="passingPercentage"
              label="Passing percentage (%)"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={settings.passingPercentage}
              onChange={updateField}
              required
            />
            <Input
              id="academic-year"
              name="currentAcademicYear"
              label="Current academic year"
              placeholder="e.g. 2026-27"
              maxLength={20}
              value={settings.currentAcademicYear}
              onChange={updateField}
              required
            />
            <Input
              id="current-semester"
              name="currentSemester"
              label="Current semester"
              type="number"
              min="1"
              max="12"
              step="1"
              value={settings.currentSemester}
              onChange={updateField}
              required
            />
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Marks components</h2>
              <p className="mt-1 text-sm text-slate-500">
                Add or remove assessment components and their maximum marks.
              </p>
            </div>
            <Button onClick={addComponent} disabled={settings.marksComponents.length >= 30}>
              Add component
            </Button>
          </div>

          <div className="space-y-3">
            {settings.marksComponents.map((component, index) => (
              <div
                className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end"
                key={index}
              >
                <Input
                  id={`component-name-${index}`}
                  label="Component name"
                  value={component.name}
                  onChange={(event) =>
                    updateComponent(index, 'name', event.target.value)
                  }
                  maxLength={50}
                  required
                />
                <Input
                  id={`component-marks-${index}`}
                  label="Maximum marks"
                  type="number"
                  min="0.01"
                  max="1000"
                  step="0.01"
                  value={component.maxMarks}
                  onChange={(event) =>
                    updateComponent(index, 'maxMarks', event.target.value)
                  }
                  required
                />
                <Button
                  className="w-full sm:w-auto"
                  variant="danger"
                  onClick={() => removeComponent(index)}
                  disabled={settings.marksComponents.length <= 1}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          {settings.marksComponents.length <= 1 && (
            <p className="text-xs text-slate-500">
              At least one marks component is required.
            </p>
          )}
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving settings...' : 'Save settings'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default SettingsPage
