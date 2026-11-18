import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Loader from '../components/ui/Loader'
import Table from '../components/ui/Table'
import {
  feeTypes,
  formatCurrency,
  getHostelLabel,
} from '../utils/studentServices'
import { getSemesterTerm } from '../utils/classDisplay'

function getErrorMessage(error) {
  return error.response?.data?.message || 'Unable to load your fee and hostel information.'
}

function getPaymentStatus(semester) {
  if (semester.balance <= 0) return { label: 'Paid', color: 'green' }
  if (semester.totalPaid > 0) return { label: 'Partially paid', color: 'yellow' }
  return { label: 'Unpaid', color: 'red' }
}

function FeeStatement({ semesters }) {
  const columns = [
    {
      key: 'semester',
      label: 'Semester',
      render: (semester) => (
        <div className="min-w-40">
          <p className="font-bold text-slate-950 dark:text-[#f1f3f6]">Semester {semester.semester}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#8a919e]">{getSemesterTerm(semester.semester)}</p>
        </div>
      ),
    },
    ...feeTypes.map(({ key, label }) => ({
      key,
      label,
      render: (semester) => (
        <div className="min-w-28">
          <p className="font-semibold text-slate-800 dark:text-[#f1f3f6]">
            {formatCurrency(semester.fees[key].amount)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#8a919e]">
            Paid {formatCurrency(semester.fees[key].paid)}
          </p>
        </div>
      ),
    })),
    {
      key: 'total',
      label: 'Total due',
      render: (semester) => formatCurrency(semester.total),
    },
    {
      key: 'totalPaid',
      label: 'Total paid',
      render: (semester) => formatCurrency(semester.totalPaid),
    },
    {
      key: 'balance',
      label: 'Balance',
      render: (semester) => (
        <span className="font-bold text-slate-950 dark:text-[#f1f3f6]">
          {formatCurrency(semester.balance)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (semester) => {
        const status = getPaymentStatus(semester)
        return <Badge color={status.color}>{status.label}</Badge>
      },
    },
  ]
  const totals = semesters.reduce(
    (result, semester) => ({
      due: result.due + semester.total,
      paid: result.paid + semester.totalPaid,
      balance: result.balance + semester.balance,
    }),
    { due: 0, paid: 0, balance: 0 },
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-[#f1f3f6]">My Fees</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
          Fee amounts and payments across all eight semesters. Payments are recorded by university administration; there is no in-app payment option.
        </p>
      </div>

      <Card className="grid gap-5 sm:grid-cols-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-[#8a919e]">Fees due · 8 semesters</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-[#f1f3f6]">{formatCurrency(totals.due)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-[#8a919e]">Recorded as paid</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">{formatCurrency(totals.paid)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-[#8a919e]">Outstanding balance</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-700 dark:text-amber-400">{formatCurrency(totals.balance)}</p>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950 dark:text-[#f1f3f6]">Semester fee details</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
            Odd semesters run July–December; even semesters run January–June.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            rows={semesters}
            getRowKey={(semester) => semester.semester}
            emptyMessage="No fee information is available."
          />
        </div>
      </Card>
    </div>
  )
}

function HostelAssignment({ services }) {
  const hasHostel = Boolean(services.hostel)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-[#f1f3f6]">My Hostel</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
          Your hostel and room allocation from university administration.
        </p>
      </div>
      <Card className="max-w-2xl space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-[#8a919e]">
            Assigned hostel
          </p>
          <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-[#f1f3f6]">
            {getHostelLabel(services.hostel)}
          </p>
        </div>
        <div className="border-t border-slate-100 dark:border-[#242730] pt-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-[#8a919e]">
            Room allocated
          </p>
          <p className="mt-2 text-xl font-bold text-slate-950 dark:text-[#f1f3f6]">
            {hasHostel && services.hostelRoom ? services.hostelRoom : 'Not assigned'}
          </p>
        </div>
        {!hasHostel && (
          <p className="border-t border-slate-100 dark:border-[#242730] pt-4 text-sm text-slate-500 dark:text-[#8a919e]">
            Contact the university administration if you need a hostel allocation.
          </p>
        )}
      </Card>
    </div>
  )
}

function StudentServicePage({ service }) {
  const [services, setServices] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get('/users/me/services')
      .then(({ data }) => {
        if (active) {
          setServices(data.services)
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

  if (loading) {
    return <Card><Loader label={`Loading your ${service.toLowerCase()} information...`} /></Card>
  }
  if (error) return <EmptyState title={`${service} unavailable`} message={error} />

  return service === 'Fees'
    ? <FeeStatement semesters={services.semesters} />
    : <HostelAssignment services={services} />
}

export default StudentServicePage
