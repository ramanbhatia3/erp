import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'

function ClassAdvisorDashboard({ user }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Class Advisor Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Welcome back, {user.name}. Your advisee class at a glance.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Assigned Class" value="—" />
        <StatCard label="Students" value="—" />
        <StatCard label="Attendance" value="—" />
      </div>
      <Card>
        <EmptyState
          title="Your class overview is ready"
          message="Class details, attendance, and student updates will appear here."
        />
      </Card>
    </div>
  )
}

export default ClassAdvisorDashboard
