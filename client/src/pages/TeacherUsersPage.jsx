import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  password: '',
  confirmPassword: '',
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback
}

function TeacherUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
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
    role: 'teacher',
    department: searchParams.get('department') || '',
    class: searchParams.get('class') || '',
  }))
  const [saving, setSaving] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [statusUser, setStatusUser] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const userParams = useMemo(() => {
    const params = { role: 'teacher' }
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
        const message = getErrorMessage(error, 'Unable to load teacher management data.')
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
          const message = getErrorMessage(error, 'Unable to load teachers.')
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
      const message = getErrorMessage(error, 'Unable to load teachers.')
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

  function openCreate() {
    setEditingUser(null)
    setCreatedCredentials(null)
    setForm({
      ...blankForm,
      role: 'teacher',
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

    setSaving(true)

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      department: form.department,
      ...(editingUser && form.password ? { password: form.password } : {}),
    }

    try {
      if (editingUser) {
        const response = await api.put(`/users/${editingUser._id}`, payload)
        toast.success('Teacher updated.')
        setModalOpen(false)
        setUsers((current) => current.map((item) => item._id === editingUser._id ? response.data.user : item))
      } else {
        const response = await api.post('/users', {
          ...payload,
          role: 'teacher',
          password: form.password,
        })
        setCreatedCredentials({
          name: response.data.user.name,
          email: response.data.user.email,
          password: form.password,
        })
        toast.success('Teacher created.')
        refreshUsers()
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to save teacher.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange() {
    if (!statusUser) return
    const isActive = !statusUser.isActive
    setUpdatingStatus(true)
    try {
      await api.patch(`/users/${statusUser._id}/status`, { isActive })
      toast.success(isActive ? 'Teacher reactivated.' : 'Teacher suspended.')
      setStatusUser(null)
      refreshUsers()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to update account status.'))
    } finally {
      setUpdatingStatus(false)
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
          <Button
            className="px-3 py-1.5"
            variant={user.isActive ? 'danger' : 'secondary'}
            onClick={() => setStatusUser(user)}
          >
            {user.isActive ? 'Suspend' : 'Reactivate'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#f1f3f6]">Teacher Management</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">Create and manage teacher accounts.</p>
          </div>
          <Button onClick={openCreate}>Add Teacher</Button>
        </div>

        <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input id="teacher-search" label="Search" type="search" placeholder="Name, email, department..." value={search} onChange={(event) => updateFilter(setSearch, event.target.value)} />
          <Select
            id="teacher-department-filter"
            label="Department"
            value={departmentFilter}
            onChange={(event) => { updateFilter(setDepartmentFilter, event.target.value); setClassFilter('') }}
            options={[
              { value: '', label: 'All departments' },
              ...departments.map((item) => ({ value: item._id, label: item.name })),
            ]}
          />
          <Select
            id="teacher-class-filter"
            label="Class"
            value={classFilter}
            onChange={(event) => updateFilter(setClassFilter, event.target.value)}
            disabled={!departmentFilter}
            options={[
              { value: '', label: departmentFilter ? 'All classes' : 'Choose department first' },
              ...filteredClasses.map((item) => ({ value: item._id, label: `${item.name} · Sem ${item.semester}` })),
            ]}
          />
          <Select
            id="teacher-status-filter"
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
          <Card><Loader label="Loading teachers..." /></Card>
        ) : loadError ? (
          <EmptyState title="Unable to load teachers" message={loadError} action={<Button onClick={refreshUsers}>Try again</Button>} />
        ) : users.length ? (
          <Card className="overflow-hidden p-0">
            <Table columns={columns} rows={users} getRowKey={(user) => user._id} />
          </Card>
        ) : (
          <EmptyState title="No teachers found" message="Try adjusting the filters or add a new teacher." />
        )}
      </section>

      <Modal
        isOpen={modalOpen || isAddingFromClass}
        onClose={closeUserModal}
        title={createdCredentials ? 'Teacher created' : editingUser ? 'Edit Teacher' : 'Add Teacher'}
      >
        {createdCredentials ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-[#b5bcc9]">Share this password securely. Only an admin can change it later.</p>
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm dark:border dark:border-[#242730] dark:bg-[#101216] dark:text-[#d1d6e0]">
              <p><span className="font-medium">Name:</span> {createdCredentials.name}</p>
              <p><span className="font-medium">Email:</span> {createdCredentials.email}</p>
              <p className="break-all"><span className="font-medium">Initial password:</span> <code className="dark:text-emerald-400">{createdCredentials.password}</code></p>
            </div>
            <div className="flex justify-end">
              <Button onClick={closeUserModal}>Done</Button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input id="managed-teacher-name" label="Full name" name="name" value={form.name} onChange={updateForm} required maxLength={100} />
            <Input id="managed-teacher-email" label="Email" name="email" type="email" value={form.email} onChange={updateForm} required />
            {editingUser && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="managed-teacher-edit-password" label="New password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={form.password} onChange={updateForm} placeholder="Leave blank to keep current password" />
                <Input id="managed-teacher-edit-confirm-password" label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={form.confirmPassword} onChange={updateForm} placeholder="Leave blank to keep current password" />
              </div>
            )}
            <Select
              id="managed-teacher-department"
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
            {!editingUser && (
              <>
                <Input id="managed-teacher-password" label="Initial password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={form.password} onChange={updateForm} required />
                <Input id="managed-teacher-confirm-password" label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={form.confirmPassword} onChange={updateForm} required />
              </>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={closeUserModal} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingUser ? 'Save changes' : 'Create teacher'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(statusUser)}
        onClose={() => !updatingStatus && setStatusUser(null)}
        onConfirm={handleStatusChange}
        title={statusUser?.isActive ? 'Suspend teacher?' : 'Reactivate teacher?'}
        message={`${statusUser?.isActive ? 'Suspend' : 'Reactivate'} ${statusUser?.name || 'this teacher'}?`}
        confirmLabel={statusUser?.isActive ? 'Suspend' : 'Reactivate'}
        busy={updatingStatus}
      />
    </div>
  )
}

export default TeacherUsersPage
