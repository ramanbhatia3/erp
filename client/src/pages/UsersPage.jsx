import { useEffect, useMemo, useState } from 'react'
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

const blankForm = {
  name: '',
  email: '',
  role: 'teacher',
  department: '',
  class: '',
  section: '',
  rollNo: '',
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback
}

function UsersPage() {
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('true')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState(blankForm)
  const [saving, setSaving] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkFile, setBulkFile] = useState(null)
  const [bulkCredentials, setBulkCredentials] = useState([])
  const [bulkError, setBulkError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deactivatingUser, setDeactivatingUser] = useState(null)
  const [deactivating, setDeactivating] = useState(false)
  const [advisorSelections, setAdvisorSelections] = useState({})
  const [savingAdvisorId, setSavingAdvisorId] = useState('')

  const userParams = useMemo(() => {
    const params = {}
    if (roleFilter) params.role = roleFilter
    if (departmentFilter) params.department = departmentFilter
    if (classFilter) params.class = classFilter
    if (search.trim()) params.search = search.trim()
    if (activeFilter) params.active = activeFilter

    return params
  }, [roleFilter, departmentFilter, classFilter, search, activeFilter])

  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/departments'),
      api.get('/classes'),
      api.get('/users/teachers'),
    ])
      .then(([departmentResponse, classResponse, teacherResponse]) => {
        if (!active) return
        setDepartments(departmentResponse.data.departments)
        setClasses(classResponse.data.classes)
        setTeachers(teacherResponse.data.teachers)
        setAdvisorSelections(
          Object.fromEntries(
            classResponse.data.classes.map((item) => [
              item._id,
              item.advisor?._id || '',
            ]),
          ),
        )
        setLoadError('')
      })
      .catch((error) => {
        if (active) {
          const message = getErrorMessage(error, 'Unable to load user management data.')
          setLoadError(message)
          toast.error(message)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    api.get('/users', { params: userParams })
      .then((response) => {
        if (active) setUsers(response.data.users)
      })
      .catch((error) => {
        if (active) {
          const message = getErrorMessage(error, 'Unable to load users.')
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
  }, [userParams])

  async function refreshUsers() {
    setLoading(true)
    setLoadError('')
    try {
      const response = await api.get('/users', { params: userParams })
      setUsers(response.data.users)
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load users.')
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
    setForm({ ...blankForm, department: departmentFilter })
    setModalOpen(true)
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
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      department: form.department,
      ...(form.role === 'student'
        ? {
            class: form.class,
            section: form.section.trim(),
            rollNo: form.rollNo.trim(),
          }
        : {}),
    }

    try {
      if (editingUser) {
        const response = await api.put(`/users/${editingUser._id}`, payload)
        toast.success('User updated.')
        setModalOpen(false)
        setUsers((current) =>
          current.map((item) => item._id === editingUser._id ? response.data.user : item),
        )
      } else {
        const response = await api.post('/users', { ...payload, role: form.role })
        setCreatedCredentials({
          name: response.data.user.name,
          email: response.data.user.email,
          password: response.data.defaultPassword,
        })
        toast.success('User created. Copy the default password now.')
        refreshUsers()
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to save user.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    if (!deactivatingUser) return
    setDeactivating(true)
    try {
      await api.patch(`/users/${deactivatingUser._id}/deactivate`)
      toast.success('User deactivated.')
      setDeactivatingUser(null)
      refreshUsers()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to deactivate user.'))
    } finally {
      setDeactivating(false)
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

  async function saveAdvisor(classItem) {
    const advisor = advisorSelections[classItem._id] || null
    setSavingAdvisorId(classItem._id)
    try {
      const response = await api.put(`/users/classes/${classItem._id}/advisor`, { advisor })
      setClasses((current) =>
        current.map((item) => item._id === classItem._id ? response.data.class : item),
      )
      toast.success('Class advisor assignment updated.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to assign class advisor.'))
    } finally {
      setSavingAdvisorId('')
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      render: (user) => <Badge color={user.role === 'teacher' ? 'purple' : 'blue'}>{user.role}</Badge>,
    },
    {
      key: 'department',
      label: 'Department',
      render: (user) => user.department?.name || '—',
    },
    {
      key: 'class',
      label: 'Class / Section',
      render: (user) => user.role === 'student'
        ? `${user.class?.name || '—'} / ${user.section || '—'}`
        : '—',
    },
    {
      key: 'rollNo',
      label: 'Roll No.',
      render: (user) => user.role === 'student' ? user.rollNo : '—',
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
        <div className="flex gap-2">
          <Button className="px-3 py-1.5" variant="secondary" onClick={() => openEdit(user)}>
            Edit
          </Button>
          {user.isActive && (
            <Button className="px-3 py-1.5" variant="danger" onClick={() => setDeactivatingUser(user)}>
              Deactivate
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
            <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
            <p className="mt-1 text-sm text-slate-500">
              Create and manage teacher and student accounts.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => { setBulkOpen(true); setBulkCredentials([]); setBulkError('') }}>
              Bulk upload students
            </Button>
            <Button onClick={openCreate}>Add User</Button>
          </div>
        </div>

        <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input id="user-search" label="Search" type="search" placeholder="Name, email, roll no..." value={search} onChange={(event) => updateFilter(setSearch, event.target.value)} />
          <Select
            id="user-role-filter"
            label="Role"
            value={roleFilter}
            onChange={(event) => updateFilter(setRoleFilter, event.target.value)}
            options={[
              { value: '', label: 'All roles' },
              { value: 'teacher', label: 'Teacher' },
              { value: 'student', label: 'Student' },
            ]}
          />
          <Select
            id="user-department-filter"
            label="Department"
            value={departmentFilter}
            onChange={(event) => { updateFilter(setDepartmentFilter, event.target.value); setClassFilter('') }}
            options={[
              { value: '', label: 'All departments' },
              ...departments.map((item) => ({ value: item._id, label: item.name })),
            ]}
          />
          <Select
            id="user-class-filter"
            label="Class"
            value={classFilter}
            onChange={(event) => updateFilter(setClassFilter, event.target.value)}
            disabled={!departmentFilter}
            options={[
              { value: '', label: departmentFilter ? 'All classes' : 'Choose department first' },
              ...filteredClasses.map((item) => ({
                value: item._id,
                label: `${item.name} · Sem ${item.semester} · ${item.section}`,
              })),
            ]}
          />
          <Select
            id="user-status-filter"
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
          <Card><Loader label="Loading users..." /></Card>
        ) : loadError ? (
          <EmptyState
            title="Unable to load users"
            message={loadError}
            action={<Button onClick={refreshUsers}>Try again</Button>}
          />
        ) : users.length ? (
          <Card className="overflow-hidden p-0">
            <Table columns={columns} rows={users} getRowKey={(user) => user._id} />
          </Card>
        ) : (
          <EmptyState
            title="No users found"
            message="Try adjusting the filters or add a new teacher or student."
          />
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Class Advisor Assignments</h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose a teacher from the same department for each class.
          </p>
        </div>
        {classes.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {classes.map((classItem) => {
              const departmentId = classItem.department?._id
              const departmentTeachers = teachers.filter(
                (teacher) => teacher.department === departmentId,
              )
              return (
                <Card className="grid gap-4 sm:grid-cols-[1fr_1.2fr_auto] sm:items-end" key={classItem._id}>
                  <div>
                    <p className="font-semibold text-slate-900">{classItem.name} · {classItem.section}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {classItem.department?.name} · Semester {classItem.semester}
                    </p>
                  </div>
                  <Select
                    id={`advisor-${classItem._id}`}
                    label="Class advisor"
                    value={advisorSelections[classItem._id] || ''}
                    onChange={(event) => setAdvisorSelections((current) => ({ ...current, [classItem._id]: event.target.value }))}
                    options={[
                      { value: '', label: 'No advisor assigned' },
                      ...departmentTeachers.map((teacher) => ({
                        value: teacher._id,
                        label: teacher.name,
                      })),
                    ]}
                  />
                  <Button disabled={savingAdvisorId === classItem._id} onClick={() => saveAdvisor(classItem)}>
                    {savingAdvisorId === classItem._id ? 'Saving...' : 'Save'}
                  </Button>
                </Card>
              )
            })}
          </div>
        ) : (
          <EmptyState title="No classes available" message="Create a class before assigning an advisor." />
        )}
      </section>

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && (setModalOpen(false), setCreatedCredentials(null))}
        title={createdCredentials ? 'User created' : editingUser ? 'Edit User' : 'Add User'}
      >
        {createdCredentials ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Copy this default password now. It will not be shown again.
            </p>
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
              <p><span className="font-medium">Name:</span> {createdCredentials.name}</p>
              <p><span className="font-medium">Email:</span> {createdCredentials.email}</p>
              <p className="break-all"><span className="font-medium">Default password:</span> <code>{createdCredentials.password}</code></p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => { setCreatedCredentials(null); setModalOpen(false) }}>Done</Button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input id="managed-user-name" label="Full name" name="name" value={form.name} onChange={updateForm} required maxLength={100} />
            <Input id="managed-user-email" label="Email" name="email" type="email" value={form.email} onChange={updateForm} required />
            {!editingUser && (
              <Select
                id="managed-user-role"
                label="Role"
                name="role"
                value={form.role}
                onChange={updateForm}
                options={[
                  { value: 'teacher', label: 'Teacher' },
                  { value: 'student', label: 'Student' },
                ]}
              />
            )}
            <Select
              id="managed-user-department"
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
            {form.role === 'student' && (
              <>
                <Select
                  id="managed-user-class"
                  label="Class"
                  name="class"
                  value={form.class}
                  onChange={updateForm}
                  required
                  disabled={!form.department}
                  options={[
                    { value: '', label: 'Select class' },
                    ...classesForForm.map((item) => ({
                      value: item._id,
                      label: `${item.name} · Sem ${item.semester} · ${item.section}`,
                    })),
                  ]}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input id="managed-user-section" label="Section" name="section" value={form.section} onChange={updateForm} required maxLength={20} />
                  <Input id="managed-user-roll" label="Roll number" name="rollNo" value={form.rollNo} onChange={updateForm} required maxLength={30} />
                </div>
              </>
            )}
            {!editingUser && (
              <p className="text-xs text-slate-500">
                A random default password will be generated and shown once after creation.
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingUser ? 'Save changes' : 'Create user'}</Button>
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
            <p className="text-sm text-slate-600">
              Save these generated passwords now. They are only displayed for this upload.
            </p>
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
                name,email,departmentCode,className,semester,section,academicYear,rollNo
              </code>
              <p className="mt-2">
                Use an existing department code and class name. The class is matched by department, name, semester, section, and academic year. One student per row; maximum 500 rows.
              </p>
            </div>
            <Input
              id="student-csv-file"
              label="Student CSV file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => { setBulkFile(event.target.files?.[0] || null); setBulkError('') }}
              required
            />
            {bulkError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{bulkError}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setBulkOpen(false)} disabled={uploading}>Cancel</Button>
              <Button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload students'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deactivatingUser)}
        onClose={() => !deactivating && setDeactivatingUser(null)}
        onConfirm={handleDeactivate}
        title="Deactivate user?"
        message={`Deactivate ${deactivatingUser?.name || 'this user'}? They will no longer be able to sign in.`}
        confirmLabel="Deactivate"
        busy={deactivating}
      />
    </div>
  )
}

export default UsersPage
