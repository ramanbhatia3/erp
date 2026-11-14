import { useEffect, useMemo, useState } from 'react'
import { Link, useMatch, useNavigate } from 'react-router-dom'
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
import { formatClassLabel, sortClassesBySemester } from '../utils/classDisplay'

const emptyDepartmentForm = { name: '', code: '', hod: '' }
const emptyClassForm = { name: '', semester: '1', section: '', academicYear: '' }
const emptyStudentForm = {
  name: '',
  email: '',
  rollNo: '',
  password: '',
  confirmPassword: '',
}
const emptySubjectForm = { name: '', code: '', teacher: '' }

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback
}

function DepartmentsPage() {
  const navigate = useNavigate()
  const departmentMatch = useMatch('/dashboard/superadmin/departments/:departmentId')
  const classMatch = useMatch('/dashboard/superadmin/departments/:departmentId/classes/:classId')
  const departmentId = classMatch?.params.departmentId || departmentMatch?.params.departmentId || ''
  const classId = classMatch?.params.classId || ''

  const [departments, setDepartments] = useState([])
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])
  const [classDetails, setClassDetails] = useState({
    classId: '',
    reloadKey: -1,
    students: [],
    subjects: [],
    error: '',
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [detailReloadKey, setDetailReloadKey] = useState(0)
  const [search, setSearch] = useState('')
  const [advisorSelections, setAdvisorSelections] = useState({})
  const [savingAdvisor, setSavingAdvisor] = useState(false)

  const [departmentModalOpen, setDepartmentModalOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState(null)
  const [departmentForm, setDepartmentForm] = useState(emptyDepartmentForm)
  const [savingDepartment, setSavingDepartment] = useState(false)
  const [deletingDepartment, setDeletingDepartment] = useState(null)
  const [deletingDepartmentBusy, setDeletingDepartmentBusy] = useState(false)

  const [classModalOpen, setClassModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [classForm, setClassForm] = useState(emptyClassForm)
  const [savingClass, setSavingClass] = useState(false)
  const [deletingClass, setDeletingClass] = useState(null)
  const [deletingClassBusy, setDeletingClassBusy] = useState(false)

  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [studentForm, setStudentForm] = useState(emptyStudentForm)
  const [studentCredentials, setStudentCredentials] = useState(null)
  const [savingStudent, setSavingStudent] = useState(false)

  const [subjectModalOpen, setSubjectModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [subjectForm, setSubjectForm] = useState(emptySubjectForm)
  const [savingSubject, setSavingSubject] = useState(false)

  const selectedDepartment = departments.find((item) => item._id === departmentId)
  const selectedClass = classes.find((item) =>
    item._id === classId &&
    String(item.department?._id || item.department) === departmentId,
  )
  const advisorSelection = advisorSelections[classId] ?? selectedClass?.advisor?._id ?? ''
  const detailLoading = Boolean(
    classId && (classDetails.classId !== classId || classDetails.reloadKey !== detailReloadKey),
  )
  const students = classDetails.classId === classId ? classDetails.students : []
  const classSubjects = classDetails.classId === classId ? classDetails.subjects : []
  const detailError = classDetails.classId === classId ? classDetails.error : ''

  async function fetchDepartmentData() {
    const [departmentResponse, teacherResponse, classResponse] = await Promise.all([
      api.get('/departments'),
      api.get('/users/teachers'),
      api.get('/classes'),
    ])
    setDepartments(departmentResponse.data.departments)
    setTeachers(teacherResponse.data.teachers)
    setClasses(classResponse.data.classes)
    setLoadError('')
  }

  async function loadDepartmentData() {
    try {
      await fetchDepartmentData()
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load department data.')
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/departments'),
      api.get('/users/teachers'),
      api.get('/classes'),
    ])
      .then(([departmentResponse, teacherResponse, classResponse]) => {
        if (!active) return
        setDepartments(departmentResponse.data.departments)
        setTeachers(teacherResponse.data.teachers)
        setClasses(classResponse.data.classes)
        setLoadError('')
      })
      .catch((error) => {
        if (!active) return
        const message = getErrorMessage(error, 'Unable to load department data.')
        setLoadError(message)
        toast.error(message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!classId) return undefined

    let active = true
    Promise.all([
      api.get('/users', {
        params: { role: 'student', class: classId, active: 'true' },
      }),
      api.get(`/classes/${classId}/subjects`),
    ])
      .then(([studentResponse, subjectResponse]) => {
        if (!active) return
        setClassDetails({
          classId,
          reloadKey: detailReloadKey,
          students: studentResponse.data.users,
          subjects: subjectResponse.data.subjects,
          error: '',
        })
      })
      .catch((error) => {
        if (!active) return
        const message = getErrorMessage(error, 'Unable to load class details.')
        setClassDetails({
          classId,
          reloadKey: detailReloadKey,
          students: [],
          subjects: [],
          error: message,
        })
        toast.error(message)
      })

    return () => {
      active = false
    }
  }, [classId, detailReloadKey])

  const filteredDepartments = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return departments
    return departments.filter((department) =>
      `${department.name} ${department.code} ${department.hod?.name || ''}`
        .toLowerCase()
        .includes(value),
    )
  }, [departments, search])

  const departmentClasses = useMemo(
    () => sortClassesBySemester(classes.filter(
      (item) => String(item.department?._id || item.department) === departmentId,
    )),
    [classes, departmentId],
  )

  const departmentTeachers = useMemo(
    () => teachers.filter(
      (teacher) => String(teacher.department?._id || teacher.department) === departmentId,
    ),
    [teachers, departmentId],
  )

  async function handleDepartmentSubmit(event) {
    event.preventDefault()
    setSavingDepartment(true)
    const payload = {
      name: departmentForm.name.trim(),
      code: departmentForm.code.trim(),
      hod: departmentForm.hod || null,
    }

    try {
      if (editingDepartment) {
        await api.put(`/departments/${editingDepartment._id}`, payload)
        toast.success('Department updated.')
      } else {
        await api.post('/departments', payload)
        toast.success('Department created.')
      }
      setDepartmentModalOpen(false)
      setLoading(true)
      await loadDepartmentData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to save department.'))
    } finally {
      setSavingDepartment(false)
    }
  }

  async function handleDeleteDepartment() {
    if (!deletingDepartment) return
    setDeletingDepartmentBusy(true)
    try {
      await api.delete(`/departments/${deletingDepartment._id}`)
      toast.success('Department deleted.')
      setDeletingDepartment(null)
      setLoading(true)
      await loadDepartmentData()
      navigate('/dashboard/superadmin/departments')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to delete department.'))
    } finally {
      setDeletingDepartmentBusy(false)
    }
  }

  function openCreateDepartment() {
    setEditingDepartment(null)
    setDepartmentForm(emptyDepartmentForm)
    setDepartmentModalOpen(true)
  }

  function openEditDepartment(department) {
    setEditingDepartment(department)
    setDepartmentForm({
      name: department.name,
      code: department.code,
      hod: department.hod?._id || '',
    })
    setDepartmentModalOpen(true)
  }

  function openCreateClass() {
    setEditingClass(null)
    setClassForm(emptyClassForm)
    setClassModalOpen(true)
  }

  function openEditClass(classItem) {
    setEditingClass(classItem)
    setClassForm({
      name: classItem.name,
      semester: String(classItem.semester),
      section: classItem.section,
      academicYear: classItem.academicYear,
    })
    setClassModalOpen(true)
  }

  async function handleClassSubmit(event) {
    event.preventDefault()
    if (!selectedDepartment) return
    setSavingClass(true)
    const payload = {
      name: classForm.name.trim(),
      department: selectedDepartment._id,
      semester: Number(classForm.semester),
      section: classForm.section.trim(),
      academicYear: classForm.academicYear.trim(),
    }

    try {
      if (editingClass) {
        await api.put(`/classes/${editingClass._id}`, payload)
        toast.success('Class updated.')
      } else {
        await api.post('/classes', payload)
        toast.success('Class created.')
      }
      setClassModalOpen(false)
      setLoading(true)
      await loadDepartmentData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to save class.'))
    } finally {
      setSavingClass(false)
    }
  }

  async function handleDeleteClass() {
    if (!deletingClass) return
    setDeletingClassBusy(true)
    try {
      await api.delete(`/classes/${deletingClass._id}`)
      toast.success('Class deleted.')
      setDeletingClass(null)
      setLoading(true)
      await loadDepartmentData()
      if (classId === deletingClass._id) {
        navigate(`/dashboard/superadmin/departments/${departmentId}`)
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to delete class.'))
    } finally {
      setDeletingClassBusy(false)
    }
  }

  async function saveAdvisor() {
    if (!selectedClass) return
    setSavingAdvisor(true)
    try {
      const response = await api.put(`/users/classes/${selectedClass._id}/advisor`, {
        advisor: advisorSelection || null,
      })
      setClasses((current) =>
        current.map((item) => item._id === selectedClass._id ? response.data.class : item),
      )
      setAdvisorSelections((current) => ({
        ...current,
        [selectedClass._id]: response.data.class.advisor?._id || '',
      }))
      toast.success('Class incharge updated.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to update the class incharge.'))
    } finally {
      setSavingAdvisor(false)
    }
  }

  function openAddStudent() {
    setStudentForm({ ...emptyStudentForm })
    setStudentCredentials(null)
    setStudentModalOpen(true)
  }

  async function handleStudentSubmit(event) {
    event.preventDefault()
    if (!selectedDepartment || !selectedClass) return
    if (studentForm.password !== studentForm.confirmPassword) {
      toast.error('The passwords do not match.')
      return
    }

    setSavingStudent(true)
    try {
      const response = await api.post('/users', {
        name: studentForm.name.trim(),
        email: studentForm.email.trim(),
        role: 'student',
        department: selectedDepartment._id,
        class: selectedClass._id,
        section: selectedClass.section,
        rollNo: studentForm.rollNo.trim(),
        password: studentForm.password,
      })
      setStudentCredentials({
        name: response.data.user.name,
        email: response.data.user.email,
        password: studentForm.password,
      })
      setDetailReloadKey((key) => key + 1)
      toast.success('Student added to this class.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to add student to this class.'))
    } finally {
      setSavingStudent(false)
    }
  }

  function openAddSubject() {
    setEditingSubject(null)
    setSubjectForm(emptySubjectForm)
    setSubjectModalOpen(true)
  }

  function openEditSubject(subject) {
    setEditingSubject(subject)
    setSubjectForm({
      name: subject.name,
      code: subject.code,
      teacher: subject.teacher?._id || '',
    })
    setSubjectModalOpen(true)
  }

  async function handleSubjectSubmit(event) {
    event.preventDefault()
    if (!selectedDepartment || !selectedClass) return
    setSavingSubject(true)
    const payload = {
      name: subjectForm.name.trim(),
      code: subjectForm.code.trim(),
      department: selectedDepartment._id,
      class: selectedClass._id,
      teacher: subjectForm.teacher,
    }

    try {
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject._id}`, payload)
        toast.success('Subject and teacher assignment updated.')
      } else {
        await api.post('/subjects', payload)
        toast.success('Subject added to this class.')
      }
      setSubjectModalOpen(false)
      setDetailReloadKey((key) => key + 1)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to save subject.'))
    } finally {
      setSavingSubject(false)
    }
  }

  function updateForm(setter, event) {
    setter((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const screenTitle = classId
    ? 'Class details'
    : departmentId
      ? 'Department classes'
      : 'Departments'

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link className="font-medium text-blue-700 hover:underline" to="/dashboard/superadmin/departments">
          Departments
        </Link>
        {selectedDepartment && (
          <>
            <span aria-hidden="true">/</span>
            {selectedClass ? (
              <Link
                className="font-medium text-blue-700 hover:underline"
                to={`/dashboard/superadmin/departments/${selectedDepartment._id}`}
              >
                {selectedDepartment.name}
              </Link>
            ) : (
              <span className="font-semibold text-slate-700">{selectedDepartment.name}</span>
            )}
          </>
        )}
        {selectedClass && (
          <>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-slate-700">{formatClassLabel(selectedClass)}</span>
          </>
        )}
      </nav>

      {loading ? (
        <Card><Loader label={`Loading ${screenTitle.toLowerCase()}...`} /></Card>
      ) : loadError ? (
        <EmptyState
          title="Unable to load department data"
          message={loadError}
          action={<Button onClick={() => { setLoading(true); loadDepartmentData() }}>Try again</Button>}
        />
      ) : classId && (!selectedDepartment || !selectedClass) ? (
        <EmptyState
          title="Class not found in this department"
          message="The selected class may have been removed or belongs to another department."
          action={<Button onClick={() => navigate('/dashboard/superadmin/departments')}>Back to departments</Button>}
        />
      ) : departmentId && !selectedDepartment ? (
        <EmptyState
          title="Department not found"
          message="This department may have been removed."
          action={<Button onClick={() => navigate('/dashboard/superadmin/departments')}>Back to departments</Button>}
        />
      ) : classId ? (
        <ClassDetail
          department={selectedDepartment}
          classItem={selectedClass}
          students={students}
          subjects={classSubjects}
          teachers={departmentTeachers}
          loading={detailLoading}
          error={detailError}
          advisor={advisorSelection}
          onAdvisorChange={(value) => setAdvisorSelections((current) => ({
            ...current,
            [classId]: value,
          }))}
          onSaveAdvisor={saveAdvisor}
          savingAdvisor={savingAdvisor}
          onAddStudent={openAddStudent}
          onAddSubject={openAddSubject}
          onEditSubject={openEditSubject}
          onEditClass={() => openEditClass(selectedClass)}
          onDeleteClass={() => setDeletingClass(selectedClass)}
          onRetry={() => setDetailReloadKey((key) => key + 1)}
        />
      ) : departmentId ? (
        <DepartmentDetail
          department={selectedDepartment}
          classes={departmentClasses}
          onAddClass={openCreateClass}
          onEditDepartment={() => openEditDepartment(selectedDepartment)}
          onDeleteDepartment={() => setDeletingDepartment(selectedDepartment)}
          onEditClass={openEditClass}
          onDeleteClass={setDeletingClass}
        />
      ) : (
        <DepartmentList
          departments={filteredDepartments}
          classes={classes}
          search={search}
          onSearch={setSearch}
          onAddDepartment={openCreateDepartment}
          onEditDepartment={openEditDepartment}
          onDeleteDepartment={setDeletingDepartment}
        />
      )}

      <Modal
        isOpen={departmentModalOpen}
        onClose={() => !savingDepartment && setDepartmentModalOpen(false)}
        title={editingDepartment ? 'Edit department' : 'Add department'}
      >
        <form className="space-y-4" onSubmit={handleDepartmentSubmit}>
          <Input id="department-name" label="Department name" name="name" value={departmentForm.name} onChange={(event) => updateForm(setDepartmentForm, event)} maxLength={100} required placeholder="e.g. Computer Science" />
          <Input id="department-code" label="Department code" name="code" value={departmentForm.code} onChange={(event) => updateForm(setDepartmentForm, event)} maxLength={20} required placeholder="e.g. CSE" />
          <Select
            id="department-hod"
            label="Head of department (optional)"
            name="hod"
            value={departmentForm.hod}
            onChange={(event) => updateForm(setDepartmentForm, event)}
            options={[
              { value: '', label: 'No HOD assigned' },
              ...teachers.map((teacher) => ({ value: teacher._id, label: `${teacher.name} (${teacher.email})` })),
            ]}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDepartmentModalOpen(false)} disabled={savingDepartment}>Cancel</Button>
            <Button type="submit" disabled={savingDepartment}>{savingDepartment ? 'Saving...' : editingDepartment ? 'Save changes' : 'Create department'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={classModalOpen}
        onClose={() => !savingClass && setClassModalOpen(false)}
        title={editingClass ? 'Edit class' : 'Add class'}
      >
        <form className="space-y-4" onSubmit={handleClassSubmit}>
          <p className="text-sm text-slate-500">Department: {selectedDepartment?.name || '—'}</p>
          <Input id="class-name" label="Class name" name="name" value={classForm.name} onChange={(event) => updateForm(setClassForm, event)} maxLength={100} required placeholder="e.g. CSE" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="class-semester"
              label="Semester"
              name="semester"
              value={classForm.semester}
              onChange={(event) => updateForm(setClassForm, event)}
              options={Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: `Semester ${index + 1}` }))}
            />
            <Input id="class-section" label="Section" name="section" value={classForm.section} onChange={(event) => updateForm(setClassForm, event)} maxLength={20} required placeholder="e.g. A" />
          </div>
          <Input id="class-academic-year" label="Academic year" name="academicYear" value={classForm.academicYear} onChange={(event) => updateForm(setClassForm, event)} maxLength={20} required placeholder="e.g. 2026-27" />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setClassModalOpen(false)} disabled={savingClass}>Cancel</Button>
            <Button type="submit" disabled={savingClass}>{savingClass ? 'Saving...' : editingClass ? 'Save changes' : 'Create class'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={studentModalOpen}
        onClose={() => !savingStudent && setStudentModalOpen(false)}
        title={studentCredentials ? 'Student added' : `Add student to ${selectedClass ? formatClassLabel(selectedClass) : 'class'}`}
      >
        {studentCredentials ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">This password was set by an admin. Only an admin can change it later.</p>
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <p><strong>Name:</strong> {studentCredentials.name}</p>
              <p><strong>Email:</strong> {studentCredentials.email}</p>
              <p className="break-all"><strong>Temporary password:</strong> <code>{studentCredentials.password}</code></p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => { setStudentModalOpen(false); setStudentCredentials(null) }}>Done</Button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleStudentSubmit}>
            <Input id="student-name" label="Full name" name="name" value={studentForm.name} onChange={(event) => updateForm(setStudentForm, event)} maxLength={100} required />
            <Input id="student-email" label="Email" name="email" type="email" value={studentForm.email} onChange={(event) => updateForm(setStudentForm, event)} required />
            <Input id="student-roll" label="Roll number" name="rollNo" value={studentForm.rollNo} onChange={(event) => updateForm(setStudentForm, event)} maxLength={30} required />
            <Input id="student-password" label="Initial password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={studentForm.password} onChange={(event) => updateForm(setStudentForm, event)} required />
            <Input id="student-confirm-password" label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={studentForm.confirmPassword} onChange={(event) => updateForm(setStudentForm, event)} required />
            <p className="text-sm text-slate-500">
              {selectedDepartment?.name} · {selectedClass ? formatClassLabel(selectedClass) : ''}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setStudentModalOpen(false)} disabled={savingStudent}>Cancel</Button>
              <Button type="submit" disabled={savingStudent}>{savingStudent ? 'Adding...' : 'Add student'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={subjectModalOpen}
        onClose={() => !savingSubject && setSubjectModalOpen(false)}
        title={editingSubject ? 'Edit subject and teacher' : 'Add subject to this class'}
      >
        <form className="space-y-4" onSubmit={handleSubjectSubmit}>
          <Input id="subject-name" label="Subject name" name="name" value={subjectForm.name} onChange={(event) => updateForm(setSubjectForm, event)} maxLength={100} required placeholder="e.g. Mathematics" />
          <Input id="subject-code" label="Subject code" name="code" value={subjectForm.code} onChange={(event) => updateForm(setSubjectForm, event)} maxLength={20} required placeholder="e.g. MATH101" />
          <Select
            id="subject-teacher"
            label="Assigned teacher"
            name="teacher"
            value={subjectForm.teacher}
            onChange={(event) => updateForm(setSubjectForm, event)}
            required
            options={[
              { value: '', label: departmentTeachers.length ? 'Select teacher' : 'No active teachers in this department' },
              ...departmentTeachers.map((teacher) => ({ value: teacher._id, label: `${teacher.name} (${teacher.email})` })),
            ]}
          />
          {!departmentTeachers.length && (
            <p className="text-sm text-amber-700">Add an active teacher to this department before assigning this subject.</p>
          )}
          <p className="text-sm text-slate-500">
            {selectedDepartment?.name} · {selectedClass ? formatClassLabel(selectedClass) : ''}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setSubjectModalOpen(false)} disabled={savingSubject}>Cancel</Button>
            <Button type="submit" disabled={savingSubject || !departmentTeachers.length}>{savingSubject ? 'Saving...' : editingSubject ? 'Save changes' : 'Add subject'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingDepartment)}
        onClose={() => !deletingDepartmentBusy && setDeletingDepartment(null)}
        onConfirm={handleDeleteDepartment}
        title="Delete department?"
        message={`Delete ${deletingDepartment?.name || 'this department'}? This action cannot be undone.`}
        confirmLabel="Delete department"
        busy={deletingDepartmentBusy}
      />
      <ConfirmDialog
        isOpen={Boolean(deletingClass)}
        onClose={() => !deletingClassBusy && setDeletingClass(null)}
        onConfirm={handleDeleteClass}
        title="Delete class?"
        message={`Delete ${deletingClass ? formatClassLabel(deletingClass) : 'this class'}? Classes with students, subjects, or attendance cannot be deleted.`}
        confirmLabel="Delete class"
        busy={deletingClassBusy}
      />
    </div>
  )
}

function DepartmentList({ departments, classes, search, onSearch, onAddDepartment, onEditDepartment, onDeleteDepartment }) {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
          <p className="mt-1 text-sm text-slate-500">Choose a department to view its classes.</p>
        </div>
        <Button onClick={onAddDepartment}>Add department</Button>
      </div>
      <Card>
        <Input id="department-search" label="Search departments" type="search" placeholder="Search by name, code, or HOD..." value={search} onChange={(event) => onSearch(event.target.value)} />
      </Card>
      {departments.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => {
            const classCount = classes.filter(
              (item) => String(item.department?._id || item.department) === department._id,
            ).length
            return (
              <Card className="space-y-4" key={department._id}>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{department.name}</h2>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge color="blue">{department.code}</Badge>
                    <span className="text-sm text-slate-500">{classCount} classes</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">HOD: {department.hod?.name || 'Not assigned'}</p>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Link
                    className="inline-flex items-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
                    to={`/dashboard/superadmin/departments/${department._id}`}
                  >
                    Open department
                  </Link>
                  <Button variant="secondary" className="px-3" onClick={() => onEditDepartment(department)}>Edit</Button>
                  <Button variant="danger" className="px-3" onClick={() => onDeleteDepartment(department)}>Delete</Button>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          title={search ? 'No matching departments' : 'No departments yet'}
          message={search ? 'Try another search.' : 'Add your first department to get started.'}
          action={!search && <Button onClick={onAddDepartment}>Add department</Button>}
        />
      )}
    </>
  )
}

function DepartmentDetail({ department, classes, onAddClass, onEditDepartment, onDeleteDepartment, onEditClass, onDeleteClass }) {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{department.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {department.code} · HOD: {department.hod?.name || 'Not assigned'} · {classes.length} classes
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onEditDepartment}>Edit department</Button>
          <Button onClick={onAddClass}>Add class</Button>
          <Button variant="danger" onClick={onDeleteDepartment}>Delete department</Button>
        </div>
      </div>
      {classes.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((classItem) => (
            <Card className="space-y-4" key={classItem._id}>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{formatClassLabel(classItem)}</h2>
                <p className="mt-1 text-sm text-slate-500">Academic year {classItem.academicYear}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Class incharge: {classItem.advisor?.name || 'Not assigned'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Link
                  className="inline-flex items-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
                  to={`/dashboard/superadmin/departments/${department._id}/classes/${classItem._id}`}
                >
                  Open class
                </Link>
                <Button variant="secondary" className="px-3" onClick={() => onEditClass(classItem)}>Edit</Button>
                <Button variant="danger" className="px-3" onClick={() => onDeleteClass(classItem)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No classes in this department" message="Add the first class to get started." action={<Button onClick={onAddClass}>Add class</Button>} />
      )}
    </>
  )
}

function ClassDetail({
  department,
  classItem,
  students,
  subjects,
  teachers,
  loading,
  error,
  advisor,
  onAdvisorChange,
  onSaveAdvisor,
  savingAdvisor,
  onAddStudent,
  onAddSubject,
  onEditSubject,
  onEditClass,
  onDeleteClass,
  onRetry,
}) {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{formatClassLabel(classItem)}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {department.name} · Academic year {classItem.academicYear}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onEditClass}>Edit class</Button>
          <Button variant="danger" onClick={onDeleteClass}>Delete class</Button>
        </div>
      </div>

      <Card className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <Select
          id="class-incharge"
          label="Class incharge"
          value={advisor}
          onChange={(event) => onAdvisorChange(event.target.value)}
          options={[
            { value: '', label: 'No incharge assigned' },
            ...teachers.map((teacher) => ({ value: teacher._id, label: `${teacher.name} (${teacher.email})` })),
          ]}
        />
        <Button onClick={onSaveAdvisor} disabled={savingAdvisor}>
          {savingAdvisor ? 'Saving...' : 'Save incharge'}
        </Button>
      </Card>

      {loading ? (
        <Card><Loader label="Loading students, subjects, and teachers..." /></Card>
      ) : error ? (
        <EmptyState title="Unable to load class details" message={error} action={<Button onClick={onRetry}>Try again</Button>} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Students</h2>
                <p className="text-sm text-slate-500">{students.length} active students enrolled</p>
              </div>
              <Button onClick={onAddStudent}>Add student</Button>
            </div>
            {students.length ? (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {students.map((student) => (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" key={student._id}>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{student.name}</p>
                      <p className="break-all text-sm text-slate-500">{student.email}</p>
                    </div>
                    <Badge color="blue">{student.rollNo || 'No roll number'}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No students in this class yet" message="Add a student here to enroll them directly in this class." action={<Button onClick={onAddStudent}>Add student</Button>} />
            )}
          </Card>

          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Subjects and teachers</h2>
                <p className="text-sm text-slate-500">{subjects.length} subjects assigned to this class</p>
              </div>
              <Button onClick={onAddSubject}>Add subject</Button>
            </div>
            {subjects.length ? (
              <div className="space-y-3">
                {subjects.map((subject) => (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4" key={subject._id}>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{subject.name}</p>
                      <p className="text-sm text-slate-500">{subject.code}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-medium text-slate-800">{subject.teacher?.name || 'Teacher not assigned'}</p>
                      {subject.teacher?.email && <p className="text-xs text-slate-500">{subject.teacher.email}</p>}
                    </div>
                    <Button variant="secondary" className="px-3 py-1.5" onClick={() => onEditSubject(subject)}>Edit</Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No subjects assigned yet" message="Add the subjects for this class and explicitly choose each assigned teacher." action={<Button onClick={onAddSubject}>Add subject</Button>} />
            )}
          </Card>
        </div>
      )}
    </>
  )
}

export default DepartmentsPage
