import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import useAuth from '../../context/useAuth'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Modal from '../ui/Modal'

const profileFields = [
  { key: 'mobileNumber', label: 'Mobile number', type: 'tel', maxLength: 20 },
  { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
  { key: 'bloodGroup', label: 'Blood group', type: 'select' },
  { key: 'fatherName', label: "Father's name", type: 'text', maxLength: 100 },
  { key: 'motherName', label: "Mother's name", type: 'text', maxLength: 100 },
  { key: 'guardianName', label: 'Parent / guardian name', type: 'text', maxLength: 100 },
  { key: 'guardianPhone', label: 'Parent / guardian phone', type: 'tel', maxLength: 20 },
  { key: 'currentAddress', label: 'Current address', type: 'textarea', wide: true },
  { key: 'permanentAddress', label: 'Permanent address', type: 'textarea', wide: true },
  { key: 'class10Board', label: 'Class 10 board', type: 'text', maxLength: 100 },
  { key: 'class10Percentage', label: 'Class 10 percentage', type: 'number', min: 0, max: 100 },
  { key: 'class12Board', label: 'Class 12 board', type: 'text', maxLength: 100 },
  { key: 'class12Percentage', label: 'Class 12 percentage', type: 'number', min: 0, max: 100 },
  { key: 'favoriteSports', label: 'Favorite sports', type: 'text', maxLength: 200 },
  { key: 'hobbies', label: 'Hobbies', type: 'text', maxLength: 200 },
]

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const emptyProfile = Object.fromEntries(profileFields.map(({ key }) => [key, '']))
const profileGroups = [
  { title: 'Personal', fields: profileFields.slice(0, 3) },
  { title: 'Family', fields: profileFields.slice(3, 7) },
  { title: 'Addresses', fields: profileFields.slice(7, 9) },
  { title: 'Education', fields: profileFields.slice(9, 13) },
  { title: 'Interests', fields: profileFields.slice(13) },
]

function isFilled(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

function dateValue(value) {
  return value ? String(value).slice(0, 10) : ''
}

function displayProfileValue(key, value) {
  if (key === 'dateOfBirth') {
    return new Date(`${dateValue(value)}T12:00:00`).toLocaleDateString()
  }
  if (key.endsWith('Percentage')) return `${value}%`
  return String(value)
}

function StudentProfileCard() {
  const { user, updateStudentProfile } = useAuth()
  const [profile, setProfile] = useState({
    ...emptyProfile,
    ...user.studentProfile,
    dateOfBirth: dateValue(user.studentProfile?.dateOfBirth),
  })
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const completedCount = useMemo(
    () => profileFields.filter(({ key }) => isFilled(profile[key])).length,
    [profile],
  )
  const completion = Math.round((completedCount / profileFields.length) * 100)
  const missingFields = profileFields
    .filter(({ key }) => !isFilled(profile[key]))
    .slice(0, 3)
    .map(({ label }) => label.toLowerCase())

  function updateField(key, value) {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setFormError('')

    try {
      const savedUser = await updateStudentProfile(profile)
      setProfile({
        ...emptyProfile,
        ...savedUser.studentProfile,
        dateOfBirth: dateValue(savedUser.studentProfile?.dateOfBirth),
      })
      setIsOpen(false)
      toast.success('Your student details have been saved.')
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to save your student details.'
      setFormError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  function renderField(field) {
    const value = profile[field.key] ?? ''
    const controlClassName =
      'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-[#2b2e36] dark:bg-[#101216] dark:text-[#f1f3f6]'

    return (
      <label
        className={`block text-sm font-medium text-slate-700 dark:text-[#d1d6e0] ${field.wide ? 'sm:col-span-2' : ''}`}
        htmlFor={`student-profile-${field.key}`}
        key={field.key}
      >
        {field.label}
        {field.type === 'textarea' ? (
          <textarea
            className={controlClassName}
            id={`student-profile-${field.key}`}
            maxLength={500}
            rows={2}
            value={value}
            onChange={(event) => updateField(field.key, event.target.value)}
          />
        ) : field.type === 'select' ? (
          <select
            className={controlClassName}
            id={`student-profile-${field.key}`}
            value={value}
            onChange={(event) => updateField(field.key, event.target.value)}
          >
            <option value="">Select blood group</option>
            {bloodGroups.map((bloodGroup) => (
              <option key={bloodGroup} value={bloodGroup}>
                {bloodGroup}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={controlClassName}
            id={`student-profile-${field.key}`}
            max={field.max}
            maxLength={field.maxLength}
            min={field.min}
            step={field.type === 'number' ? 'any' : undefined}
            type={field.type}
            value={value}
            onChange={(event) => updateField(field.key, event.target.value)}
          />
        )}
      </label>
    )
  }

  return (
    <>
      <Card>
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Student details</h2>
              <p className="mt-1 text-sm text-slate-500">
                {completion === 100
                  ? 'Your profile is complete.'
                  : `${profileFields.length - completedCount} details left to complete your profile.`}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-[#1f2229] dark:text-[#d1d6e0]">
              {completion}%
            </span>
          </div>
          <div
            aria-label={`Profile ${completion}% complete`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={completion}
            className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-[#181b22]"
            role="progressbar"
          >
            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${completion}%` }} />
          </div>
          {missingFields.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              Next: {missingFields.join(', ')}
            </p>
          )}
          <Button className="mt-4" onClick={() => setIsOpen(true)} variant="secondary">
            {completion === 100 ? 'Update details' : 'Complete profile'}
          </Button>
        </div>
      </Card>

      {completedCount > 0 && (
        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Details you’ve filled in</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your saved student information.
            </p>
          </div>
          {profileGroups.map(({ title, fields }) => {
            const filledFields = fields.filter(({ key }) => isFilled(profile[key]))
            if (!filledFields.length) return null

            return (
              <section className="space-y-3" key={title}>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-[#d1d6e0]">{title}</h3>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filledFields.map(({ key, label }) => (
                    <div className="rounded-xl bg-slate-50 p-3 dark:border dark:border-[#20232a] dark:bg-[#101216]" key={key}>
                      <dt className="text-xs font-medium text-slate-500 dark:text-[#8a919e]">{label}</dt>
                      <dd className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-[#f1f3f6]">
                        {displayProfileValue(key, profile[key])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )
          })}
        </Card>
      )}

      <Modal
        className="max-h-[85svh] overflow-y-auto"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Student details"
      >
        <p className="mb-5 text-sm text-slate-500 dark:text-[#8a919e]">
          Add your contact, family, education, and interests. You can save what you have and complete the rest later.
        </p>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-[#f1f3f6]">Personal and family</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {profileFields.slice(0, 9).map(renderField)}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-[#f1f3f6]">Education and interests</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {profileFields.slice(9).map(renderField)}
            </div>
          </div>
          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button disabled={saving} onClick={() => setIsOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={saving} type="submit">
              {saving ? 'Saving…' : 'Save details'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default StudentProfileCard
