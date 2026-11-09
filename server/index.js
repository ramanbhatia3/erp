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
const notificationRoutes = require('./routes/notificationRoutes')
const eventRoutes = require('./routes/eventRoutes')
const connectDB = require('./config/db')

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
app.use('/api/notifications', notificationRoutes)
app.use('/api/events', eventRoutes)

app.use((error, req, res, next) => {
  console.error('Request failed.')
  res.status(500).json({ message: 'An unexpected server error occurred.' })
})

async function startServer() {
  try {
    await connectDB()
    app.listen(port, () => {
      console.log(`RBPU Hub server listening on port ${port}`)
    })
  } catch (error) {
    console.error('Unable to start the server:', error.message)
    process.exit(1)
  }
}

startServer()
