import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import Loader from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'
import Table from '../components/ui/Table'
import { getSemesterTerm } from '../utils/classDisplay'

const blankForm = {
  name: '',
  email: '',
  role: 'student',
  department: '',
  class: '',
  section: '',
  rollNo: '',
  startingYear: '',
  password: '',
  confirmPassword: '',
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback
}

function StudentUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const isAddingFromClass = searchParams.get('add') === '1'
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState(() => searchParams.get('department') || '')
  const [classFilter, setClassFilter] = useState(() => searchParams.get('class') || '')
  const [activeFilter, setActiveFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState(() => ({
    ...blankForm,
    role: 'student',
    department: searchParams.get('department') || '',
    class: searchParams.get('class') || '',
  }))
  const [saving, setSaving] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [removingStudent, setRemovingStudent] = useState(null)
  const [removingFromClass, setRemovingFromClass] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkFile, setBulkFile] = useState(null)
  const [bulkCredentials, setBulkCredentials] = useState([])
  const [bulkError, setBulkError] = useState('')
  const [uploading, setUploading] = useState(false)

  const userParams = useMemo(() => {
    const params = { role: 'student' }
    if (departmentFilter) params.department = departmentFilter
    if (classFilter) params.class = classFilter
    if (search.trim()) params.search = search.trim()
    if (activeFilter) params.active = activeFilter
    return params
  }, [departmentFilter, classFilter, search, activeFilter])

  useEffect(() => {
    let active = true
    Promise.all([api.get('/departments'), api.get('/classes')])
      .then(([departmentResponse, classResponse]) => {
        if (!active) return
        setDepartments(departmentResponse.data.departments)
        setClasses(classResponse.data.classes)
        setLoadError('')
      })
      .catch((error) => {
        if (!active) return
        const message = getErrorMessage(error, 'Unable to load student management data.')
        setLoadError(message)
        toast.error(message)
      })

    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    api.get('/users', { params: userParams })
      .then((response) => {
        if (active) setUsers(response.data.users)
      })
      .catch((error) => {
        if (active) {
          const message = getErrorMessage(error, 'Unable to load students.')
          setLoadError(message)
          toast.error(message)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [userParams])

  async function refreshUsers() {
    setLoading(true)
    setLoadError('')
    try {
      const response = await api.get('/users', { params: userParams })
      setUsers(response.data.users)
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load students.')
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  function updateFilter(setter, value) {
    setLoading(true)
    setLoadError('')
    setter(value)
  }

  const filteredClasses = useMemo(
    () => classes.filter((item) => !departmentFilter || item.department?._id === departmentFilter),
    [classes, departmentFilter],
  )

  const classesForForm = useMemo(
    () => classes.filter((item) => item.department?._id === form.department),
    [classes, form.department],
  )

  function openCreate() {
    setEditingUser(null)
    setCreatedCredentials(null)
    setForm({
      ...blankForm,
      role: 'student',
      department: departmentFilter,
      class: classFilter,
    })
    setModalOpen(true)
  }

  function closeUserModal() {
    if (saving) return
    setModalOpen(false)
    setCreatedCredentials(null)
    if (searchParams.has('add')) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('add')
      setSearchParams(nextParams, { replace: true })
    }
  }

  function openEdit(user) {
    setEditingUser(user)
    setCreatedCredentials(null)
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department?._id || '',
      class: user.class?._id || '',
      section: user.section || '',
      rollNo: user.rollNo || '',
      startingYear: String(user.startingYear || ''),
      password: '',
      confirmPassword: '',
    })
    setModalOpen(true)
  }

  function updateForm(event) {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'department' ? { class: '' } : {}),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const hasPasswordInput = Boolean(form.password || form.confirmPassword)
    if (editingUser ? hasPasswordInput && form.password !== form.confirmPassword : form.password !== form.confirmPassword) {
      toast.error('The passwords do not match.')
      return
    }

    if (!form.class || !form.rollNo.trim()) {
      toast.error('Select a class and enter the student roll number.')
      return
    }

    setSaving(true)
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      department: form.department,
      class: form.class,
      ...(form.section.trim() ? { section: form.section.trim() } : {}),
      rollNo: form.rollNo.trim(),
      startingYear: Number(form.startingYear),
      ...(editingUser && form.password ? { password: form.password } : {}),
    }

    try {
      if (editingUser) {
        const response = await api.put(`/users/${editingUser._id}`, payload)
        toast.success('Student updated.')
        setModalOpen(false)
        setUsers((current) => current.map((item) => item._id === editingUser._id ? response.data.user : item))
      } else {
        const response = await api.post('/users', {
          ...payload,
          role: 'student',
          password: form.password,
        })
        setCreatedCredentials({
          name: response.data.user.name,
          email: response.data.user.email,
          password: form.password,
        })
        toast.success('Student created.')
        refreshUsers()
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to save student.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveFromClass() {
    if (!removingStudent) return
    setRemovingFromClass(true)
    try {
      const response = await api.patch(`/users/${removingStudent._id}/remove-from-class`)
      setUsers((current) => current.map((item) => item._id === removingStudent._id ? response.data.user : item))
      setRemovingStudent(null)
      toast.success('Student removed from the class.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to remove the student from this class.'))
    } finally {
      setRemovingFromClass(false)
    }
  }

  async function handleCsvUpload(event) {
    event.preventDefault()
    if (!bulkFile) {
      setBulkError('Choose a CSV file first.')
      return
    }

    setUploading(true)
    setBulkError('')
    const data = new FormData()
    data.append('file', bulkFile)

    try {
      const response = await api.post('/users/students/upload', data)
      setBulkCredentials(response.data.users)
      toast.success(response.data.message)
      refreshUsers()
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to upload student CSV.')
      setBulkError(message)
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'department',
      label: 'Department',
      render: (user) => user.department?.name || '—',
    },
    {
      key: 'class',
      label: 'Class / Section',
      render: (user) => `${user.class?.name || '—'} / ${user.section || '—'}`,
    },
    {
      key: 'rollNo',
      label: 'Roll No.',
      render: (user) => user.rollNo || '—',
    },
    {
      key: 'academicProgress',
      label: 'Academic progress',
      render: (user) => user.academicStatus === 'alumni'
        ? <Badge color="blue">Alumni · Sem 8 complete</Badge>
        : user.academicStatus === 'notStarted'
          ? `Semester 1 starts August ${user.startingYear}`
        : user.currentSemester
          ? `Semester ${user.currentSemester} · Started ${user.startingYear}`
          : 'Starting year unavailable',
    },
    {
      key: 'status',
      label: 'Status',
      render: (user) => (
        <Badge color={user.isActive ? 'green' : 'red'}>
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (user) => (
        <div className="flex flex-wrap gap-2">
          <Button className="px-3 py-1.5" variant="secondary" onClick={() => openEdit(user)}>
            Edit
          </Button>
          {user.class && (
            <Button className="px-3 py-1.5" variant="danger" onClick={() => setRemovingStudent(user)}>
              Remove
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Student Management</h1>
            <p className="mt-1 text-sm text-slate-500">
              Semester 1 starts in August; students advance each January and July and become alumni after semester 8.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => { setBulkOpen(true); setBulkCredentials([]); setBulkError('') }}>
              Bulk upload students
            </Button>
            <Button onClick={openCreate}>Add Student</Button>
          </div>
        </div>

        <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input id="student-search" label="Search" type="search" placeholder="Name, email, roll no..." value={search} onChange={(event) => updateFilter(setSearch, event.target.value)} />
          <Select
            id="student-department-filter"
            label="Department"
            value={departmentFilter}
            onChange={(event) => { updateFilter(setDepartmentFilter, event.target.value); setClassFilter('') }}
            options={[
              { value: '', label: 'All departments' },
              ...departments.map((item) => ({ value: item._id, label: item.name })),
            ]}
          />
          <Select
            id="student-class-filter"
            label="Class"
            value={classFilter}
            onChange={(event) => updateFilter(setClassFilter, event.target.value)}
            disabled={!departmentFilter}
            options={[
              { value: '', label: departmentFilter ? 'All classes' : 'Choose department first' },
              ...filteredClasses.map((item) => ({
                value: item._id,
                label: `${item.name} · Sem ${item.semester} · ${getSemesterTerm(item.semester)}`,
              })),
            ]}
          />
          <Select
            id="student-status-filter"
            label="Account status"
            value={activeFilter}
            onChange={(event) => updateFilter(setActiveFilter, event.target.value)}
            options={[
              { value: 'true', label: 'Active accounts' },
              { value: 'false', label: 'Inactive accounts' },
              { value: '', label: 'All accounts' },
            ]}
          />
        </Card>

        {loading ? (
          <Card><Loader label="Loading students..." /></Card>
        ) : loadError ? (
          <EmptyState title="Unable to load students" message={loadError} action={<Button onClick={refreshUsers}>Try again</Button>} />
        ) : users.length ? (
          <Card className="overflow-hidden p-0">
            <Table columns={columns} rows={users} getRowKey={(user) => user._id} />
          </Card>
        ) : (
          <EmptyState title="No students found" message="Try adjusting the filters or add a new student." />
        )}
      </section>

      <Modal
        isOpen={modalOpen || isAddingFromClass}
        onClose={closeUserModal}
        title={createdCredentials ? 'Student created' : editingUser ? 'Edit Student' : 'Add Student'}
      >
        {createdCredentials ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Share this password securely. Only an admin can change it later.</p>
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
              <p><span className="font-medium">Name:</span> {createdCredentials.name}</p>
              <p><span className="font-medium">Email:</span> {createdCredentials.email}</p>
              <p className="break-all"><span className="font-medium">Initial password:</span> <code>{createdCredentials.password}</code></p>
            </div>
            <div className="flex justify-end">
              <Button onClick={closeUserModal}>Done</Button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input id="managed-student-name" label="Full name" name="name" value={form.name} onChange={updateForm} required maxLength={100} />
            <Input id="managed-student-email" label="Email" name="email" type="email" value={form.email} onChange={updateForm} required />
            {editingUser && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="managed-student-edit-password" label="New password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={form.password} onChange={updateForm} placeholder="Leave blank to keep current password" />
                <Input id="managed-student-edit-confirm-password" label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={form.confirmPassword} onChange={updateForm} placeholder="Leave blank to keep current password" />
              </div>
            )}
            <Select
              id="managed-student-department"
              label="Department"
              name="department"
              value={form.department}
              onChange={updateForm}
              required
              options={[
                { value: '', label: 'Select department' },
                ...departments.map((item) => ({ value: item._id, label: item.name })),
              ]}
            />
            <Select
              id="managed-student-class"
              label="Class"
              name="class"
              value={form.class}
              onChange={updateForm}
              required={!editingUser || Boolean(editingUser.class)}
              disabled={!form.department}
              options={[
                { value: '', label: 'Select class' },
                ...classesForForm.map((item) => ({
                  value: item._id,
                  label: `${item.name} · Sem ${item.semester} · ${getSemesterTerm(item.semester)}`,
                })),
              ]}
            />
            <p className="text-sm text-slate-500">
              The selected class identifies the program. The student’s starting year determines their semester and assigned class.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="managed-student-section" label="Student section (optional)" name="section" value={form.section} onChange={updateForm} maxLength={20} />
              <Input id="managed-student-roll" label="Roll number" name="rollNo" value={form.rollNo} onChange={updateForm} required={!editingUser || Boolean(editingUser.class)} maxLength={30} />
            </div>
            <Input
              id="managed-student-starting-year"
              label="Year semester 1 starts (August)"
              name="startingYear"
              type="number"
              min="2000"
              max="2100"
              step="1"
              value={form.startingYear}
              onChange={updateForm}
              required
            />
            {!editingUser && (
              <>
                <Input id="managed-student-password" label="Initial password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={form.password} onChange={updateForm} required />
                <Input id="managed-student-confirm-password" label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={form.confirmPassword} onChange={updateForm} required />
              </>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={closeUserModal} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingUser ? 'Save changes' : 'Create student'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={bulkOpen}
        onClose={() => !uploading && (setBulkOpen(false), setBulkCredentials([]))}
        title={bulkCredentials.length ? 'Student accounts created' : 'Bulk upload students'}
      >
        {bulkCredentials.length ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Save these generated passwords now. They are only displayed for this upload.</p>
            <div className="max-h-80 space-y-3 overflow-auto">
              {bulkCredentials.map((credential) => (
                <div className="rounded-lg bg-slate-50 p-3 text-sm" key={credential.id}>
                  <p className="font-medium text-slate-900">{credential.name}</p>
                  <p className="text-slate-600">{credential.email}</p>
                  <p className="break-all text-slate-700">Password: <code>{credential.defaultPassword}</code></p>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => { setBulkOpen(false); setBulkCredentials([]); setBulkFile(null) }}>Done</Button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleCsvUpload}>
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">CSV format</p>
              <p className="mt-1">Use this exact header row:</p>
              <code className="mt-2 block overflow-x-auto whitespace-nowrap text-xs">
                name,email,departmentCode,className,semester,section,academicYear,rollNo,startingYear
              </code>
              <p className="mt-2">Use an existing department code and class name. Semester must be 1–8; startingYear is the calendar year in which semester 1 begins in August. The class is matched by department, name, semester, and academic year; the student is then assigned to the class matching their starting-year semester and program. The optional section is student information. One student per row; maximum 500 rows.</p>
            </div>
            <Input id="student-csv-file" label="Student CSV file" type="file" accept=".csv,text/csv" onChange={(event) => { setBulkFile(event.target.files?.[0] || null); setBulkError('') }} required />
            {bulkError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{bulkError}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setBulkOpen(false)} disabled={uploading}>Cancel</Button>
              <Button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload students'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(removingStudent)}
        onClose={() => !removingFromClass && setRemovingStudent(null)}
        onConfirm={handleRemoveFromClass}
        title="Remove student from class?"
        message={`${removingStudent?.name || 'This student'} will be unassigned from the class. Their existing attendance and marks will be kept.`}
        confirmLabel="Remove from class"
        busy={removingFromClass}
      />
    </div>
  )
}

export default StudentUsersPage
