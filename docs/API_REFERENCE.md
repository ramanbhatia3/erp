# RBPU Hub: Complete REST API Reference

All RBPU Hub API routes are served under the base path `/api`. All requests and responses use JSON formatting unless transferring files. Protected routes require a Bearer token in the HTTP Authorization header:
```http
Authorization: Bearer <jwt-token>
```

---

## 1. Health

### `GET /api/health`
Check whether the API service is alive and healthy.
- **Access:** Public
- **Response (200 OK):**
```json
{
  "status": "healthy"
}
```

---

## 2. Authentication & Profile (`/api/auth`)

### `POST /api/auth/login`
Authenticate an account and issue a 7-day JWT.
- **Access:** Public
- **Request Body:**
```json
{
  "email": "student@example.com",
  "password": "Password123"
}
```
- **Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "6afb15ce...",
    "name": "Student User",
    "email": "student@example.com",
    "role": "student",
    "department": "6afb0d8f...",
    "class": "6afb0d8f...",
    "rollNo": "2024001",
    "isFirstLogin": false,
    "isActive": true,
    "currentSemester": 7,
    "academicStatus": "studying",
    "studentProfile": { ... }
  }
}
```

### `GET /api/auth/me`
Retrieve the currently signed-in user's profile and state.
- **Access:** Protected (`superadmin`, `teacher`, `student`)
- **Response (200 OK):** Current user object with active placement and permissions.

### `PATCH /api/auth/profile`
Update student personal details (parent contact, address, academic history).
- **Access:** Protected (`student` only)
- **Request Body:**
```json
{
  "studentProfile": {
    "mobileNumber": "+91 98765 43210",
    "dateOfBirth": "2004-05-15",
    "currentAddress": "Hostel Block A, Room 204",
    "permanentAddress": "Model Town, City",
    "fatherName": "Father Name",
    "motherName": "Mother Name",
    "guardianPhone": "+91 98765 43211",
    "bloodGroup": "B+",
    "class10Board": "CBSE",
    "class10Percentage": 92.5,
    "class12Board": "CBSE",
    "class12Percentage": 89.0,
    "favoriteSports": "Cricket, Football",
    "hobbies": "Programming, Photography"
  }
}
```

### `PUT /api/auth/change-password`
Change the password for the current superadmin account.
- **Access:** Protected (`superadmin`)
- **Request Body:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewSecurePassword456"
}
```

---

## 3. Departments (`/api/departments`)

### `GET /api/departments`
List university departments. Teachers receive their own department; superadmins see all.
- **Access:** Protected (`superadmin`, `teacher`)
- **Query Parameters:** `search` (optional string filter)
- **Response (200 OK):**
```json
{
  "departments": [
    {
      "_id": "6afb0d8f04d2752379fb4714",
      "name": "Computer Science & Engineering",
      "code": "CSE",
      "hod": {
        "_id": "6afb4ef5...",
        "name": "Dr. Department Head",
        "email": "hod.cse@example.com"
      }
    }
  ]
}
```

### `POST /api/departments`
Create a new academic department.
- **Access:** Protected (`superadmin`)
- **Request Body:** `{ "name": "Civil Engineering", "code": "CE", "hod": "optional_user_id" }`

### `PUT /api/departments/:id`
Update department title, code, or assigned HOD.
- **Access:** Protected (`superadmin`)

### `DELETE /api/departments/:id`
Delete a department if it contains no associated classes, subjects, or users.
- **Access:** Protected (`superadmin`)

---

## 4. Classes (`/api/classes`)

### `GET /api/classes`
List cohorts/classes for an academic year.
- **Access:** Protected (`superadmin`, `teacher`)
- **Query Parameters:** `department` (MongoId), `semester` (1–8)

### `GET /api/classes/:id/subjects`
Get all subjects assigned to a specific class.
- **Access:** Protected (`superadmin`, `teacher`)

### `GET /api/classes/:id/faculty`
Get all faculty members teaching in a specific class.
- **Access:** Protected (`superadmin`, `teacher`)

### `POST /api/classes`
Create a cohort class for a specific semester.
- **Access:** Protected (`superadmin`)
- **Request Body:**
```json
{
  "name": "CSE",
  "department": "6afb0d8f...",
  "semester": 3
}
```

### `PUT /api/classes/:id`
Update class details. Reassigning departments is blocked if subjects or students exist.
- **Access:** Protected (`superadmin`)

### `DELETE /api/classes/:id`
Remove an empty class. Blocked if attendance history, subjects, or students are linked.
- **Access:** Protected (`superadmin`)

---

## 5. Subjects (`/api/subjects`)

### `GET /api/subjects`
List curriculum subjects. Filterable by department and class.
- **Access:** Protected (`superadmin`, `teacher`)

### `POST /api/subjects`
Register a new subject. If added to Applied Sciences (AS) in Semester 1 or 2, it is automatically shared across all peer cohorts via `sharedGroupId`.
- **Access:** Protected (`superadmin`)
- **Request Body:**
```json
{
  "name": "Operating Systems",
  "code": "BTCS501-18",
  "department": "6afb0d8f...",
  "class": "6afb0d8f...",
  "teacher": "6afb4ef5...",
  "type": "Theory",
  "weeklyPeriods": 4,
  "roomType": "Classroom",
  "isLab": false
}
```

### `PUT /api/subjects/:id`
Update subject information, periods, or assigned teacher.

### `DELETE /api/subjects/:id`
Delete a subject. Blocked if any attendance or marks records are recorded for it.

---

## 6. Users & Student Services (`/api/users`)

### `GET /api/users`
List managed student and teacher accounts with filters and live placement synchronization.
- **Access:** Protected (`superadmin`)
- **Query Parameters:** `role` (`teacher` | `student`), `department`, `class`, `active` (`true` | `false`), `search`

### `POST /api/users`
Create an individual student or teacher account.
- **Access:** Protected (`superadmin`)
- **Request Body (Student):**
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "role": "student",
  "department": "6afb0d8f...",
  "class": "6afb0d8f...",
  "section": "A",
  "rollNo": "2026001",
  "startingYear": 2026,
  "password": "InitialPassword123"
}
```

### `POST /api/users/students/upload`
Bulk onboard students via CSV file upload (up to 500 records per upload).
- **Access:** Protected (`superadmin`)
- **Form Data:** `file` (.csv, max 1 MB)
- **Required CSV Headers:** `name, email, departmentCode, className, semester, section, academicYear, rollNo, startingYear`

### `PUT /api/users/classes/:classId/advisor`
Assign a class incharge / advisor to a class.
- **Access:** Protected (`superadmin`)

### `PATCH /api/users/:id/services`
Assign hostel, room number, or university transport to a student.
- **Access:** Protected (`superadmin`)
- **Request Body:**
```json
{
  "hostel": "boys-hostel-a",
  "hostelRoom": "B-302",
  "usesTransport": true
}
```

### `PATCH /api/users/:id/fees/:semester`
Record fee payments received for a student for a specific semester (Semesters 1–8).
- **Access:** Protected (`superadmin`)
- **Request Body:**
```json
{
  "paid": {
    "academic": 40000,
    "hostel": 20000,
    "transportation": 15000,
    "exam": 1500
  }
}
```

### `GET /api/users/me/services`
Get personal fee breakdown, payment balances, and hostel room assignments across all 8 semesters.
- **Access:** Protected (`student`)

---

## 7. Attendance (`/api/attendance`)

### `POST /api/attendance`
Submit lecture attendance for an assigned class and subject.
- **Access:** Protected (`teacher` assigned to subject)
- **Request Body:**
```json
{
  "class": "6afb0d8f...",
  "subject": "6afb1484...",
  "date": "2026-11-17",
  "lectureNo": 2,
  "records": [
    { "student": "6afb15ce...", "status": "present" },
    { "student": "6afb15ce...", "status": "absent" }
  ]
}
```

### `PUT /api/attendance/:id`
Edit previously marked attendance. Restricted to the marking teacher or the class advisor.
- **Access:** Protected (`teacher`)

### `GET /api/attendance/class/:classId`
Retrieve lecture attendance history for a class, optionally filtered by subject or date.
- **Access:** Protected (`teacher` teaching or advising class)

### `GET /api/attendance/class/:classId/students`
Get the roster of active students in a class.
- **Access:** Protected (`teacher`)

### `GET /api/attendance/student/me`
Retrieve the authenticated student's full attendance history, overall percentage, subject-by-subject percentages, and shortage warnings below threshold.
- **Access:** Protected (`student`)

---

## 8. Marks (`/api/marks`)

### `POST /api/marks`
Record evaluation marks for a student in a subject.
- **Access:** Protected (`teacher` assigned to subject, or `superadmin`)
- **Request Body:**
```json
{
  "student": "6afb15ce...",
  "subject": "6afb1484...",
  "components": [
    { "name": "MST 1", "marksObtained": 22, "maxMarks": 24, "group": "mst" },
    { "name": "MST 2", "marksObtained": 20, "maxMarks": 24, "group": "mst" },
    { "name": "Assignment 1", "marksObtained": 9, "maxMarks": 10, "group": "assignment" },
    { "name": "Assignment 2", "marksObtained": 8, "maxMarks": 10, "group": "assignment" },
    { "name": "Assignment 3", "marksObtained": 9, "maxMarks": 10, "group": "assignment" },
    { "name": "Attendance", "marksObtained": 5, "maxMarks": 6, "group": "attendance" },
    { "name": "Final Exam", "marksObtained": 48, "maxMarks": 60, "group": "final" }
  ]
}
```

### `PUT /api/marks/:id`
Update an existing marks record.
- **Access:** Protected (`teacher` assigned to subject, or `superadmin`)

### `GET /api/marks/class/:classId/subject/:subjectId`
View all student marks and computed totals for a specific subject offering.
- **Access:** Protected (`teacher` assigned to subject, or `superadmin`)

### `GET /api/marks/student/me`
Retrieve comprehensive academic results, semester-wise marks cards, total percentages, and overall pass/fail status for the signed-in student.
- **Access:** Protected (`student`)

---

## 9. Timetable (`/api/timetable`)

### `GET /api/timetable/configuration`
Retrieve the timetable parameters (working days, period durations, breaks, lunch hour).
- **Access:** Protected (`superadmin`, `teacher`)

### `PUT /api/timetable/configuration`
Update period timings and daily period counts.
- **Access:** Protected (`superadmin`)

### `GET /api/timetable/classes/:classId/data`
Fetch combined scheduling requirements for a class (enrolled subjects, room availability, and existing schedule).
- **Access:** Protected (`superadmin`, `teacher`, `student` in class)

### `POST /api/timetable/validate`
Check prerequisites (teacher assignments, period counts, room requirements) prior to schedule generation.
- **Access:** Protected (`superadmin`)

### `POST /api/timetable/generate`
Run the scheduling heuristic to generate clash-free periods for a class cohort.
- **Access:** Protected (`superadmin`)
- **Request Body:** `{ "classId": "6afb0d8f...", "academicSession": "2026-27" }`

### `GET /api/timetable/faculty/:facultyId`
Retrieve the complete weekly schedule for a teacher across all classes.
- **Access:** Protected (`superadmin`, or the specific `teacher`)

### `GET /api/timetable/conflicts`
Run conflict analysis identifying room overlaps, teacher overlaps, or cohort collisions.
- **Access:** Protected (`superadmin`)

---

## 10. University Settings (`/api/settings`)

### `GET /api/settings`
Get university-wide grading configuration, attendance threshold, and passing percentage.
- **Access:** Protected (`superadmin`, `teacher`)

### `PUT /api/settings`
Update attendance threshold (e.g., 75%) or minimum passing percentage (e.g., 40%).
- **Access:** Protected (`superadmin`)

---

## 11. Announcements & Events

### `GET /api/announcements`
List notices scoped by user role, department, and class.
- **Access:** Protected (`superadmin`, `teacher`)

### `POST /api/announcements`
Broadcast a notice at university, department, or class level.
- **Access:** Protected (`superadmin`)

### `GET /api/events`
Query academic calendar events with optional date range filter (`from`, `to`).
- **Access:** Protected (`superadmin`, `teacher`)

### `POST /api/events`
Add an academic event (e.g. `exam`, `holiday`, `workshop`, `deadline`).
- **Access:** Protected (`superadmin`)
