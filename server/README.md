# RBPU Hub API Server

The backend service for RBPU Hub, built with Node.js, Express v5, and Mongoose v9. It provides RESTful APIs for role-based academic operations, student onboarding, examination calculations, and attendance tracking.

---

## 1. Directory Structure

```text
server/
├── config/
│   └── db.js                 # MongoDB connection handler
├── controllers/              # Business logic & request handlers
│   ├── announcementController.js
│   ├── attendanceController.js
│   ├── authController.js
│   ├── classController.js
│   ├── departmentController.js
│   ├── eventController.js
│   ├── marksController.js
│   ├── settingsController.js
│   ├── subjectController.js
│   ├── timetableController.js
│   └── userController.js
├── middleware/
│   └── authMiddleware.js     # JWT verification & role authorization
├── models/                   # Mongoose schemas & data models
│   ├── Announcement.js
│   ├── Attendance.js
│   ├── Class.js
│   ├── Department.js
│   ├── Event.js
│   ├── Marks.js
│   ├── Room.js
│   ├── Settings.js
│   ├── Subject.js
│   ├── Timetable.js
│   ├── TimetableConfiguration.js
│   └── User.js
├── routes/                   # Route declarations & express-validator rules
├── scripts/
│   └── seed.js               # Initial superadmin bootstrap script
└── utils/                    # Academic engines & math calculations
    ├── academicYear.js       # July-June Indian academic cycle
    ├── calculations.js       # 100-mark evaluation engine
    ├── markingScheme.js      # Component definitions & weightages
    ├── marksEligibility.js   # Cross-semester marking eligibility
    ├── studentAcademic.js    # Semester calculation & alumni logic
    ├── studentPlacement.js   # Applied Sciences (AS) & branch placement
    └── studentServices.js    # 8-semester fee calculations & ledger
```

---

## 2. Prerequisites & Environment Setup

- **Node.js:** v18+ (tested on Node v20/v24)
- **MongoDB:** MongoDB 6.0+ instance or MongoDB Atlas cluster URI

Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

Configure your environment variables:
| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Local port for API server | `5000` |
| `CLIENT_URL` | Allowed origin for CORS | `http://localhost:5173` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/rbpu-hub` |
| `JWT_SECRET` | Secret key for signing authentication tokens | `<secure-random-string>` |
| `SUPERADMIN_NAME` | Display name for seed account | `Admin RBPU` |
| `SUPERADMIN_EMAIL`| Login email for superadmin account | `admin@example.com` |
| `SUPERADMIN_PASSWORD` | Initial password (max 72 bytes) | `<secure-password>` |

---

## 3. Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Bootstrap Superadmin Account:**
   ```bash
   npm run seed
   ```
   *Creates the initial superadmin account only if it does not already exist.*

3. **Run unit tests:**
   ```bash
   npm test
   ```
   *Executes native Node.js tests for academic year, semester, marks, and placement math.*

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Start production server:**
   ```bash
   npm start
   ```

---

## 4. Key Architectural Features

- **Automated Academic Placement:** On startup and daily schedule, students are mapped to cohorts based on matriculation year (`startingYear`). First-year students (Sem 1 & 2) are mapped to Applied Sciences (`AS`), transitioning to branch departments (`CSE`, `IT`, `ME`, `CE`) from Semester 3 onward.
- **100-Mark Formula:** Automatically calculates aggregated results from 2 MSTs (rounded up to 24), 3 Assignments (rounded up to 10), Attendance (6), and Final Exam (60).
- **Referential Integrity:** Enforces cascade-prevention checks before deleting departments, classes, or subjects.
- **CSV Student Import:** Ingests up to 500 student records per CSV with format verification and duplicate collision checks.

---

## 5. API Documentation

For the full endpoint specification, request/response formats, and role permissions, refer to [API Reference Guide](../docs/API_REFERENCE.md).
