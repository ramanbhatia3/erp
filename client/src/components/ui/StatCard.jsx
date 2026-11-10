import Card from './Card'

const metricIcons = {
  departments: 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01',
  users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6',
  classes: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z',
  subjects: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z',
  attendance: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM8 15l2 2 5-5',
  results: 'M8 21h8M12 17v4M7 4h10v8a5 5 0 0 1-10 0V4ZM7 7H4v2a4 4 0 0 0 4 4M17 7h3v2a4 4 0 0 1-4 4',
  students: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6',
  placement: 'M3 7h18v13H3zM8 7V4h8v3M3 12h18M10 12v2h4v-2',
  applications: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8',
}

function getMetricIcon(label = '') {
  const key = label.toLowerCase()
  if (key.includes('department')) return metricIcons.departments
  if (key.includes('class')) return metricIcons.classes
  if (key.includes('subject')) return metricIcons.subjects
  if (key.includes('attendance')) return metricIcons.attendance
  if (key.includes('result')) return metricIcons.results
  if (key.includes('student') || key.includes('user')) return metricIcons.users
  if (key.includes('drive')) return metricIcons.placement
  if (key.includes('application')) return metricIcons.applications
  return metricIcons.results
}

function StatCard({ label, value, detail, icon }) {
  return (
    <Card className="group relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-400" />
      <div className="flex items-start justify-between gap-3 pt-1">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            {value}
          </p>
          {detail && (
            <p className="mt-2 text-xs font-medium text-slate-500">{detail}</p>
          )}
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 transition duration-200 group-hover:scale-105 group-hover:bg-blue-100">
          {icon || (
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path
                d={getMetricIcon(label)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      </div>
    </Card>
  )
}

export default StatCard
