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

const emptyForm = { name: '', code: '', hod: '' }

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback
}

function DepartmentsPage() {
  const [departments, setDepartments] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingDepartment, setDeletingDepartment] = useState(null)
  const [deleting, setDeleting] = useState(false)

  function fetchDepartmentData() {
    return Promise.all([
      api.get('/departments'),
      api.get('/departments/teachers'),
    ])
  }

  async function loadDepartments() {
    try {
      const [departmentResponse, teacherResponse] = await fetchDepartmentData()
      setDepartments(departmentResponse.data.departments)
      setTeachers(teacherResponse.data.teachers)
      setLoadError('')
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load departments.')
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    fetchDepartmentData()
      .then(([departmentResponse, teacherResponse]) => {
        if (active) {
          setDepartments(departmentResponse.data.departments)
          setTeachers(teacherResponse.data.teachers)
          setLoadError('')
        }
      })
      .catch((error) => {
        if (active) {
          const message = getErrorMessage(error, 'Unable to load departments.')
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

  const filteredDepartments = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return departments

    return departments.filter((department) =>
      `${department.name} ${department.code} ${department.hod?.name || ''}`
        .toLowerCase()
        .includes(value),
    )
  }, [departments, search])

  function openCreateModal() {
    setEditingDepartment(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEditModal(department) {
    setEditingDepartment(department)
    setForm({
      name: department.name,
      code: department.code,
      hod: department.hod?._id || '',
    })
    setModalOpen(true)
  }

  function closeModal() {
    if (!saving) setModalOpen(false)
  }

  function updateForm(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      hod: form.hod || null,
    }

    try {
      if (editingDepartment) {
        await api.put(`/departments/${editingDepartment._id}`, payload)
        toast.success('Department updated.')
      } else {
        await api.post('/departments', payload)
        toast.success('Department created.')
      }

      setModalOpen(false)
      setLoading(true)
      await loadDepartments()
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          editingDepartment
            ? 'Unable to update department.'
            : 'Unable to create department.',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingDepartment) return

    setDeleting(true)
    try {
      await api.delete(`/departments/${deletingDepartment._id}`)
      toast.success('Department deleted.')
      setDeletingDepartment(null)
      setLoading(true)
      await loadDepartments()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to delete department.'))
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    { key: 'name', label: 'Department' },
    {
      key: 'code',
      label: 'Code',
      render: (department) => <Badge color="blue">{department.code}</Badge>,
    },
    {
      key: 'hod',
      label: 'Head of Department',
      render: (department) =>
        department.hod ? (
          <div>
            <p className="font-medium text-slate-800">{department.hod.name}</p>
            <p className="text-xs text-slate-500">{department.hod.email}</p>
          </div>
        ) : (
          <span className="text-slate-400">Not assigned</span>
        ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (department) => (
        <div className="flex items-center gap-2">
          <Button
            className="px-3 py-1.5"
            variant="secondary"
            onClick={() => openEditModal(department)}
          >
            Edit
          </Button>
          <Button
            className="px-3 py-1.5"
            variant="danger"
            onClick={() => setDeletingDepartment(department)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage university departments and their heads.
          </p>
        </div>
        <Button onClick={openCreateModal}>Add Department</Button>
      </div>

      <Card>
        <Input
          id="department-search"
          label="Search departments"
          type="search"
          placeholder="Search by name, code, or HOD..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Card>

      {loading ? (
        <Card>
          <Loader label="Loading departments..." />
        </Card>
      ) : loadError ? (
        <EmptyState
          title="Unable to load departments"
          message={loadError}
          action={
            <Button
              onClick={() => {
                setLoading(true)
                loadDepartments()
              }}
            >
              Try again
            </Button>
          }
        />
      ) : filteredDepartments.length > 0 ? (
        <Card className="p-0">
          <Table
            columns={columns}
            rows={filteredDepartments}
            getRowKey={(department) => department._id}
            emptyMessage="No departments match your search."
          />
        </Card>
      ) : (
        <EmptyState
          title={search ? 'No matching departments' : 'No departments yet'}
          message={
            search
              ? 'Try another department name, code, or HOD.'
              : 'Add your first department to get started.'
          }
          action={
            !search && (
              <Button onClick={openCreateModal}>Add Department</Button>
            )
          }
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingDepartment ? 'Edit Department' : 'Add Department'}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            id="department-name"
            label="Department name"
            name="name"
            value={form.name}
            onChange={updateForm}
            maxLength={100}
            required
            placeholder="e.g. Computer Science"
          />
          <Input
            id="department-code"
            label="Department code"
            name="code"
            value={form.code}
            onChange={updateForm}
            maxLength={20}
            required
            placeholder="e.g. CSE"
          />
          <Select
            id="department-hod"
            label="Head of Department (optional)"
            name="hod"
            value={form.hod}
            onChange={updateForm}
            options={[
              { value: '', label: 'No HOD assigned' },
              ...teachers.map((teacher) => ({
                value: teacher._id,
                label: `${teacher.name} (${teacher.email})`,
              })),
            ]}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={closeModal}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? 'Saving...'
                : editingDepartment
                  ? 'Save changes'
                  : 'Create department'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingDepartment)}
        onClose={() => {
          if (!deleting) setDeletingDepartment(null)
        }}
        onConfirm={handleDelete}
        title="Delete department?"
        message={`Delete ${deletingDepartment?.name || 'this department'}? This action cannot be undone.`}
        confirmLabel="Delete department"
        busy={deleting}
      />
    </div>
  )
}

export default DepartmentsPage
