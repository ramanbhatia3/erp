import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import Loader from '../components/ui/Loader'
import Select from '../components/ui/Select'
import {
  feeTypes,
  formatCurrency,
  getHostelLabel,
  getStudentSemesterFees,
} from '../utils/studentServices'
import { getSemesterTerm } from '../utils/classDisplay'

const hostelOptions = [
  { value: '', label: 'No hostel assigned' },
  { value: 'girls-hostel-a', label: 'Girls Hostel A' },
  { value: 'girls-hostel-b', label: 'Girls Hostel B' },
  { value: 'boys-hostel-a', label: 'Boys Hostel A' },
  { value: 'boys-hostel-b', label: 'Boys Hostel B' },
]

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback
}

function getCurrentSemesterRecord(student, semester) {
  return student.studentServices?.semesterFees?.find(
    (item) => item.semester === Number(semester),
  )
}

function FeeHostelStudentRow({ student, semester, onUpdate }) {
  const [savingAssignment, setSavingAssignment] = useState('')
  const [savingFees, setSavingFees] = useState(false)
  const [hostelRoom, setHostelRoom] = useState(
    student.studentServices?.hostelRoom || '',
  )
  const fees = getStudentSemesterFees(student, semester)
  const feeSummary = fees.reduce(
    (summary, fee) => ({
      due: summary.due + fee.amount,
      paid: summary.paid + fee.paid,
      balance: summary.balance + fee.balance,
    }),
    { due: 0, paid: 0, balance: 0 },
  )
  const [paidAmounts, setPaidAmounts] = useState(() => {
    const record = getCurrentSemesterRecord(student, semester)
    return {
      academic: record?.academicPaid || 0,
      hostel: record?.hostelPaid || 0,
      transportation: record?.transportationPaid || 0,
      exam: record?.examPaid || 0,
    }
  })

  async function updateAssignment(field, value) {
    setSavingAssignment(field)
    try {
      await api.patch(`/users/${student._id}/services`, { [field]: value })
      if (field === 'hostel' && value !== student.studentServices?.hostel) {
        setHostelRoom('')
      }
      onUpdate({
        ...student,
        studentServices: {
          ...student.studentServices,
          [field]: value,
          ...(field === 'hostel' && value !== student.studentServices?.hostel
            ? { hostelRoom: '' }
            : {}),
        },
      })
      toast.success(`${field === 'hostel' ? 'Hostel' : 'Transport'} assignment updated.`)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to update the student assignment.'))
    } finally {
      setSavingAssignment('')
    }
  }

  async function saveHostelRoom() {
    setSavingAssignment('hostelRoom')
    try {
      const room = hostelRoom.trim()
      await api.patch(`/users/${student._id}/services`, { hostelRoom: room })
      onUpdate({
        ...student,
        studentServices: {
          ...student.studentServices,
          hostelRoom: room,
        },
      })
      toast.success('Hostel room assignment updated.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to update the hostel room.'))
    } finally {
      setSavingAssignment('')
    }
  }

  async function savePaidAmounts(event) {
    event.preventDefault()
    setSavingFees(true)
    try {
      await api.patch(`/users/${student._id}/fees/${semester}`, {
        paid: Object.fromEntries(
          feeTypes.map(({ key }) => [key, Number(paidAmounts[key]) || 0]),
        ),
      })
      const currentServices = student.studentServices || {}
      const semesterFees = [...(currentServices.semesterFees || [])]
      const recordIndex = semesterFees.findIndex(
        (item) => item.semester === Number(semester),
      )
      const record = {
        semester: Number(semester),
        academicPaid: Number(paidAmounts.academic) || 0,
        hostelPaid: Number(paidAmounts.hostel) || 0,
        transportationPaid: Number(paidAmounts.transportation) || 0,
        examPaid: Number(paidAmounts.exam) || 0,
        assessedAcademic: fees.find((fee) => fee.key === 'academic').amount,
        assessedHostel: fees.find((fee) => fee.key === 'hostel').amount,
        assessedTransportation: fees.find((fee) => fee.key === 'transportation').amount,
        assessedExam: fees.find((fee) => fee.key === 'exam').amount,
      }
      if (recordIndex >= 0) semesterFees[recordIndex] = record
      else semesterFees.push(record)
      onUpdate({
        ...student,
        studentServices: { ...currentServices, semesterFees },
      })
      toast.success(`Semester ${semester} payments recorded.`)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to record fee payments.'))
    } finally {
      setSavingFees(false)
    }
  }

  const paymentStatus = feeSummary.balance === 0
    ? 'Paid'
    : feeSummary.paid
      ? 'Partially paid'
      : 'Unpaid'

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950 dark:text-[#f1f3f6]">{student.name}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
            {student.rollNo || 'No roll number'} · {student.email}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#8a919e]">
            {student.class?.name || 'Class not assigned'}
            {student.class?.semester ? ` · Semester ${student.class.semester}` : ''}
            {student.department?.code ? ` · ${student.department.code}` : ''}
          </p>
        </div>
        <div className="text-right">
          <Badge color={paymentStatus === 'Paid' ? 'green' : feeSummary.paid ? 'yellow' : 'red'}>
            {paymentStatus}
          </Badge>
          <p className="mt-2 text-xs text-slate-500 dark:text-[#8a919e]">
            Semester {semester} balance
          </p>
          <p className="text-lg font-bold text-slate-950 dark:text-[#f1f3f6]">
            {formatCurrency(feeSummary.balance)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 border-y border-slate-100 py-4 md:grid-cols-2 xl:grid-cols-3 dark:border-[#242730]">
        <Select
          id={`hostel-${student._id}`}
          label="Hostel assignment"
          value={student.studentServices?.hostel || ''}
          disabled={Boolean(savingAssignment) || savingFees}
          onChange={(event) => updateAssignment('hostel', event.target.value)}
          options={hostelOptions}
        />
        <div className="flex items-end gap-2">
          <Input
            id={`hostel-room-${student._id}`}
            label="Hostel room"
            placeholder="e.g. A-204"
            maxLength={30}
            value={hostelRoom}
            disabled={!student.studentServices?.hostel || Boolean(savingAssignment) || savingFees}
            onChange={(event) => setHostelRoom(event.target.value)}
          />
          <Button
            className="shrink-0"
            disabled={
              !student.studentServices?.hostel ||
              Boolean(savingAssignment) ||
              savingFees ||
              hostelRoom.trim() === (student.studentServices?.hostelRoom || '')
            }
            onClick={saveHostelRoom}
          >
            {savingAssignment === 'hostelRoom' ? 'Saving...' : 'Save room'}
          </Button>
        </div>
        <label className="flex min-h-[4.25rem] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-sm font-medium text-slate-700 dark:border-[#2b2e36] dark:bg-[#101216] dark:text-[#d1d6e0]">
          <input
            checked={Boolean(student.studentServices?.usesTransport)}
            disabled={Boolean(savingAssignment) || savingFees}
            onChange={(event) => updateAssignment('usesTransport', event.target.checked)}
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600 dark:border-[#383c46] dark:bg-[#181b22]"
          />
          <span>
            Uses university transport
            <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-[#8a919e]">
              {savingAssignment === 'usesTransport' ? 'Saving assignment...' : 'Transportation fee: ₹15,000 per semester'}
            </span>
          </span>
        </label>
      </div>

      <form className="space-y-4" onSubmit={savePaidAmounts}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-[#f1f3f6]">
              Semester {semester} fee payments
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-[#8a919e]">
              {getSemesterTerm(semester)}. Record cumulative paid amounts; each is capped at its assessed fee.
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#8a919e]">
            Assigned hostel: {getHostelLabel(student.studentServices?.hostel)}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {fees.map((fee) => (
            <Input
              key={fee.key}
              id={`paid-${student._id}-${semester}-${fee.key}`}
              label={`${fee.label} paid (due ${formatCurrency(fee.amount)})`}
              type="number"
              min="0"
              max={fee.amount}
              step="0.01"
              value={paidAmounts[fee.key]}
              onChange={(event) =>
                setPaidAmounts((current) => ({
                  ...current,
                  [fee.key]: event.target.value,
                }))
              }
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600 dark:text-[#b5bcc9]">
            Due {formatCurrency(feeSummary.due)} · Paid {formatCurrency(feeSummary.paid)}
          </p>
          <Button type="submit" disabled={savingFees || Boolean(savingAssignment)}>
            {savingFees ? 'Saving...' : 'Save fee payments'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function FeesHostelPage() {
  const [students, setStudents] = useState([])
  const [semester, setSemester] = useState('1')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get('/users', { params: { role: 'student' } })
      .then(({ data }) => {
        if (active) {
          setStudents(data.users)
          setError('')
        }
      })
      .catch((requestError) => {
        if (active) {
          const message = getErrorMessage(requestError, 'Unable to load students.')
          setError(message)
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

  const visibleStudents = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return students
    return students.filter((student) =>
      [student.name, student.email, student.rollNo, student.department?.code]
        .some((value) => String(value || '').toLowerCase().includes(term)),
    )
  }, [students, search])

  function updateStudent(updatedStudent) {
    setStudents((current) =>
      current.map((student) =>
        student._id === updatedStudent._id ? updatedStudent : student,
      ),
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-[#f1f3f6]">Fees & Hostel</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
          Assign student hostels and rooms, manage transport use, and record semester fee payments.
        </p>
      </div>

      <Card className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Input
          id="student-search"
          label="Find a student"
          placeholder="Search name, email, roll number, or department"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          id="semester-filter"
          label="Fee semester"
          value={semester}
          onChange={(event) => setSemester(event.target.value)}
          options={Array.from({ length: 8 }, (_, index) => ({
            value: String(index + 1),
            label: `Semester ${index + 1} · ${getSemesterTerm(index + 1)}`,
          }))}
        />
      </Card>

      {loading ? (
        <Card><Loader label="Loading student fee and hostel records..." /></Card>
      ) : error ? (
        <EmptyState title="Student records unavailable" message={error} />
      ) : visibleStudents.length ? (
        <div className="space-y-4">
          {visibleStudents.map((student) => (
            <FeeHostelStudentRow
              key={`${student._id}-${semester}`}
              student={student}
              semester={semester}
              onUpdate={updateStudent}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No students found"
          message={search ? 'Try another search.' : 'Create student accounts to manage their fees and hostel assignments.'}
        />
      )}
    </div>
  )
}

export default FeesHostelPage
