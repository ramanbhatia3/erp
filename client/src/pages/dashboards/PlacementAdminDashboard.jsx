import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'

function PlacementAdminDashboard({ user }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Placement Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back, {user.name}.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Placement Drives" value="—" />
        <StatCard label="Eligible Students" value="—" />
        <StatCard label="Applications" value="—" />
      </div>
      <Card>
        <EmptyState
          title="Your placement overview is ready"
          message="Placement drives, applications, and reports will appear here."
        />
      </Card>
    </div>
  )
}

export default PlacementAdminDashboard
