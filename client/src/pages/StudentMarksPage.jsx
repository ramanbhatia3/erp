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

function isLabSubjectMark(m) {
  // If it has MST components or maxTotal is 100, it's definitely a Theory subject
  if (
    m.calculation?.maxTotal === 100 ||
    (m.components || []).some((c) => c.name.startsWith('MST')) ||
    (m.calculation?.components || []).some((c) => c.name.startsWith('MST'))
  ) {
    return false
  }

  // If it has Lab components or maxTotal is 50 or subject is marked as lab
  if (
    m.calculation?.maxTotal === 50 ||
    m.subject?.isLab === true ||
    m.subject?.type === 'Lab' ||
    (m.components || []).some(
      (c) =>
        c.name.startsWith('Viva') ||
        c.name.includes('Lab Record') ||
        c.group === 'lab_internal' ||
        c.group === 'lab_external',
    ) ||
    (m.calculation?.components || []).some(
      (c) =>
        c.name.startsWith('Viva') ||
        c.name.includes('Lab Record') ||
        c.group === 'lab_internal' ||
        c.group === 'lab_external',
    ) ||
    (typeof m.subject?.name === 'string' && /\b(lab|laboratory|workshop)\b/i.test(m.subject.name))
  ) {
    return true
  }

  return false
}

function getTheoryBreakdown(mark) {
  const comps = mark.calculation?.components || []
  let internal = 0
  let external = 0
  for (const c of comps) {
    if (c.name.includes('Final Exam') || c.name.includes('External') || c.group === 'final' || c.group === 'lab_external') {
      external += c.marksObtained
    } else {
      internal += c.marksObtained
    }
  }
  return {
    internal,
    external,
    total: mark.calculation.total,
    maxTotal: mark.calculation.maxTotal || 100,
  }
}

function getLabBreakdown(mark) {
  const comps = mark.calculation?.components || []
  let internal = 0
  let external = 0
  for (const c of comps) {
    if (c.name.includes('Final Exam') || c.name.includes('External') || c.group === 'final' || c.group === 'lab_external') {
      external += c.marksObtained
    } else {
      internal += c.marksObtained
    }
  }
  return {
    internal,
    external,
    total: mark.calculation.total,
    maxTotal: mark.calculation.maxTotal || 50,
  }
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

  const theoryMarks = visibleMarks.filter((m) => !isLabSubjectMark(m))
  const labMarks = visibleMarks.filter((m) => isLabSubjectMark(m))

  // Overall statistics
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
  const totalCredits = visibleMarks.reduce(
    (sum, m) => sum + (typeof m.subject?.credits === 'number' ? m.subject.credits : 0),
    0,
  )
  const earnedCredits = visibleMarks
    .filter((m) => m.calculation?.result === 'pass')
    .reduce(
      (sum, m) => sum + (typeof m.subject?.credits === 'number' ? m.subject.credits : 0),
      0,
    )
  const hasConfiguredCredits = visibleMarks.some(
    (m) => typeof m.subject?.credits === 'number' && m.subject.credits > 0,
  )
  const resultLabel = !visibleMarks.length
    ? 'Not published'
    : incompleteCount
      ? 'In Progress'
      : failedCount
        ? 'Reappear'
        : 'Passed'

  // Theory result statistics
  const theoryTotalMarks = theoryMarks.reduce((sum, mark) => sum + mark.calculation.total, 0)
  const theoryMaxMarks = theoryMarks.reduce((sum, mark) => sum + mark.calculation.maxTotal, 0)
  const theoryPercentage = theoryMaxMarks
    ? Number(((theoryTotalMarks / theoryMaxMarks) * 100).toFixed(2))
    : 0
  const theoryPassedCount = theoryMarks.filter((m) => m.calculation.result === 'pass').length
  const theoryFailedCount = theoryMarks.filter((m) => m.calculation.result === 'fail').length
  const theoryIncompleteCount = theoryMarks.filter((m) => m.calculation.result === 'incomplete').length
  const theoryTotalCredits = theoryMarks.reduce(
    (sum, m) => sum + (typeof m.subject?.credits === 'number' ? m.subject.credits : 0),
    0,
  )
  const theoryEarnedCredits = theoryMarks
    .filter((m) => m.calculation?.result === 'pass')
    .reduce(
      (sum, m) => sum + (typeof m.subject?.credits === 'number' ? m.subject.credits : 0),
      0,
    )
  const theoryResultLabel = !theoryMarks.length
    ? 'Not published'
    : theoryIncompleteCount
      ? 'In Progress'
      : theoryFailedCount
        ? 'Reappear'
        : 'Passed'

  // Lab result statistics
  const labTotalMarks = labMarks.reduce((sum, mark) => sum + mark.calculation.total, 0)
  const labMaxMarks = labMarks.reduce((sum, mark) => sum + mark.calculation.maxTotal, 0)
  const labPercentage = labMaxMarks
    ? Number(((labTotalMarks / labMaxMarks) * 100).toFixed(2))
    : 0
  const labPassedCount = labMarks.filter((m) => m.calculation.result === 'pass').length
  const labFailedCount = labMarks.filter((m) => m.calculation.result === 'fail').length
  const labIncompleteCount = labMarks.filter((m) => m.calculation.result === 'incomplete').length
  const labTotalCredits = labMarks.reduce(
    (sum, m) => sum + (typeof m.subject?.credits === 'number' ? m.subject.credits : 0),
    0,
  )
  const labEarnedCredits = labMarks
    .filter((m) => m.calculation?.result === 'pass')
    .reduce(
      (sum, m) => sum + (typeof m.subject?.credits === 'number' ? m.subject.credits : 0),
      0,
    )
  const labResultLabel = !labMarks.length
    ? 'Not published'
    : labIncompleteCount
      ? 'In Progress'
      : labFailedCount
        ? 'Reappear'
        : 'Passed'

  const theoryComponentNames = useMemo(() => {
    const names = [...new Set(
      theoryMarks.flatMap((mark) =>
        (mark.calculation.components || []).map((component) => component.name),
      ),
    )]
    const order = ['MST 1', 'MST 2', 'MST Average', 'Assignment 1', 'Assignment 2', 'Assignment 3', 'Assignment Average', 'Attendance']
    return names.sort((a, b) => {
      const idxA = order.indexOf(a)
      const idxB = order.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.localeCompare(b)
    })
  }, [theoryMarks])

  const labComponentNames = useMemo(() => {
    const names = [...new Set(
      labMarks.flatMap((mark) =>
        (mark.calculation.components || []).map((component) => component.name),
      ),
    )]
    const order = ['Viva 1', 'Viva 2', 'Lab Record']
    return names.sort((a, b) => {
      const idxA = order.indexOf(a)
      const idxB = order.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.localeCompare(b)
    })
  }, [labMarks])

  const theoryColumns = [
    {
      key: 'subject',
      label: 'Theory Subject',
      render: (mark) => (
        <div className="min-w-40">
          <p className="font-bold text-slate-950 dark:text-[#f1f3f6]">{mark.subject?.name || '—'}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#8a919e]">{mark.subject?.code || '—'}</p>
        </div>
      ),
    },
    {
      key: 'credits',
      label: 'Credits',
      render: (mark) =>
        mark.subject?.credits !== undefined && mark.subject?.credits !== null
          ? mark.subject.credits
          : '—',
    },
    ...theoryComponentNames
      .filter((name) => !name.includes('Final Exam') && !name.includes('External'))
      .map((name) => ({
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
      key: 'internal',
      label: 'Internal (40)',
      render: (mark) => {
        const { internal } = getTheoryBreakdown(mark)
        return (
          <span className="font-semibold text-slate-900 dark:text-[#f1f3f6]">
            {formatMarks(internal)} <span className="text-xs font-normal text-slate-400 dark:text-[#8a919e]">/ 40</span>
          </span>
        )
      },
    },
    {
      key: 'external',
      label: 'External (60)',
      render: (mark) => {
        const { external } = getTheoryBreakdown(mark)
        return (
          <span className="font-semibold text-slate-900 dark:text-[#f1f3f6]">
            {formatMarks(external)} <span className="text-xs font-normal text-slate-400 dark:text-[#8a919e]">/ 60</span>
          </span>
        )
      },
    },
    {
      key: 'total',
      label: 'Total (100)',
      render: (mark) => (
        <span className="font-bold text-slate-950 dark:text-white">
          {formatMarks(mark.calculation.total)} <span className="text-xs font-normal text-slate-400 dark:text-[#8a919e]">/ {formatMarks(mark.calculation.maxTotal)}</span>
        </span>
      ),
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

  const labColumns = [
    {
      key: 'subject',
      label: 'Lab Subject',
      render: (mark) => (
        <div className="min-w-40">
          <p className="font-bold text-slate-950 dark:text-[#f1f3f6]">{mark.subject?.name || '—'}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#8a919e]">{mark.subject?.code || '—'}</p>
        </div>
      ),
    },
    {
      key: 'credits',
      label: 'Credits',
      render: (mark) =>
        mark.subject?.credits !== undefined && mark.subject?.credits !== null
          ? mark.subject.credits
          : '—',
    },
    ...labComponentNames
      .filter((name) => !name.includes('Final Exam') && !name.includes('External'))
      .map((name) => ({
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
      key: 'internal',
      label: 'Internal (30)',
      render: (mark) => {
        const { internal } = getLabBreakdown(mark)
        return (
          <span className="font-semibold text-emerald-800 dark:text-emerald-400">
            {formatMarks(internal)} <span className="text-xs font-normal text-slate-400 dark:text-[#8a919e]">/ 30</span>
          </span>
        )
      },
    },
    {
      key: 'external',
      label: 'External (20)',
      render: (mark) => {
        const { external } = getLabBreakdown(mark)
        return (
          <span className="font-semibold text-emerald-800 dark:text-emerald-400">
            {formatMarks(external)} <span className="text-xs font-normal text-slate-400 dark:text-[#8a919e]">/ 20</span>
          </span>
        )
      },
    },
    {
      key: 'total',
      label: 'Total (50)',
      render: (mark) => (
        <span className="font-bold text-slate-950 dark:text-white">
          {formatMarks(mark.calculation.total)} <span className="text-xs font-normal text-slate-400 dark:text-[#8a919e]">/ {formatMarks(mark.calculation.maxTotal)}</span>
        </span>
      ),
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
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">My Results</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
          Semester-wise marks, course evaluations, and result outcomes published by your university.
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
                  ? 'border-slate-950 bg-slate-950 text-white dark:border-[#2563eb] dark:bg-[#1d4ed8] dark:text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-[#2b2e36] dark:bg-[#181b22] dark:text-[#b5bcc9] dark:hover:border-[#3e434f]'
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

      {/* Overall Semester Result Overview Card */}
      <Card className="overflow-hidden p-0">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
          <div className="border-b border-slate-200 bg-gradient-to-br from-blue-50 to-white p-6 lg:border-b-0 lg:border-r sm:p-8 dark:border-[#242730] dark:from-[#13151a] dark:to-[#181b22]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-[#8a919e]">Semester Result</p>
            <h2 className={`mt-2 text-3xl font-extrabold tracking-tight ${
              resultLabel === 'Reappear'
                ? 'text-red-700 dark:text-rose-400'
                : resultLabel === 'Passed'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : resultLabel === 'In Progress'
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-slate-500 dark:text-[#8a919e]'
            }`}>
              {resultLabel}
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-[#b5bcc9]">
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
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-[#8a919e]">
              <span>Pass threshold: <strong className="text-slate-700 dark:text-[#f1f3f6]">{passingPercentage}%</strong></span>
              <span>·</span>
              <span>Overall Average: <strong className="text-slate-700 dark:text-[#f1f3f6]">{visibleMarks.length ? `${percentage}%` : '—'}</strong></span>
              <span>·</span>
              <span>Cleared: <strong className="text-slate-700 dark:text-[#f1f3f6]">{passedCount}/{visibleMarks.length}</strong></span>
              <span>·</span>
              <span>Credits: <strong className="text-slate-700 dark:text-[#f1f3f6]">{hasConfiguredCredits ? `${earnedCredits}/${totalCredits}` : '—'}</strong></span>
            </div>
          </div>
          <div className="p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Theory Result Card */}
              <div className="rounded-xl border border-blue-200/70 bg-gradient-to-br from-blue-50/70 to-white p-4.5 dark:border-blue-900/40 dark:bg-gradient-to-br dark:from-[#111927] dark:to-[#151a24]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    Theory Result
                  </span>
                  <Badge color={theoryResultLabel === 'Passed' ? 'green' : theoryResultLabel === 'In Progress' ? 'yellow' : 'red'}>
                    {theoryResultLabel}
                  </Badge>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-slate-950 dark:text-white">
                    {theoryMarks.length ? `${theoryPercentage}%` : '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-[#8a919e]">
                    {theoryMarks.length ? `${theoryTotalMarks} / ${theoryMaxMarks} total marks` : 'No theory subjects'}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-blue-100 pt-2 text-xs text-slate-600 dark:border-blue-900/30 dark:text-[#b5bcc9]">
                  <span>Passed: <strong className="text-slate-800 dark:text-white">{theoryPassedCount}/{theoryMarks.length}</strong></span>
                  <span>Credits: <strong className="text-slate-800 dark:text-white">{theoryEarnedCredits}/{theoryTotalCredits}</strong></span>
                </div>
              </div>

              {/* Lab Result Card */}
              <div className="rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 to-white p-4.5 dark:border-emerald-900/40 dark:bg-gradient-to-br dark:from-[#0d1f19] dark:to-[#121c18]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Lab &amp; Practical Result
                  </span>
                  <Badge color={labResultLabel === 'Passed' ? 'green' : labResultLabel === 'In Progress' ? 'yellow' : 'red'}>
                    {labResultLabel}
                  </Badge>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-slate-950 dark:text-white">
                    {labMarks.length ? `${labPercentage}%` : '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-[#8a919e]">
                    {labMarks.length ? `${labTotalMarks} / ${labMaxMarks} total marks` : 'No lab subjects'}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-emerald-100 pt-2 text-xs text-slate-600 dark:border-emerald-900/30 dark:text-[#b5bcc9]">
                  <span>Passed: <strong className="text-slate-800 dark:text-white">{labPassedCount}/{labMarks.length}</strong></span>
                  <span>Credits: <strong className="text-slate-800 dark:text-white">{labEarnedCredits}/{labTotalCredits}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Theory Subjects Table */}
      <Card className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-950 dark:text-[#f1f3f6]">Theory Subjects</h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                100 Marks (40 Internal + 60 External)
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
              Evaluated on MSTs (24), Assignments (10), Attendance (6), and Final Exam (60). Pass mark: {passingPercentage}%.
            </p>
          </div>
          {theoryMarks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge color={theoryResultLabel === 'Passed' ? 'green' : theoryResultLabel === 'In Progress' ? 'yellow' : 'red'}>
                Theory: {theoryResultLabel}
              </Badge>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-[#20232a] dark:text-[#d1d6e0]">
                {theoryTotalMarks} / {theoryMaxMarks} ({theoryPercentage}%)
              </span>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table
            columns={theoryColumns}
            rows={theoryMarks}
            getRowKey={(mark) => mark._id}
            emptyMessage="No theory marks recorded for this semester."
          />
        </div>
      </Card>

      {/* Practical & Lab Subjects Table */}
      <Card className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-950 dark:text-[#f1f3f6]">Practical &amp; Lab Subjects</h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                50 Marks (30 Internal + 20 External)
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
              Evaluated on Viva 1 (10), Viva 2 (10), Lab Record (10), and Final Exam (20). Pass mark: {passingPercentage}%.
            </p>
          </div>
          {labMarks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge color={labResultLabel === 'Passed' ? 'green' : labResultLabel === 'In Progress' ? 'yellow' : 'red'}>
                Lab: {labResultLabel}
              </Badge>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                {labTotalMarks} / {labMaxMarks} ({labPercentage}%)
              </span>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table
            columns={labColumns}
            rows={labMarks}
            getRowKey={(mark) => mark._id}
            emptyMessage="No practical or lab marks recorded for this semester."
          />
        </div>
      </Card>
    </div>
  )
}

export default StudentMarksPage
