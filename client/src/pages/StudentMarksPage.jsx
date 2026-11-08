import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Loader from '../components/ui/Loader'
import Select from '../components/ui/Select'
import Table from '../components/ui/Table'

function getErrorMessage(error) {
  return error.response?.data?.message || 'Unable to load your marks.'
}

function StudentMarksPage() {
  const [marks, setMarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [term, setTerm] = useState('')

  useEffect(() => {
    let active = true
    api.get('/marks/student/me')
      .then((response) => {
        if (active) {
          setMarks(response.data.marks)
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
        label: `Semester ${mark.semester} - ${mark.academicYear}`,
      })
    })
    return [...uniqueTerms.values()]
  }, [marks])

  const selectedTerm = terms.some((item) => item.value === term)
    ? term
    : terms[0]?.value || ''
  const visibleMarks = marks.filter(
    (mark) => `${mark.academicYear}:${mark.semester}` === selectedTerm,
  )

  const columns = [
    {
      key: 'subject',
      label: 'Subject',
      render: (mark) => (
        <div>
          <p className="font-medium text-slate-800">{mark.subject?.name || '—'}</p>
          <p className="text-xs text-slate-500">{mark.subject?.code || '—'}</p>
        </div>
      ),
    },
    {
      key: 'components',
      label: 'Component marks',
      render: (mark) => (
        <div className="space-y-1">
          {mark.calculation.components.map((component) => (
            <p key={component.name}>
              {component.name}: {component.marksObtained} / {component.maxMarks}
            </p>
          ))}
        </div>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      render: (mark) =>
        `${mark.calculation.total} / ${mark.calculation.maxTotal}`,
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
        <Badge color={mark.calculation.result === 'pass' ? 'green' : 'red'}>
          {mark.calculation.result}
        </Badge>
      ),
    },
  ]

  if (loading) {
    return <Card><Loader label="Loading your marks..." /></Card>
  }

  if (error) {
    return <EmptyState title="Marks unavailable" message={error} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Results</h1>
        <p className="mt-1 text-sm text-slate-500">
          View your subject marks by academic semester.
        </p>
      </div>

      {marks.length > 0 && (
        <Card className="max-w-md">
          <Select
            id="marks-semester"
            label="Semester"
            value={selectedTerm}
            onChange={(event) => setTerm(event.target.value)}
            options={terms}
          />
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Subject marks</h2>
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
      </Card>
    </div>
  )
}

export default StudentMarksPage
