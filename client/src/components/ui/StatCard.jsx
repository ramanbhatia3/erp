import Card from './Card'

function StatCard({ label, value, detail, icon }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
        </div>
        {icon && (
          <span className="rounded-lg bg-blue-50 p-2 text-lg text-blue-700">
            {icon}
          </span>
        )}
      </div>
    </Card>
  )
}

export default StatCard
