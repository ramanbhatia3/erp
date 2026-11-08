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
import useAuth from '../context/useAuth'

const blankForm = {
  name: '',
  code: '',
  department: '',
  class: '',
  teacher: '',
}

function messageFrom(error, fallback) {
  return error.response?.data?.message || fallback
}

function SubjectsPage() {
  const { user } = useAuth()
  const canManage = user.role === 'superadmin'
  const [departments, setDepartments] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [teachersForDepartment, setTeachersForDepartment] = useState('')
  const [departmentId, setDepartmentId] = useState(user.department || '')
  const [classId, setClassId] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [form, setForm] = useState(blankForm)
  const [saving, setSaving] = useState(false)
  const [deletingSubject, setDeletingSubject] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    api.get('/departments')
      .then((response) => {
        if (active) setDepartments(response.data.departments)
      })
      .catch((error) => {
        if (active) {
          const message = messageFrom(error, 'Unable to load departments.')
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
    const params = departmentId ? { department: departmentId } : {}

    api.get('/classes', { params })
      .then((response) => {
        if (active) {
          setClasses(response.data.classes)
          setLoadError('')
        }
      })
      .catch((error) => {
        if (active) {
          const message = messageFrom(error, 'Unable to load classes.')
          setLoadError(message)
          toast.error(message)
        }
      })

    return () => {
      active = false
    }
  }, [departmentId])

  useEffect(() => {
    let active = true
    const params = {}
    if (departmentId) params.department = departmentId
    if (classId) params.class = classId

    api.get('/subjects', { params })
      .then((response) => {
        if (active) {
          setSubjects(response.data.subjects)
          setLoadError('')
        }
      })
      .catch((error) => {
        if (active) {
          const message = messageFrom(error, 'Unable to load subjects.')
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
  }, [departmentId, classId, reloadKey])

  useEffect(() => {
    let active = true
    if (!modalOpen || !canManage || !form.department) {
      return undefined
    }

    api.get('/subjects/teachers', { params: { department: form.department } })
      .then((response) => {
        if (active) {
          setTeachers(response.data.teachers)
          setTeachersForDepartment(form.department)
        }
      })
      .catch((error) => {
        if (active) toast.error(messageFrom(error, 'Unable to load teachers.'))
      })

    return () => {
      active = false
    }
  }, [modalOpen, canManage, form.department])

  const visibleClasses = useMemo(
    () => classes.filter((item) => !departmentId || item.department?._id === departmentId),
    [classes, departmentId],
  )

  const formClasses = useMemo(
    () => classes.filter((item) => item.department?._id === form.department),
    [classes, form.department],
  )

  const filteredSubjects = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return subjects

    return subjects.filter((item) =>
      `${item.name} ${item.code} ${item.class?.name || ''} ${item.class?.section || ''} ${item.teacher?.name || ''}`
        .toLowerCase()
        .includes(value),
    )
  }, [subjects, search])

  function chooseDepartment(value) {
    setLoading(true)
    setLoadError('')
    setDepartmentId(value)
    setClassId('')
  }

  function chooseClass(value) {
    setLoading(true)
    setLoadError('')
    setClassId(value)
  }

  function openCreate() {
    setEditingSubject(null)
    setForm({ ...blankForm, department: departmentId })
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditingSubject(item)
    setForm({
      name: item.name,
      code: item.code,
      department: item.department?._id || item.department,
      class: item.class?._id || item.class,
      teacher: item.teacher?._id || item.teacher,
    })
    setModalOpen(true)
  }

  function updateForm(event) {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'department' ? { class: '', teacher: '' } : {}),
      ...(name === 'class' ? { teacher: '' } : {}),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim(),
    }

    try {
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject._id}`, payload)
        toast.success('Subject updated.')
      } else {
        await api.post('/subjects', payload)
        toast.success('Subject created.')
      }
      setModalOpen(false)
      setLoading(true)
      setReloadKey((key) => key + 1)
    } catch (error) {
      toast.error(messageFrom(error, 'Unable to save subject.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingSubject) return
    setDeleting(true)
    try {
      await api.delete(`/subjects/${deletingSubject._id}`)
      toast.success('Subject deleted.')
      setDeletingSubject(null)
      setLoading(true)
      setReloadKey((key) => key + 1)
    } catch (error) {
      toast.error(messageFrom(error, 'Unable to delete subject.'))
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    { key: 'name', label: 'Subject' },
    {
      key: 'code',
      label: 'Code',
      render: (item) => <Badge color="blue">{item.code}</Badge>,
    },
    {
      key: 'class',
      label: 'Class',
      render: (item) => item.class
        ? `${item.class.name} · Sem ${item.class.semester} · ${item.class.section}`
        : '—',
    },
    {
      key: 'department',
      label: 'Department',
      render: (item) => item.department?.name || '—',
    },
    {
      key: 'teacher',
      label: 'Teacher',
      render: (item) => item.teacher?.name || '—',
    },
    ...(canManage
      ? [{
          key: 'actions',
          label: 'Actions',
          render: (item) => (
            <div className="flex gap-2">
              <Button variant="secondary" className="px-3 py-1.5" onClick={() => openEdit(item)}>Edit</Button>
              <Button variant="danger" className="px-3 py-1.5" onClick={() => setDeletingSubject(item)}>Delete</Button>
            </div>
          ),
        }]
      : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subjects</h1>
          <p className="mt-1 text-sm text-slate-500">
            {canManage ? 'Assign subjects to classes and teachers.' : 'Subjects offered by your department.'}
          </p>
        </div>
        {canManage && <Button onClick={openCreate}>Add Subject</Button>}
      </div>

      <Card className="grid gap-4 sm:grid-cols-3">
        {canManage ? (
          <Select
            id="subject-department-filter"
            label="Department"
            value={departmentId}
            onChange={(event) => chooseDepartment(event.target.value)}
            options={[
              { value: '', label: 'All departments' },
              ...departments.map((item) => ({ value: item._id, label: item.name })),
            ]}
          />
        ) : (
          <div className="text-sm text-slate-600">
            Department
            <p className="mt-2 font-semibold text-slate-900">{departments[0]?.name || 'Your department'}</p>
          </div>
        )}
        <Select
          id="subject-class-filter"
          label="Class"
          value={classId}
          onChange={(event) => chooseClass(event.target.value)}
          disabled={!departmentId}
          options={[
            { value: '', label: departmentId ? 'All classes' : 'Select a department first' },
            ...visibleClasses.map((item) => ({
              value: item._id,
              label: `${item.name} · Sem ${item.semester} · ${item.section}`,
            })),
          ]}
        />
        <Input
          id="subject-search"
          label="Search subjects"
          type="search"
          placeholder="Name, code, class, teacher..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Card>

      {loading ? (
        <Card><Loader label="Loading subjects..." /></Card>
      ) : loadError ? (
        <EmptyState
          title="Unable to load subjects"
          message={loadError}
          action={
            <Button
              onClick={() => {
                setLoading(true)
                setReloadKey((key) => key + 1)
              }}
            >
              Try again
            </Button>
          }
        />
      ) : filteredSubjects.length ? (
        <Card className="overflow-hidden p-0">
          <Table columns={columns} rows={filteredSubjects} getRowKey={(item) => item._id} />
        </Card>
      ) : (
        <EmptyState
          title={search || classId || departmentId ? 'No matching subjects' : 'No subjects yet'}
          message="Subjects matching these filters will appear here."
          action={canManage && !search ? <Button onClick={openCreate}>Add Subject</Button> : null}
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'Add Subject'}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input id="subject-name" label="Subject name" name="name" value={form.name} onChange={updateForm} required maxLength={100} placeholder="e.g. Mathematics" />
          <Input id="subject-code" label="Subject code" name="code" value={form.code} onChange={updateForm} required maxLength={20} placeholder="e.g. MATH101" />
          <Select
            id="subject-department"
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
            id="subject-class"
            label="Class"
            name="class"
            value={form.class}
            onChange={updateForm}
            required
            disabled={!form.department}
            options={[
              { value: '', label: 'Select class' },
              ...formClasses.map((item) => ({
                value: item._id,
                label: `${item.name} · Sem ${item.semester} · ${item.section}`,
              })),
            ]}
          />
          <Select
            id="subject-teacher"
            label="Assigned teacher"
            name="teacher"
            value={form.teacher}
            onChange={updateForm}
            required
            disabled={
              !form.department ||
              teachersForDepartment !== form.department ||
              teachers.length === 0
            }
            options={[
              {
                value: '',
                label:
                  teachersForDepartment !== form.department
                    ? 'Loading teachers...'
                    : teachers.length
                      ? 'Select teacher'
                      : 'No teachers available',
              },
              ...(teachersForDepartment === form.department ? teachers : []).map((item) => ({
                value: item._id,
                label: `${item.name} (${item.email})`,
              })),
            ]}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingSubject ? 'Save changes' : 'Create subject'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingSubject)}
        onClose={() => !deleting && setDeletingSubject(null)}
        onConfirm={handleDelete}
        title="Delete subject?"
        message={`Delete ${deletingSubject?.name || 'this subject'}? This action cannot be undone.`}
        confirmLabel="Delete subject"
        busy={deleting}
      />
    </div>
  )
}

export default SubjectsPage
