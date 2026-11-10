import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'

function ClassAdvisorDashboard({ user }) {
  return (
    <div className="space-y-6">
      <DashboardWelcome
        title="Class advisor"
        user={user}
        subtitle="Keep your advisee class, student progress, and attendance in view."
      />
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
