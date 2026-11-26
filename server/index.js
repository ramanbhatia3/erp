require('dotenv').config()

const express = require('express')
const cors = require('cors')
const healthRoutes = require('./routes/healthRoutes')
const authRoutes = require('./routes/authRoutes')
const departmentRoutes = require('./routes/departmentRoutes')
const classRoutes = require('./routes/classRoutes')
const subjectRoutes = require('./routes/subjectRoutes')
const userRoutes = require('./routes/userRoutes')
const settingsRoutes = require('./routes/settingsRoutes')
const attendanceRoutes = require('./routes/attendanceRoutes')
const marksRoutes = require('./routes/marksRoutes')
const announcementRoutes = require('./routes/announcementRoutes')
const eventRoutes = require('./routes/eventRoutes')
const timetableRoutes = require('./routes/timetableRoutes')
const facultyRoutes = require('./routes/facultyRoutes')
const connectDB = require('./config/db')
const User = require('./models/User')
const Class = require('./models/Class')
const { synchronizeAllStudentPlacements } = require('./utils/studentPlacement')
const { getCurrentAcademicYear } = require('./utils/academicYear')
const Settings = require('./models/Settings')

const app = express()
const port = process.env.PORT || 5000

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())
app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/departments', departmentRoutes)
app.use('/api/classes', classRoutes)
app.use('/api/subjects', subjectRoutes)
app.use('/api/users', userRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/marks', marksRoutes)
app.use('/api/announcements', announcementRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/faculty', facultyRoutes)
app.use('/api/timetable', timetableRoutes)

app.use((error, req, res, next) => {
  console.error(`Request failed: ${req.method} ${req.path}`, error)
  if (res.headersSent) {
    return next(error)
  }
  res.status(500).json({ message: 'An unexpected server error occurred.' })
})

async function startServer() {
  try {
    await connectDB()
    const startingYearBackfill = await User.updateMany(
      {
        role: 'student',
        $or: [
          { startingYear: { $exists: false } },
          { startingYear: null },
        ],
      },
      { $set: { startingYear: 2023 } },
    )
    if (startingYearBackfill.modifiedCount > 0) {
      console.log(
        `Set the starting year to 2023 for ${startingYearBackfill.modifiedCount} existing students`,
      )
    }
    const classSectionMigration = await Class.collection.updateMany(
      { section: { $exists: true } },
      { $unset: { section: '' } },
    )
    if (classSectionMigration.modifiedCount > 0) {
      console.log(
        `Removed sections from ${classSectionMigration.modifiedCount} existing classes`,
      )
    }
    const currentAcademicYear = getCurrentAcademicYear()
    const academicYearMigration = await Class.updateMany(
      { academicYear: { $ne: currentAcademicYear } },
      { $set: { academicYear: currentAcademicYear } },
    )
    if (academicYearMigration.modifiedCount > 0) {
      console.log(
        `Updated ${academicYearMigration.modifiedCount} classes to academic year ${currentAcademicYear}`,
      )
    }
    await Settings.updateOne(
      { key: 'university' },
      { $set: { currentAcademicYear } },
    )
    await synchronizeAllStudentPlacements()
    const placementSyncInterval = setInterval(() => {
      synchronizeAllStudentPlacements().catch((error) => {
        console.error('Unable to synchronize student class placements:', error.message)
      })
    }, 24 * 60 * 60 * 1000)
    placementSyncInterval.unref()
    app.listen(port, () => {
      console.log(`RBPU Hub server listening on port ${port}`)
    })
  } catch (error) {
    console.error('Unable to start the server:', error.message)
    process.exit(1)
  }
}

startServer()
