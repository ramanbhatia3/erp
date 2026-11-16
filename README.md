# RBPU Hub

RBPU Hub is a role-based university portal for managing academic operations in one place. It pairs a React web client with an Express API and MongoDB, with focused workspaces for superadmins, teachers, and students.

> **Project status:** Core account, academic-record, and administration workflows are available for the three supported roles.

## What works today

- **Sign-in and account protection:** JWT-backed login, current-user lookup, role-aware routes, and a forced password-change flow for first-time accounts.
- **University setup:** Superadmins can manage departments, semester-specific classes (Semesters 1–8), subjects and their teachers, academic settings, and user accounts. The academic year is calculated automatically on a July–June cycle (for example, November 2026 is 2026-27 and March 2025 is 2024-25); new classes inherit the current year. Subjects are assigned to a class and inherit its semester. Student accounts store their program and the year their first semester starts; their department and class are automatically assigned from that program and calculated semester.
- **Attendance:** Teachers can record and edit attendance for their assigned classes. Students can review their own attendance.
- **Marks:** Teachers and superadmins can record and edit two MSTs, three assignments, attendance, and final exam marks. MST and assignment averages are rounded up; results total 100 marks. Superadmins can also enter marks for inactive students and alumni.
- **Fees and hostels:** Superadmins assign one of four hostels and a room, record transport usage, and maintain fee payments across eight semesters. Students can view all semester fees separately from their hostel and room assignment; payments are not processed in the app.
- **Announcements and events:** Superadmins can publish announcements and manage events. Teachers can view relevant announcements and events but cannot post or edit them.
- **Timetables:** Superadmins can generate class schedules. Teachers can view their personal timetable.
- **Health check:** `GET /api/health` reports whether the API process is responding.
- **Role-specific dashboards:** Superadmins see university counts and department/class assignments; teachers see their assigned classes, subjects, and student counts; students see their attendance and marks.

## Technology

- **Client:** React, Vite, React Router, Tailwind CSS, Axios
- **API:** Node.js, Express, Mongoose, JWT
- **Database:** MongoDB

## Repository layout

```text
client/   React application
server/   Express API, MongoDB models, and superadmin seed script
```

## Run locally

You will need Node.js/npm and a MongoDB instance.

1. Configure the API:

   ```powershell
   cd server
   Copy-Item .env.example .env
   ```

   Set `MONGO_URI`, `JWT_SECRET`, and the `SUPERADMIN_*` values in `server/.env`. Use a unique, securely generated JWT secret and a strong initial password; do not commit `.env`.

2. Install API dependencies and create the initial superadmin account:

   ```powershell
   npm install
   npm run seed
   ```

   The seed script creates the account only if it does not already exist. It will not change an existing superadmin.

3. Start the API in a terminal:

   ```powershell
   npm run dev
   ```

   The API defaults to `http://localhost:5000`; `CLIENT_URL` controls the allowed client origin.

4. In a second terminal, configure and start the client:

   ```powershell
   cd client
   Copy-Item .env.example .env
   npm install
   npm run dev
   ```

   The client defaults to `http://localhost:5173` and uses `VITE_API_URL` (default: `http://localhost:5000/api`) to locate the API.

Log in with the superadmin email and password configured in `server/.env`. The superadmin can then set up departments, semester-specific classes, subjects, and accounts. Existing student accounts without a starting year are assigned 2023 (Semester 1 began August 2023); new students must have their own starting year.

## Available scripts

Run these commands from their respective package directories:

| Directory | Command | Purpose |
| --- | --- | --- |
| `client` | `npm run dev` | Start the Vite development server |
| `client` | `npm run build` | Create a production client build |
| `client` | `npm run preview` | Preview the production client build |
| `client` | `npm run lint` | Run Oxlint |
| `server` | `npm run dev` | Start the API with Nodemon |
| `server` | `npm start` | Start the API with Node.js |
| `server` | `npm run seed` | Create the configured initial superadmin |

## API areas

All API routes are under `/api`:

| Area | Base path | Purpose |
| --- | --- | --- |
| Health | `/health` | API health response |
| Authentication | `/auth` | Login, current account, password change |
| Departments | `/departments` | Department setup |
| Classes | `/classes` | Class setup and listing |
| Subjects | `/subjects` | Subject and teacher assignments |
| Users | `/users` | User administration, advisor assignment, student CSV import |
| Student services | `/users/me/services`, `/users/:id/services`, `/users/:id/fees/:semester` | Student fee/hostel views and superadmin hostel, room, transport, and payment records |
| Settings | `/settings` | Academic year, attendance threshold, passing threshold, and the fixed marks formula |
| Attendance | `/attendance` | Attendance entry, review, and student summaries |
| Marks | `/marks` | Teacher/superadmin marks entry and student results |
| Announcements | `/announcements` | Scoped announcements |
| Events | `/events` | Scoped academic event calendar and management |
| Timetable | `/timetable` | Timetable configuration, room data, validation, and class schedule generation |

Most endpoints require authentication; write and administrative access is restricted by role. Request validation is applied to the API inputs.

Semesters 1, 3, 5, and 7 are odd semesters (July–December); semesters 2, 4, 6, and 8 are even semesters (January–June). Semester 1 begins in August, then a student's calculated semester advances in January and July. A student becomes an alumnus after completing Semester 8. Student CSV imports require the `startingYear` column, which is the year Semester 1 starts in August.

The marks formula is: MST average (2 tests, each out of 24), assignment average (3 assignments, each out of 10), attendance (out of 6), and final exam (out of 60). Each displayed category score is rounded up to a whole mark. Each semester's academic fee is ₹40,000 and exam fee is ₹1,500. Hostel students pay an additional ₹20,000, and students marked as using university transport pay an additional ₹15,000 per semester. Superadmins record cumulative amounts paid against each applicable fee.

## What’s next

These are recommended next milestones:

1. **Add automated tests:** Cover authentication, role permissions, validation, attendance/marks calculations, and key client flows.
2. **Prepare for deployment:** Document production configuration, secure secret management, database backups, logging, and deployment steps.

## Security notes

- Keep real credentials and environment files out of Git. The repository ignores `.env` files; the `.env.example` files contain local-development placeholders.
- Replace every example secret/password before running outside a disposable local environment.
- Restrict database access and configure `CLIENT_URL` to the intended client origin when deploying.
