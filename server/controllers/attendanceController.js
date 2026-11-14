const Attendance = require('../models/Attendance')
const Class = require('../models/Class')
const Subject = require('../models/Subject')
const User = require('../models/User')
const Settings = require('../models/Settings')

function getId(value) {
  return String(value?._id || value)
}

function normalizeDate(value) {
  return new Date(`${value}T00:00:00.000Z`)
}

async function validateRecords(classId, records) {
  const studentIds = records.map((record) => record.student)
  const uniqueIds = new Set(studentIds.map(String))

  if (uniqueIds.size !== studentIds.length) {
    return 'A student can only appear once in an attendance list.'
  }

  const students = await User.find({
    _id: { $in: studentIds },
    class: classId,
    role: 'student',
    isActive: true,
  }).select('_id')

  if (students.length !== studentIds.length) {
    return 'Every attendance record must belong to an active student in this class.'
  }

  return null
}

async function validateAssignedSubject(classId, subjectId, teacherId) {
  const subject = await Subject.findOne({
    _id: subjectId,
    class: classId,
    teacher: teacherId,
  })

  return subject
}

async function createAttendance(req, res, next) {
  try {
    const { class: classId, subject: subjectId, date, lectureNo, records } = req.body
    const subject = await validateAssignedSubject(classId, subjectId, req.user._id)

    if (!subject) {
      return res.status(403).json({
        message: 'You can only mark attendance for a subject assigned to you in this class.',
      })
    }

    const recordsError = await validateRecords(classId, records)
    if (recordsError) {
      return res.status(400).json({ message: recordsError })
    }

    const attendance = await Attendance.create({
      class: classId,
      subject: subjectId,
      date: normalizeDate(date),
      lectureNo,
      markedBy: req.user._id,
      records,
    })

    await attendance.populate([
      { path: 'class', select: 'name section semester academicYear' },
      { path: 'subject', select: 'name code' },
      { path: 'markedBy', select: 'name' },
      { path: 'records.student', select: 'name rollNo' },
    ])

    return res.status(201).json({ attendance })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Attendance has already been marked for this lecture.',
      })
    }
    return next(error)
  }
}

async function updateAttendance(req, res, next) {
  try {
    const attendance = await Attendance.findById(req.params.id)
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found.' })
    }

    const isMarker = getId(attendance.markedBy) === getId(req.user._id)
    const classRecord = await Class.findById(attendance.class).select('advisor')
    const isClassAdvisor =
      classRecord?.advisor && getId(classRecord.advisor) === getId(req.user._id)

    if (!isMarker && !isClassAdvisor) {
      return res.status(403).json({
        message: 'Only the teacher who marked attendance or this class advisor can edit it.',
      })
    }

    const recordsError = await validateRecords(attendance.class, req.body.records)
    if (recordsError) {
      return res.status(400).json({ message: recordsError })
    }

    attendance.records = req.body.records
    attendance.editedBy = req.user._id
    attendance.editedAt = new Date()
    await attendance.save()
    await attendance.populate([
      { path: 'class', select: 'name section semester academicYear' },
      { path: 'subject', select: 'name code' },
      { path: 'markedBy', select: 'name' },
      { path: 'editedBy', select: 'name' },
      { path: 'records.student', select: 'name rollNo' },
    ])

    return res.json({ attendance })
  } catch (error) {
    return next(error)
  }
}

async function listClassAttendance(req, res, next) {
  try {
    const { classId } = req.params
    const { subject: subjectId, date } = req.query
    const classRecord = await Class.findById(classId).select('department advisor')

    if (!classRecord) {
      return res.status(404).json({ message: 'Class not found.' })
    }

    const isClassAdvisor =
      classRecord.advisor && getId(classRecord.advisor) === getId(req.user._id)
    const inDepartment =
      req.user.department && getId(classRecord.department) === getId(req.user.department)

    if (!isClassAdvisor && !inDepartment) {
      return res.status(403).json({ message: 'You do not have access to this class.' })
    }

    const filter = { class: classId }

    if (subjectId) {
      const subject = await Subject.findOne({ _id: subjectId, class: classId })
        .select('teacher')
      if (!subject) {
        return res.status(404).json({ message: 'Subject not found in this class.' })
      }
      if (!isClassAdvisor && getId(subject.teacher) !== getId(req.user._id)) {
        return res.status(403).json({
          message: 'You can only view attendance for subjects assigned to you.',
        })
      }
      filter.subject = subjectId
    } else if (!isClassAdvisor) {
      const assignedSubjects = await Subject.find({
        class: classId,
        teacher: req.user._id,
      }).select('_id')
      const subjectIds = assignedSubjects.map((subject) => subject._id)
      if (subjectIds.length === 0) {
        return res.status(403).json({
          message: 'You are not assigned to a subject in this class.',
        })
      }
      filter.subject = { $in: subjectIds }
    }

    if (date) filter.date = normalizeDate(date)

    const attendance = await Attendance.find(filter)
      .populate('subject', 'name code')
      .populate('markedBy', 'name')
      .populate('editedBy', 'name')
      .populate('records.student', 'name rollNo')
      .sort({ date: -1, lectureNo: 1 })

    const attendanceWithPermissions = attendance.map((record) => ({
      ...record.toObject(),
      canEdit: isClassAdvisor || getId(record.markedBy) === getId(req.user._id),
    }))

    return res.json({ attendance: attendanceWithPermissions })
  } catch (error) {
    return next(error)
  }
}

async function listClassStudents(req, res, next) {
  try {
    const classRecord = await Class.findById(req.params.classId)
      .select('advisor')

    if (!classRecord) {
      return res.status(404).json({ message: 'Class not found.' })
    }

    const isClassAdvisor =
      classRecord.advisor && getId(classRecord.advisor) === getId(req.user._id)
    const teachesClass = await Subject.exists({
      class: req.params.classId,
      teacher: req.user._id,
    })

    if (!isClassAdvisor && !teachesClass) {
      return res.status(403).json({
        message: 'You must teach a subject or advise this class to view its students.',
      })
    }

    const students = await User.find({
      class: req.params.classId,
      role: 'student',
      isActive: true,
    })
      .select('name email rollNo section')
      .sort({ name: 1 })

    return res.json({ students })
  } catch (error) {
    return next(error)
  }
}

async function getStudentAttendance(req, res, next) {
  try {
    const studentId = req.user._id
    const [attendanceRecords, settings] = await Promise.all([
      Attendance.find({ 'records.student': studentId })
        .populate('subject', 'name code')
        .populate('class', 'name section semester academicYear')
        .sort({ date: -1, lectureNo: 1 }),
      Settings.findOne({ key: 'university' }).select('attendanceThreshold'),
    ])

    const subjectSummary = new Map()
    const records = []
    let overallPresent = 0
    let overallAbsent = 0

    for (const attendance of attendanceRecords) {
      const studentRecord = attendance.records.find(
        (record) => getId(record.student) === getId(studentId),
      )
      if (!studentRecord) continue

      const subjectKey = getId(attendance.subject)
      if (!subjectSummary.has(subjectKey)) {
        subjectSummary.set(subjectKey, {
          subject: attendance.subject,
          present: 0,
          absent: 0,
          total: 0,
        })
      }

      const summary = subjectSummary.get(subjectKey)
      summary[studentRecord.status] += 1
      summary.total += 1
      if (studentRecord.status === 'present') overallPresent += 1
      else overallAbsent += 1

      records.push({
        _id: attendance._id,
        class: attendance.class,
        subject: attendance.subject,
        date: attendance.date,
        lectureNo: attendance.lectureNo,
        status: studentRecord.status,
      })
    }

    const withPercentages = (summary) => ({
      ...summary,
      percentage: summary.total
        ? Number(((summary.present / summary.total) * 100).toFixed(2))
        : 0,
    })

    const overall = withPercentages({
      present: overallPresent,
      absent: overallAbsent,
      total: overallPresent + overallAbsent,
    })
    const attendanceThreshold = settings?.attendanceThreshold ?? 75
    const shortageSubjects = [...subjectSummary.values()]
      .map(withPercentages)
      .filter((summary) => summary.percentage < attendanceThreshold)
      .map((summary) => ({
        subject: summary.subject,
        percentage: summary.percentage,
      }))
    const overallBelowThreshold =
      overall.total > 0 && overall.percentage < attendanceThreshold

    return res.json({
      records,
      subjects: [...subjectSummary.values()].map(withPercentages),
      overall,
      attendanceThreshold,
      shortage: overallBelowThreshold || shortageSubjects.length > 0,
      overallBelowThreshold,
      shortageSubjects,
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  createAttendance,
  updateAttendance,
  listClassAttendance,
  listClassStudents,
  getStudentAttendance,
}
