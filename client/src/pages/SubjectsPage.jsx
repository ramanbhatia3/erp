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
import useAuth from '../context/useAuth'
import { getSemesterTerm } from '../utils/classDisplay'

const blankForm = {
  name: '',
  code: '',
  department: '',
  class: '',
  teacher: '',
  type: 'Theory',
  credits: 3,
  isLab: false,
}

function messageFrom(error, fallback) {
  return error.response?.data?.message || fallback
}

function SubjectsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const isCreatingFromClass = searchParams.get('create') === '1'
  const canManage = user.role === 'superadmin'
  const [departments, setDepartments] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [teachersForDepartment, setTeachersForDepartment] = useState('')
  const [departmentId, setDepartmentId] = useState(
    () => canManage ? searchParams.get('department') || user.department || '' : '',
  )
  const [classId, setClassId] = useState(() => searchParams.get('class') || '')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(
    () => !canManage || Boolean(searchParams.get('class')),
  )
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [form, setForm] = useState(() => ({
    ...blankForm,
    department: canManage ? searchParams.get('department') || user.department || '' : '',
    class: searchParams.get('class') || '',
  }))
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
    const params = canManage && departmentId ? { department: departmentId } : {}

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
  }, [canManage, departmentId])

  useEffect(() => {
    let active = true
    if (canManage && !classId) return undefined

    const params = {}
    if (canManage && departmentId) params.department = departmentId
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
  }, [canManage, departmentId, classId, reloadKey])

  useEffect(() => {
    let active = true
    if (!modalOpen || !canManage || !form.department) {
      return undefined
    }

    api.get('/subjects/teachers')
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
    () => classes.filter((item) =>
      !canManage || !departmentId || item.department?._id === departmentId,
    ),
    [canManage, classes, departmentId],
  )

  const formClasses = useMemo(
    () => classes.filter((item) => item.department?._id === form.department),
    [classes, form.department],
  )
  const selectedFormClass = formClasses.find((item) => item._id === form.class)
  const isAppliedScienceFoundationClass =
    departments.some((item) => item._id === form.department && item.code === 'AS') &&
    [1, 2].includes(Number(selectedFormClass?.semester))

  const filteredSubjects = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return subjects

    return subjects.filter((item) =>
      `${item.name} ${item.code} ${item.class?.name || ''} ${item.teacher?.name || ''}`
        .toLowerCase()
        .includes(value),
    )
  }, [subjects, search])

  function chooseDepartment(value) {
    setLoading(!canManage)
    setLoadError('')
    setDepartmentId(value)
    setClassId('')
    if (canManage) setSubjects([])
  }

  function chooseClass(value) {
    setLoading(!canManage || Boolean(value))
    setLoadError('')
    setClassId(value)
    if (canManage && !value) setSubjects([])
  }

  function openCreate() {
    setEditingSubject(null)
    setForm({
      ...blankForm,
      department: departmentId,
      class: classId,
      type: 'Theory',
      credits: 3,
      isLab: false,
    })
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
      type: item.type || (item.isLab ? 'Lab' : 'Theory'),
      credits: item.credits !== undefined && item.credits !== null ? item.credits : (item.isLab ? 1 : 3),
      isLab: Boolean(item.isLab || item.type === 'Lab'),
    })
    setModalOpen(true)
  }

  function closeSubjectModal() {
    setModalOpen(false)
    if (searchParams.has('create')) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('create')
      setSearchParams(nextParams, { replace: true })
    }
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
      closeSubjectModal()
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
      key: 'type',
      label: 'Type',
      render: (item) => (
        <Badge color={item.isLab ? 'amber' : 'purple'}>
          {item.type || (item.isLab ? 'Lab' : 'Theory')}
        </Badge>
      ),
    },
    {
      key: 'credits',
      label: 'Credits',
      render: (item) => (
        <span className="font-semibold text-slate-800 dark:text-[#f1f3f6]">
          {item.credits !== undefined && item.credits !== null ? item.credits : '—'}
        </span>
      ),
    },
    {
      key: 'class',
      label: 'Class',
      render: (item) => item.class
        ? `${item.class.name} · Sem ${item.class.semester} · ${getSemesterTerm(item.class.semester)}`
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#f1f3f6]">Subjects</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
            {canManage ? 'Assign subjects to classes and teachers.' : 'Subjects assigned to you across departments.'}
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} disabled={!classId}>
            Add Subject
          </Button>
        )}
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
          <div className="text-sm text-slate-600 dark:text-[#b5bcc9]">
            Teaching assignments
            <p className="mt-2 font-semibold text-slate-900 dark:text-[#f1f3f6]">All departments</p>
          </div>
        )}
        <Select
          id="subject-class-filter"
          label="Class"
          value={classId}
          onChange={(event) => chooseClass(event.target.value)}
          disabled={canManage && !departmentId}
          options={[
            { value: '', label: canManage && !departmentId ? 'Select a department first' : 'All assigned classes' },
            ...visibleClasses.map((item) => ({
              value: item._id,
              label: `${item.name} · Sem ${item.semester} · ${getSemesterTerm(item.semester)}`,
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
      ) : canManage && !classId ? (
        <EmptyState
          title="Choose a class"
          message="Select a department and class to view or manage that class's subjects."
        />
      ) : filteredSubjects.length ? (
        <Card className="overflow-hidden p-0">
          <Table columns={columns} rows={filteredSubjects} getRowKey={(item) => item._id} />
        </Card>
      ) : (
        <EmptyState
          title={search ? 'No matching subjects' : classId ? 'No subjects in this class' : 'No subjects yet'}
          message={search
            ? 'Try another search.'
            : classId
              ? 'Add subjects for this class and choose each teacher explicitly.'
              : 'Subjects matching these filters will appear here.'}
          action={canManage && classId && !search ? <Button onClick={openCreate}>Add Subject</Button> : null}
        />
      )}

      <Modal
        isOpen={modalOpen || isCreatingFromClass}
        onClose={() => !saving && closeSubjectModal()}
        title={editingSubject ? 'Edit Subject' : 'Add Subject'}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input id="subject-name" label="Subject name" name="name" value={form.name} onChange={updateForm} required maxLength={100} placeholder="e.g. Mathematics" />
          <Input id="subject-code" label="Subject code" name="code" value={form.code} onChange={updateForm} required maxLength={20} placeholder="e.g. MATH101" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="subject-type"
              label="Subject type"
              name="type"
              value={form.type || 'Theory'}
              onChange={(e) => {
                const val = e.target.value
                const isLabVal = val === 'Lab'
                setForm((prev) => ({
                  ...prev,
                  type: val,
                  isLab: isLabVal,
                  credits: isLabVal ? (prev.credits === 3 || prev.credits === 4 ? 1 : prev.credits) : (prev.credits === 1 ? 3 : prev.credits),
                }))
              }}
              options={[
                { value: 'Theory', label: 'Theory (100 Marks: 40 Int + 60 Ext)' },
                { value: 'Lab', label: 'Lab / Practical (50 Marks: 30 Int + 20 Ext)' },
                { value: 'Practical', label: 'Practical / Project' },
                { value: 'Elective', label: 'Elective' },
                { value: 'Project', label: 'Project / Training' },
                { value: 'Mandatory', label: 'Mandatory (Non-credit)' },
              ]}
            />
            <Input
              id="subject-credits"
              label="Credits"
              name="credits"
              type="number"
              min="0"
              max="30"
              value={form.credits ?? 3}
              onChange={updateForm}
              required
            />
          </div>
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
                label: `${item.name} · Sem ${item.semester} · ${getSemesterTerm(item.semester)}`,
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
          {editingSubject?.sharedGroupId ? (
            <p className="text-sm text-blue-700">
              This subject is shared across the Applied Sciences classes in this semester. Changes apply to all of them.
            </p>
          ) : !editingSubject && isAppliedScienceFoundationClass ? (
            <p className="text-sm text-blue-700">
              This subject will be added to CSE, IT, ME, and CE in Applied Sciences for this semester.
            </p>
          ) : null}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeSubjectModal} disabled={saving}>Cancel</Button>
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
