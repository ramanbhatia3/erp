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

function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const isAddingFromClass = searchParams.get('add') === '1'
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState(() => {
    const paramRole = searchParams.get('role')
    if (paramRole) return paramRole
    const pathname = location.pathname
    if (pathname.endsWith('/teachers')) return 'teacher'
    if (pathname.endsWith('/students')) return 'student'
    return ''
  })
  const [departmentFilter, setDepartmentFilter] = useState(() => searchParams.get('department') || '')
  const [classFilter, setClassFilter] = useState(() => searchParams.get('class') || '')
  const [activeFilter, setActiveFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState(() => {
    const pathname = location.pathname
    const defaultRole = searchParams.get('role') || (pathname.endsWith('/students') ? 'student' : 'teacher')
    return {
      ...blankForm,
      role: defaultRole,
      department: searchParams.get('department') || '',
      class: searchParams.get('class') || '',
    }
  })
  const [saving, setSaving] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [passwordUser, setPasswordUser] = useState(null)
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' })
  const [savingPassword, setSavingPassword] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkFile, setBulkFile] = useState(null)
  const [bulkCredentials, setBulkCredentials] = useState([])
  const [bulkError, setBulkError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [statusUser, setStatusUser] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [removingStudent, setRemovingStudent] = useState(null)
  const [removingFromClass, setRemovingFromClass] = useState(false)

  const pageRole = useMemo(() => {
    const paramRole = searchParams.get('role')
    if (paramRole === 'teacher' || paramRole === 'student') return paramRole
    if (location.pathname.endsWith('/teachers')) return 'teacher'
    if (location.pathname.endsWith('/students')) return 'student'
    return roleFilter
  }, [location.pathname, searchParams, roleFilter])

  useEffect(() => {
    if (pageRole && pageRole !== roleFilter) {
      setRoleFilter(pageRole)
    }
  }, [pageRole, roleFilter])

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
    Promise.all([api.get('/departments'), api.get('/classes')])
      .then(([departmentResponse, classResponse]) => {
        if (!active) return
        setDepartments(departmentResponse.data.departments)
        setClasses(classResponse.data.classes)
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
    setForm({
      ...blankForm,
      department: departmentFilter,
      class: classFilter,
      role: isStudentsSection ? 'student' : (roleFilter || 'teacher'),
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
      ...(form.role === 'student' && form.class
        ? {
            class: form.class,
            section: form.section.trim(),
            rollNo: form.rollNo.trim(),
          }
        : {}),
    }

    const finalRole = isStudentsSection ? 'student' : form.role

    try {
      if (editingUser) {
        const response = await api.put(`/users/${editingUser._id}`, payload)
        toast.success('User updated.')
        setModalOpen(false)
        setUsers((current) =>
          current.map((item) => item._id === editingUser._id ? response.data.user : item),
        )
      } else {
        const response = await api.post('/users', {
          ...payload,
          role: finalRole,
          password: form.password,
        })
        setCreatedCredentials({
          name: response.data.user.name,
          email: response.data.user.email,
          password: form.password,
        })
        toast.success('User created.')
        refreshUsers()
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to save user.'))
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
      toast.success(isActive ? 'User reactivated.' : 'User suspended.')
      setStatusUser(null)
      refreshUsers()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to update account status.'))
    } finally {
      setUpdatingStatus(false)
    }
  }

  function openSetPassword(user) {
    setPasswordUser(user)
    setPasswordForm({ password: '', confirmPassword: '' })
  }

  async function handleSetPassword(event) {
    event.preventDefault()
    if (!passwordUser) return
    if (passwordForm.password !== passwordForm.confirmPassword) {
      toast.error('The passwords do not match.')
      return
    }

    setSavingPassword(true)
    try {
      await api.patch(`/users/${passwordUser._id}/password`, {
        password: passwordForm.password,
      })
      toast.success(`Password updated for ${passwordUser.name}.`)
      setPasswordUser(null)
      setPasswordForm({ password: '', confirmPassword: '' })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to set the user password.'))
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleRemoveFromClass() {
    if (!removingStudent) return
    setRemovingFromClass(true)
    try {
      const response = await api.patch(`/users/${removingStudent._id}/remove-from-class`)
      setUsers((current) =>
        current.map((item) => item._id === removingStudent._id ? response.data.user : item),
      )
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

  const isTeachersSection = pageRole === 'teacher'
  const isStudentsSection = pageRole === 'student'
  const pageTitle = isStudentsSection ? 'Student Management' : 'Teacher Management'
  const addButtonLabel = isStudentsSection ? 'Add Student' : 'Add Teacher'
  const sectionLabel = isStudentsSection ? 'Student' : 'Teacher'

  const showRoleColumn = !isStudentsSection
  const showRoleFilter = !pageRole
  const showSuspendAction = !isStudentsSection

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    ...(showRoleColumn ? [{
      key: 'role',
      label: 'Role',
      render: (user) => <Badge color={user.role === 'teacher' ? 'purple' : 'blue'}>{user.role}</Badge>,
    }] : []),
    {
      key: 'department',
      label: 'Department',
      render: (user) => user.department?.name || '—',
    },
    ...(isStudentsSection ? [{
      key: 'class',
      label: 'Class / Section',
      render: (user) => `${user.class?.name || '—'} / ${user.section || '—'}`,
    }, {
      key: 'rollNo',
      label: 'Roll No.',
      render: (user) => user.rollNo || '—',
    }] : []),
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
          {showSuspendAction && (
            <Button
              className="px-3 py-1.5"
              variant={user.isActive ? 'danger' : 'secondary'}
              onClick={() => setStatusUser(user)}
            >
              {user.isActive ? 'Suspend' : 'Reactivate'}
            </Button>
          )}
          {user.role === 'student' && user.class && (
            <Button className="px-3 py-1.5" variant="danger" onClick={() => setRemovingStudent(user)}>
              Remove from class
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#f1f3f6]">{pageTitle}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
              {isStudentsSection
                ? 'Create and manage student accounts.'
                : 'Create and manage teacher accounts.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isStudentsSection && (
              <Button variant="secondary" onClick={() => { setBulkOpen(true); setBulkCredentials([]); setBulkError('') }}>
                Bulk upload students
              </Button>
            )}
            <Button onClick={openCreate}>{addButtonLabel}</Button>
          </div>
        </div>

        <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input id="user-search" label="Search" type="search" placeholder={isStudentsSection ? 'Name, email, roll no...' : 'Name, email, department...'} value={search} onChange={(event) => updateFilter(setSearch, event.target.value)} />
          {showRoleFilter && (
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
          )}
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
                label: `${item.name} · Sem ${item.semester}`,
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
            title={isStudentsSection ? 'No students found' : 'No teachers found'}
            message={isStudentsSection ? 'Try adjusting the filters or add a new student.' : 'Try adjusting the filters or add a new teacher.'}
          />
        )}
      </section>

      <Modal
        isOpen={modalOpen || isAddingFromClass}
        onClose={closeUserModal}
        title={createdCredentials ? `${sectionLabel} created` : editingUser ? `Edit ${sectionLabel}` : `Add ${sectionLabel}`}
      >
        {createdCredentials ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-[#b5bcc9]">
              Share this password securely. Only an admin can change it later.
            </p>
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
            <Input id="managed-user-name" label="Full name" name="name" value={form.name} onChange={updateForm} required maxLength={100} />
            <Input id="managed-user-email" label="Email" name="email" type="email" value={form.email} onChange={updateForm} required />
            {!editingUser && !isStudentsSection && (
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
            {editingUser && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="managed-user-edit-password"
                  label="New password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={form.password}
                  onChange={updateForm}
                  placeholder="Leave blank to keep current password"
                />
                <Input
                  id="managed-user-edit-confirm-password"
                  label="Confirm password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={form.confirmPassword}
                  onChange={updateForm}
                  placeholder="Leave blank to keep current password"
                />
              </div>
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
                  required={!editingUser || Boolean(editingUser.class)}
                  disabled={!form.department}
                  options={[
                    { value: '', label: 'Select class' },
                    ...classesForForm.map((item) => ({
                      value: item._id,
                      label: `${item.name} · Sem ${item.semester}`,
                    })),
                  ]}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input id="managed-user-section" label="Student section (optional)" name="section" value={form.section} onChange={updateForm} maxLength={20} />
                  <Input id="managed-user-roll" label="Roll number" name="rollNo" value={form.rollNo} onChange={updateForm} required={!editingUser || Boolean(editingUser.class)} maxLength={30} />
                </div>
              </>
            )}
            {!editingUser && (
              <>
                <Input
                  id="managed-user-password"
                  label="Initial password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={form.password}
                  onChange={updateForm}
                  required
                />
                <Input
                  id="managed-user-confirm-password"
                  label="Confirm password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={form.confirmPassword}
                  onChange={updateForm}
                  required
                />
              </>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={closeUserModal} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingUser ? 'Save changes' : 'Create user'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(passwordUser)}
        onClose={() => {
          if (!savingPassword) {
            setPasswordUser(null)
            setPasswordForm({ password: '', confirmPassword: '' })
          }
        }}
        title={`Set password for ${passwordUser?.name || 'user'}`}
      >
        <form className="space-y-4" onSubmit={handleSetPassword}>
          <p className="text-sm text-slate-600">
            Choose the password to assign. Only an admin can change it later.
          </p>
          <Input
            id="new-user-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            value={passwordForm.password}
            onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
            required
          />
          <Input
            id="confirm-user-password"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            value={passwordForm.confirmPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            required
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setPasswordUser(null)
                setPasswordForm({ password: '', confirmPassword: '' })
              }}
              disabled={savingPassword}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? 'Saving...' : 'Set password'}
            </Button>
          </div>
        </form>
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
                <div className="rounded-lg bg-slate-50 p-3 text-sm dark:border dark:border-[#242730] dark:bg-[#101216]" key={credential.id}>
                  <p className="font-medium text-slate-900 dark:text-[#f1f3f6]">{credential.name}</p>
                  <p className="text-slate-600 dark:text-[#b5bcc9]">{credential.email}</p>
                  <p className="break-all text-slate-700 dark:text-[#d1d6e0]">Password: <code className="dark:text-emerald-400">{credential.defaultPassword}</code></p>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => { setBulkOpen(false); setBulkCredentials([]); setBulkFile(null) }}>Done</Button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleCsvUpload}>
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:border dark:border-[#242730] dark:bg-[#101216] dark:text-[#b5bcc9]">
              <p className="font-semibold text-slate-800 dark:text-[#f1f3f6]">CSV format</p>
              <p className="mt-1">Use this exact header row:</p>
              <code className="mt-2 block overflow-x-auto whitespace-nowrap text-xs dark:bg-[#181b22] dark:text-emerald-300 dark:p-2 dark:rounded">
                name,email,departmentCode,className,semester,section,academicYear,rollNo
              </code>
              <p className="mt-2">
                Use an existing department code and class name. The class is matched by department, name, semester, and academic year. The optional section is student information. One student per row; maximum 500 rows.
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
        isOpen={Boolean(statusUser)}
        onClose={() => !updatingStatus && setStatusUser(null)}
        onConfirm={handleStatusChange}
        title={statusUser?.isActive ? 'Suspend user?' : 'Reactivate user?'}
        message={`${statusUser?.isActive ? 'Suspend' : 'Reactivate'} ${statusUser?.name || 'this user'}?`}
        confirmLabel={statusUser?.isActive ? 'Suspend' : 'Reactivate'}
        busy={updatingStatus}
      />
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

export default UsersPage
