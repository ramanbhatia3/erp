import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Loader from '../components/ui/Loader'
import Table from '../components/ui/Table'
import { getSemesterTerm } from '../utils/classDisplay'

function getErrorMessage(error) {
  return error.response?.data?.message || 'Unable to load your marks.'
}

function getSemesterOrdinal(value) {
  const semester = Number(value)
  const lastTwoDigits = semester % 100
  const suffix =
    lastTwoDigits >= 11 && lastTwoDigits <= 13
      ? 'th'
      : ({ 1: 'st', 2: 'nd', 3: 'rd' }[semester % 10] || 'th')
  return `${semester}${suffix}`
}

function formatMarks(value) {
  return Number.isInteger(value) ? value : Number(value).toFixed(2)
}

function StudentMarksPage() {
  const [marks, setMarks] = useState([])
  const [passingPercentage, setPassingPercentage] = useState(40)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [term, setTerm] = useState('')

  useEffect(() => {
    let active = true
    api.get('/marks/student/me')
      .then((response) => {
        if (active) {
          setMarks(response.data.marks)
          setPassingPercentage(response.data.passingPercentage)
          setError('')
        }
      })
      .catch((requestError) => {
        if (active) {
          const message = getErrorMessage(requestError)
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

  const terms = useMemo(() => {
    const uniqueTerms = new Map()
    marks.forEach((mark) => {
      const key = `${mark.academicYear}:${mark.semester}`
      uniqueTerms.set(key, {
        value: key,
        semester: mark.semester,
        academicYear: mark.academicYear,
      })
    })
    return [...uniqueTerms.values()].sort((first, second) =>
      second.academicYear.localeCompare(first.academicYear) ||
      second.semester - first.semester,
    )
  }, [marks])

  const selectedTerm = terms.some((item) => item.value === term)
    ? term
    : terms[0]?.value || ''
  const visibleMarks = marks.filter(
    (mark) => `${mark.academicYear}:${mark.semester}` === selectedTerm,
  )
  const totalMarks = visibleMarks.reduce(
    (sum, mark) => sum + mark.calculation.total,
    0,
  )
  const maxMarks = visibleMarks.reduce(
    (sum, mark) => sum + mark.calculation.maxTotal,
    0,
  )
  const percentage = maxMarks
    ? Number(((totalMarks / maxMarks) * 100).toFixed(2))
    : 0
  const passedCount = visibleMarks.filter(
    (mark) => mark.calculation.result === 'pass',
  ).length
  const failedCount = visibleMarks.filter(
    (mark) => mark.calculation.result === 'fail',
  ).length
  const incompleteCount = visibleMarks.filter(
    (mark) => mark.calculation.result === 'incomplete',
  ).length
  const resultLabel = !visibleMarks.length
    ? 'Not published'
    : incompleteCount
      ? 'In Progress'
      : failedCount
        ? 'Reappear'
        : 'Passed'
  const componentNames = [...new Set(
    visibleMarks.flatMap((mark) =>
      (mark.calculation.components || []).map((component) => component.name),
    ),
  )]
  const columns = [
    {
      key: 'subject',
      label: 'Subject',
      render: (mark) => (
        <div className="min-w-40">
          <p className="font-bold text-slate-950">{mark.subject?.name || '—'}</p>
          <p className="mt-1 text-xs text-slate-500">{mark.subject?.code || '—'}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (mark) => mark.subject?.type || '—',
    },
    {
      key: 'credits',
      label: 'Credits',
      render: () => <span title="Credit values are not configured">—</span>,
    },
    ...componentNames.map((name) => ({
      key: `component-${name}`,
      label: name,
      render: (mark) => {
        const component = mark.calculation.components?.find(
          (item) => item.name === name,
        )
        return component
          ? `${formatMarks(component.marksObtained)} / ${formatMarks(component.maxMarks)}`
          : '—'
      },
    })),
    {
      key: 'total',
      label: 'Total',
      render: (mark) =>
        `${formatMarks(mark.calculation.total)} / ${formatMarks(mark.calculation.maxTotal)}`,
    },
    {
      key: 'percentage',
      label: 'Percentage',
      render: (mark) => `${mark.calculation.percentage}%`,
    },
    {
      key: 'result',
      label: 'Result',
      render: (mark) => (
        <Badge color={
          mark.calculation.result === 'pass'
            ? 'green'
            : mark.calculation.result === 'incomplete'
              ? 'yellow'
              : 'red'
        }>
          {mark.calculation.result === 'pass'
            ? 'Pass'
            : mark.calculation.result === 'incomplete'
              ? 'In progress'
              : 'Reappear'}
        </Badge>
      ),
    },
    {
      key: 'remarks',
      label: 'Remarks',
      render: (mark) => mark.calculation.result === 'incomplete'
        ? 'Marks are still being entered'
        : mark.calculation.result === 'pass'
          ? 'Pass mark achieved'
          : `Below the ${passingPercentage}% pass mark`,
    },
  ]

  if (loading) {
    return <Card><Loader label="Loading your marks..." /></Card>
  }

  if (error) {
    return <EmptyState title="Results unavailable" message={error} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">My Results</h1>
        <p className="mt-1 text-sm text-slate-500">
          Semester-wise marks and outcomes published by your university.
        </p>
      </div>

      {terms.length > 0 && (
        <div
          aria-label="Result semesters"
          className="flex flex-wrap gap-2"
          role="tablist"
        >
          {terms.map((item) => (
            <button
              aria-selected={selectedTerm === item.value}
              className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                selectedTerm === item.value
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
              }`}
              key={item.value}
              onClick={() => setTerm(item.value)}
              role="tab"
              type="button"
            >
              <span>{getSemesterOrdinal(item.semester)} Semester</span>
              <span className="ml-2 text-xs opacity-70">
                {getSemesterTerm(item.semester)} · {item.academicYear}
              </span>
            </button>
          ))}
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-slate-200 bg-gradient-to-br from-blue-50 to-white p-6 lg:border-b-0 lg:border-r sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Result</p>
            <h2 className={`mt-2 text-3xl font-extrabold tracking-tight ${
              resultLabel === 'Reappear'
                ? 'text-red-700'
                : resultLabel === 'Passed'
                  ? 'text-emerald-600'
                  : resultLabel === 'In Progress'
                    ? 'text-amber-700'
                    : 'text-slate-500'
            }`}>
              {resultLabel}
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {failedCount > 0
                ? incompleteCount
                  ? `${failedCount} subject${failedCount === 1 ? '' : 's'} below the pass mark; ${incompleteCount} result${incompleteCount === 1 ? ' is' : 's are'} still being entered.`
                  : `${failedCount} subject${failedCount === 1 ? '' : 's'} to clear again.`
                : incompleteCount
                  ? `${incompleteCount} subject result${incompleteCount === 1 ? ' is' : 's are'} still being entered.`
                  : visibleMarks.length
                    ? 'All published subject marks meet the pass threshold.'
                    : 'Your results will appear here after marks are published.'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Pass threshold: {passingPercentage}%.
            </p>
          </div>
          <div className="p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">So far</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">Average percentage</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {visibleMarks.length ? `${percentage}%` : '—'}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Across published subject marks
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Credits earned</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">—</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Credit values are not configured
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Subjects passed</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {passedCount}/{visibleMarks.length}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Published results for this semester
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Subject results</h2>
          <p className="mt-1 text-sm text-slate-500">
            Complete results are out of 100. Incomplete results show entered categories and remain in progress; fractional category marks are rounded up.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            rows={visibleMarks}
            getRowKey={(mark) => mark._id}
            emptyMessage={
              marks.length
                ? 'No marks are available for this semester.'
                : 'Your marks have not been entered yet.'
            }
          />
        </div>
      </Card>
    </div>
  )
}

export default StudentMarksPage
