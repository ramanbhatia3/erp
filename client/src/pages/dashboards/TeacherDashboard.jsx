import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'

function TeacherDashboard({ user }) {
  return (
    <div className="space-y-6">
      <DashboardWelcome
        title="Teaching"
        user={user}
        subtitle="Your classes, students, and teaching essentials are ready when you are."
      />
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
