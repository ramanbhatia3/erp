import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'

function TeacherDashboard({ user }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Teacher Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back, {user.name}.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="My Classes" value="—" />
        <StatCard label="Subjects" value="—" />
        <StatCard label="Students" value="—" />
      </div>
      <Card>
        <EmptyState
          title="Your teaching overview is ready"
          message="Your classes, subjects, and recent activity will appear here."
        />
      </Card>
    </div>
  )
}

export default TeacherDashboard
