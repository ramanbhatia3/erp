import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'

function SuperAdminDashboard({ user }) {
  return (
    <div className="space-y-6">
      <DashboardWelcome
        title="Super Admin"
        user={user}
        subtitle="Manage your university workspace, people, and academic operations from one place."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Departments" value="—" detail="University-wide" />
        <StatCard label="Users" value="—" detail="All active accounts" />
        <StatCard label="Classes" value="—" detail="Across departments" />
        <StatCard label="Subjects" value="—" detail="Current academic year" />
      </div>
      <Card>
        <EmptyState
          title="Your university overview is ready"
          message="Dashboard statistics and recent activity will appear here."
        />
      </Card>
    </div>
  )
}

export default SuperAdminDashboard
