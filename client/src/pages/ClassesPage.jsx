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
  department: '',
  semester: '1',
  section: '',
  academicYear: '',
}

function messageFrom(error, fallback) {
  return error.response?.data?.message || fallback
}

function ClassesPage() {
  const { user } = useAuth()
  const canManage = user.role === 'superadmin'
  const [departments, setDepartments] = useState([])
  const [classes, setClasses] = useState([])
  const [departmentId, setDepartmentId] = useState(user.department || '')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [form, setForm] = useState(blankForm)
  const [saving, setSaving] = useState(false)
  const [deletingClass, setDeletingClass] = useState(null)
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
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [departmentId, reloadKey])

  const filteredClasses = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return classes

    return classes.filter((item) =>
      `${item.name} ${item.section} ${item.semester} ${item.academicYear} ${item.department?.name || ''}`
        .toLowerCase()
        .includes(value),
    )
  }, [classes, search])

  function openCreate() {
    setEditingClass(null)
    setForm({ ...blankForm, department: departmentId })
    setModalOpen(true)
  }

  function chooseDepartment(value) {
    setLoading(true)
    setLoadError('')
    setDepartmentId(value)
  }

  function openEdit(item) {
    setEditingClass(item)
    setForm({
      name: item.name,
      department: item.department?._id || item.department,
      semester: String(item.semester),
      section: item.section,
      academicYear: item.academicYear,
    })
    setModalOpen(true)
  }

  function updateForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      name: form.name.trim(),
      semester: Number(form.semester),
      section: form.section.trim(),
      academicYear: form.academicYear.trim(),
    }

    try {
      if (editingClass) {
        await api.put(`/classes/${editingClass._id}`, payload)
        toast.success('Class updated.')
      } else {
        await api.post('/classes', payload)
        toast.success('Class created.')
      }
      setModalOpen(false)
      setReloadKey((key) => key + 1)
    } catch (error) {
      toast.error(messageFrom(error, 'Unable to save class.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingClass) return
    setDeleting(true)
    try {
      await api.delete(`/classes/${deletingClass._id}`)
      toast.success('Class deleted.')
      setDeletingClass(null)
      setReloadKey((key) => key + 1)
    } catch (error) {
      toast.error(messageFrom(error, 'Unable to delete class.'))
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    { key: 'name', label: 'Class' },
    {
      key: 'department',
      label: 'Department',
      render: (item) => item.department?.name || '—',
    },
    {
      key: 'semester',
      label: 'Semester',
      render: (item) => <Badge color="blue">{item.semester}</Badge>,
    },
    { key: 'section', label: 'Section' },
    { key: 'academicYear', label: 'Academic year' },
    ...(canManage
      ? [{
          key: 'actions',
          label: 'Actions',
          render: (item) => (
            <div className="flex gap-2">
              <Button variant="secondary" className="px-3 py-1.5" onClick={() => openEdit(item)}>Edit</Button>
              <Button variant="danger" className="px-3 py-1.5" onClick={() => setDeletingClass(item)}>Delete</Button>
            </div>
          ),
        }]
      : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Classes</h1>
          <p className="mt-1 text-sm text-slate-500">
            {canManage ? 'Manage classes by department and academic year.' : 'Classes in your department.'}
          </p>
        </div>
        {canManage && <Button onClick={openCreate}>Add Class</Button>}
      </div>

      <Card className="grid gap-4 sm:grid-cols-2">
        {canManage ? (
          <Select
            id="class-department-filter"
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
            <p className="mt-2 font-semibold text-slate-900">
              {departments[0]?.name || 'Your department'}
            </p>
          </div>
        )}
        <Input
          id="class-search"
          label="Search classes"
          type="search"
          placeholder="Name, section, semester..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Card>

      {loading ? (
        <Card><Loader label="Loading classes..." /></Card>
      ) : loadError ? (
        <EmptyState
          title="Unable to load classes"
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
      ) : filteredClasses.length ? (
        <Card className="overflow-hidden p-0">
          <Table columns={columns} rows={filteredClasses} getRowKey={(item) => item._id} />
        </Card>
      ) : (
        <EmptyState
          title={search ? 'No matching classes' : 'No classes yet'}
          message={search ? 'Try another search.' : 'Classes will appear here when they are created.'}
          action={canManage && !search ? <Button onClick={openCreate}>Add Class</Button> : null}
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingClass ? 'Edit Class' : 'Add Class'}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input id="class-name" label="Class name" name="name" value={form.name} onChange={updateForm} required maxLength={100} placeholder="e.g. B.Tech" />
          <Select
            id="class-department"
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="class-semester"
              label="Semester"
              name="semester"
              value={form.semester}
              onChange={updateForm}
              options={Array.from({ length: 12 }, (_, index) => ({
                value: String(index + 1),
                label: `Semester ${index + 1}`,
              }))}
            />
            <Input id="class-section" label="Section" name="section" value={form.section} onChange={updateForm} required maxLength={20} placeholder="e.g. A" />
          </div>
          <Input id="academic-year" label="Academic year" name="academicYear" value={form.academicYear} onChange={updateForm} required maxLength={20} placeholder="e.g. 2025-26" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingClass ? 'Save changes' : 'Create class'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingClass)}
        onClose={() => !deleting && setDeletingClass(null)}
        onConfirm={handleDelete}
        title="Delete class?"
        message={`Delete ${deletingClass?.name || 'this class'}? Classes with subjects or students cannot be deleted.`}
        confirmLabel="Delete class"
        busy={deleting}
      />
    </div>
  )
}

export default ClassesPage
