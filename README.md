# RBPU Hub

RBPU Hub is a role-based university portal for managing academic operations in one place. It pairs a React web client with an Express API and MongoDB, with focused workspaces for superadmins, teachers, and students.

> **Project status:** Core account, academic-record, and administration workflows are available for the three supported roles.

## What works today

- **Sign-in and account protection:** JWT-backed login, current-user lookup, role-aware routes, and a forced password-change flow for first-time accounts.
- **University setup:** Superadmins can manage departments, HODs, classes and class incharges, subjects and their teachers, academic settings, and user accounts. Student accounts can be imported from CSV; admins can edit, suspend/reactivate, reset passwords, or remove students from a class without deleting their academic history.
- **Attendance:** Teachers can record and edit attendance for their assigned classes. Students can review their own attendance.
- **Marks:** Teachers can record and edit marks using configured assessment components. Students can view their own results.
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

Log in with the superadmin email and password configured in `server/.env`. The superadmin can then set up departments, classes, subjects, and accounts.

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
| Settings | `/settings` | Academic year, semester, attendance threshold, marks components |
| Attendance | `/attendance` | Attendance entry, review, and student summaries |
| Marks | `/marks` | Marks entry and student results |
| Announcements | `/announcements` | Scoped announcements |
| Events | `/events` | Scoped academic event calendar and management |
| Timetable | `/timetable` | Timetable configuration, room data, validation, and class schedule generation |

Most endpoints require authentication; write and administrative access is restricted by role. Request validation is applied to the API inputs.

## What’s next

These are recommended next milestones:

1. **Add automated tests:** Cover authentication, role permissions, validation, attendance/marks calculations, and key client flows.
2. **Prepare for deployment:** Document production configuration, secure secret management, database backups, logging, and deployment steps.

## Security notes

- Keep real credentials and environment files out of Git. The repository ignores `.env` files; the `.env.example` files contain local-development placeholders.
- Replace every example secret/password before running outside a disposable local environment.
- Restrict database access and configure `CLIENT_URL` to the intended client origin when deploying.
