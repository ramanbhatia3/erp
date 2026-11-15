import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'

function StudentServicePage({ service }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{service}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your {service.toLowerCase()} information and updates.
        </p>
      </div>
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">{service} details are not available yet</h2>
          <p className="mt-1 text-sm text-slate-500">
            This section will be updated when the university configures {service.toLowerCase()} services.
          </p>
        </div>
        <Badge color="slate">Not configured</Badge>
      </Card>
    </div>
  )
}

export default StudentServicePage
