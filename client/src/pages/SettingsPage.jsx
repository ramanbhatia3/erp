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
  passingPercentage: 40,
}

const marksFormula = [
  { name: 'MST average', detail: 'Average of MST 1 and MST 2; rounded up', maxMarks: 24 },
  { name: 'Assignment average', detail: 'Average of 3 assignments; rounded up', maxMarks: 10 },
  { name: 'Attendance', detail: 'Attendance score; rounded up', maxMarks: 6 },
  { name: 'Final exam', detail: 'Final exam score; rounded up', maxMarks: 60 },
]

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

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)

    try {
      const payload = {
        attendanceThreshold: Number(settings.attendanceThreshold),
        passingPercentage: Number(settings.passingPercentage),
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#f1f3f6]">University Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
          Configure academic defaults and review the fixed 100-mark grading formula.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card className="space-y-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-[#f1f3f6]">Academic settings</h2>
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
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700 dark:text-[#d1d6e0]">Current academic year</p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-[#242730] dark:bg-[#101216] dark:text-[#f1f3f6]">
                {settings.currentAcademicYear}
              </p>
              <p className="text-xs text-slate-500 dark:text-[#8a919e]">
                Calculated automatically for the July–June academic cycle.
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-[#f1f3f6]">Marks formula</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
              Marks are rounded up to the next whole number, including fractional scores.
            </p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-[#242730]">
            {marksFormula.map((item) => (
              <div className="flex items-center justify-between gap-4 py-3" key={item.name}>
                <div>
                  <p className="font-medium text-slate-800 dark:text-[#f1f3f6]">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">{item.detail}</p>
                </div>
                <p className="whitespace-nowrap font-semibold text-slate-900 dark:text-[#f1f3f6]">
                  {item.maxMarks} marks
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between py-3 font-semibold text-slate-900 dark:text-[#f1f3f6]">
              <p>Total</p>
              <p>100 marks</p>
            </div>
          </div>
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
