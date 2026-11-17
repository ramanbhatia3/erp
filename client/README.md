# RBPU Hub Web Client

The modern frontend application for RBPU Hub, built with **React 19**, **Vite**, **Tailwind CSS v4**, and **Motion**. It provides role-tailored dashboards and management workflows for Superadmins, Teachers, and Students.

---

## 1. Directory Structure

```text
client/
├── public/                   # Static favicon and assets
├── src/
│   ├── assets/               # University logos and media
│   ├── components/
│   │   ├── dashboard/        # Layout, navigation headers, profile cards
│   │   │   ├── DashboardLayout.jsx
│   │   │   ├── DashboardWelcome.jsx
│   │   │   └── StudentProfileCard.jsx
│   │   ├── ui/               # Reusable UI component library
│   │   │   ├── Badge.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── ConfirmDialog.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Loader.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── StatCard.jsx
│   │   │   └── Table.jsx
│   │   └── ProtectedRoute.jsx # Client-side role route gate
│   ├── context/
│   │   ├── AuthContext.jsx   # Authentication state & session manager
│   │   ├── authContextValue.js
│   │   └── useAuth.js        # Auth hook
│   ├── pages/                # Views & route controllers
│   │   ├── dashboards/       # Role-specific dashboard landing pages
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── SuperAdminDashboard.jsx
│   │   │   └── TeacherDashboard.jsx
│   │   ├── AnnouncementsPage.jsx
│   │   ├── ChangePasswordPage.jsx
│   │   ├── ClassesPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── DepartmentsPage.jsx
│   │   ├── EventsPage.jsx
│   │   ├── FeesHostelPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── SettingsPage.jsx
│   │   ├── StudentAttendancePage.jsx
│   │   ├── StudentMarksPage.jsx
│   │   ├── StudentServicePage.jsx
│   │   ├── StudentTimetablePage.jsx
│   │   ├── StudentUsersPage.jsx
│   │   ├── SubjectsPage.jsx
│   │   ├── TeacherAttendancePage.jsx
│   │   ├── TeacherMarksPage.jsx
│   │   ├── TeacherUsersPage.jsx
│   │   ├── TimetablePage.jsx
│   │   └── UnauthorizedPage.jsx
│   ├── services/
│   │   └── api.js            # Axios client with Bearer token interceptor
│   ├── utils/
│   │   ├── classDisplay.js   # Semester ordinal & cohort formatters
│   │   ├── dashboardPath.js  # Role path generators
│   │   └── studentServices.js
│   ├── App.jsx               # Root routes
│   └── main.jsx              # DOM entry point
├── .oxlintrc.json            # Oxlint configuration
├── index.html                # HTML template
├── package.json
└── vite.config.js            # Vite build configuration
```

---

## 2. Technology Highlights

- **React 19:** Utilizing modern hooks and state patterns.
- **Tailwind CSS v4:** Modern CSS-first engine via `@tailwindcss/vite`.
- **Motion:** Micro-interactions, animated route switches, and transitions (`motion/react`).
- **Data Visualization:** Academic analytics using `recharts`.
- **Notifications:** Toast alerts via `react-hot-toast`.
- **Linter:** `oxlint` for high-performance static analysis.

---

## 3. Environment Setup

Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL pointing to the Express API server | `http://localhost:5000/api` |

---

## 4. Available Scripts

Run these commands inside the `client/` folder:

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start the Vite development server (defaults to `http://localhost:5173`) |
| `npm run build` | Create a production-ready minified bundle in `dist/` |
| `npm run preview` | Locally preview the generated production build |
| `npm run lint` | Run the Oxlint linter on all source files |

---

## 5. User Workspaces & Dashboards

### Super Admin Workspace (`/dashboard/superadmin/*`)
- **Overview:** University stats (department count, teachers, cohorts, enrolled students).
- **Academic Structure:** Setup and manage departments, semester cohorts, subjects, and timetables.
- **User Management:** Comprehensive directory for teachers and students with search, filters, status toggling, and CSV bulk import.
- **Financial & Services:** Assign hostels, rooms, and transport. Record cumulative fee receipts.

### Teacher Workspace (`/dashboard/teacher/*`)
- **Teaching Overview:** Assigned classes, subjects, and total student counts.
- **Attendance Module:** Record lecture-by-lecture attendance with present/absent toggling. Edit past lectures for assigned classes.
- **Evaluation & Marks:** Submit MST 1/2, assignments, attendance, and final exam marks against the 100-mark scheme.
- **Timetable:** View weekly personal teaching schedule across lecture periods and rooms.

### Student Workspace (`/dashboard/student/*`)
- **Profile & Progress:** Calculated current semester, roll number, and personal profile updates.
- **Attendance Sheet:** Subject-by-subject attendance percentages, shortage alerts (< 75%), and historical log.
- **Report Card:** Transparent results breakdown across MSTs, assignments, and final exams with pass/fail status.
- **Services & Fees:** View fee balances, payments credited, and hostel/room allocations.
