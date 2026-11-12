const mongoose = require('mongoose')
const Class = require('../models/Class')
const Subject = require('../models/Subject')
const Room = require('../models/Room')
const Timetable = require('../models/Timetable')
const TimetableConfiguration = require('../models/TimetableConfiguration')

function timeToMinutes(value) {
  if (!value || typeof value !== 'string') return 0

  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0

  return hours * 60 + minutes
}

function minutesToTime(value) {
  const totalMinutes = Math.max(0, value)
  const hours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function normalizeWorkingDays(days) {
  const fallback = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  if (!Array.isArray(days) || days.length === 0) {
    return fallback
  }

  return days.filter(Boolean)
}

async function getDefaultConfiguration() {
  const config = await TimetableConfiguration.findOneAndUpdate(
    { key: 'university' },
    { $setOnInsert: { key: 'university' } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )

  return config
}

function buildPeriodSlots(configuration) {
  const workingDays = normalizeWorkingDays(configuration.workingDays)
  const lectureDuration = Number(configuration.lectureDuration || 50)
  const startMinutes = timeToMinutes(configuration.startTime || '09:00')
  const endMinutes = timeToMinutes(configuration.endTime || '16:00')
  const numberOfPeriods = Number(configuration.numberOfPeriods || 7)

  const slots = []

  for (const day of workingDays) {
    let cursor = startMinutes
    for (let period = 1; period <= numberOfPeriods; period += 1) {
      const slotStart = cursor
      const slotEnd = slotStart + lectureDuration
      if (slotEnd > endMinutes) {
        break
      }

      slots.push({
        day,
        period,
        startTime: minutesToTime(slotStart),
        endTime: minutesToTime(slotEnd),
      })
      cursor = slotEnd
    }
  }

  return slots
}

async function getConfiguration(req, res, next) {
  try {
    const configuration = await getDefaultConfiguration()
    return res.json({ configuration })
  } catch (error) {
    return next(error)
  }
}

async function updateConfiguration(req, res, next) {
  try {
    const payload = {
      key: 'university',
      startTime: req.body.startTime || undefined,
      endTime: req.body.endTime || undefined,
      lectureDuration: req.body.lectureDuration || undefined,
      workingDays: Array.isArray(req.body.workingDays)
        ? req.body.workingDays
        : undefined,
      breaks: Array.isArray(req.body.breaks) ? req.body.breaks : undefined,
      lunch: req.body.lunch || undefined,
      numberOfPeriods: req.body.numberOfPeriods || undefined,
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key]
    })

    const configuration = await TimetableConfiguration.findOneAndUpdate(
      { key: 'university' },
      { $set: payload },
      { new: true, upsert: true, runValidators: true },
    )

    return res.json({ configuration })
  } catch (error) {
    return next(error)
  }
}

async function listRooms(req, res, next) {
  try {
    const filter = { isAvailable: true }
    if (req.query.department) {
      filter.department = req.query.department
    }

    const rooms = await Room.find(filter).sort({ type: 1, capacity: -1, name: 1 })
    return res.json({ rooms })
  } catch (error) {
    return next(error)
  }
}

async function getClassTimetableData(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.classId)) {
      return res.status(400).json({ message: 'Class ID is invalid.' })
    }

    const [classRecord, subjects, rooms, existingTimetable] = await Promise.all([
      Class.findById(req.params.classId).populate('department', 'name code'),
      Subject.find({ class: req.params.classId })
        .populate('teacher', 'name email department')
        .populate('department', 'name code')
        .sort({ name: 1 }),
      Room.find({ isAvailable: true }).sort({ type: 1, capacity: -1, name: 1 }),
      Timetable.find({ classId: req.params.classId })
        .populate('subjectId', 'name code')
        .populate('teacherId', 'name email')
        .populate('roomId', 'name type capacity')
        .sort({ day: 1, period: 1 }),
    ])

    if (!classRecord) {
      return res.status(404).json({ message: 'Class not found.' })
    }

    const data = {
      class: classRecord,
      subjects: subjects.map((subject) => ({
        ...subject.toObject(),
        teacher: subject.teacher
          ? { _id: subject.teacher._id, name: subject.teacher.name, email: subject.teacher.email }
          : null,
      })),
      rooms,
      existingTimetable,
      summary: {
        subjects: subjects.length,
        rooms: rooms.length,
        timetableEntries: existingTimetable.length,
      },
    }

    return res.json(data)
  } catch (error) {
    return next(error)
  }
}

async function validateTimetableData(req, res, next) {
  try {
    const { classId } = req.body
    if (!mongoose.isValidObjectId(classId)) {
      return res.status(400).json({ message: 'Class ID is invalid.' })
    }

    const classRecord = await Class.findById(classId)
    if (!classRecord) {
      return res.status(404).json({ message: 'Class not found.' })
    }

    const subjects = await Subject.find({ class: classId }).populate('teacher', 'name')
    const rooms = await Room.find({ isAvailable: true })

    const warnings = []
    if (subjects.length === 0) {
      warnings.push('No subjects are assigned to this class yet.')
    }

    for (const subject of subjects) {
      if (!subject.teacher) {
        warnings.push(`${subject.name} does not have a teacher assigned.`)
      }
      if (!subject.weeklyPeriods) {
        warnings.push(`${subject.name} is missing a weekly period configuration.`)
      }
      if (subject.isLab && !rooms.some((room) => room.type === subject.roomType || room.type === 'Computer Lab')) {
        warnings.push(`${subject.name} requires a lab-compatible room.`)
      }
    }

    if (rooms.length === 0) {
      warnings.push('No available rooms were found for timetable generation.')
    }

    return res.json({
      class: classRecord,
      subjectCount: subjects.length,
      roomCount: rooms.length,
      warnings,
      valid: warnings.length === 0,
    })
  } catch (error) {
    return next(error)
  }
}

async function generateClassTimetable(req, res, next) {
  try {
    const { classId, academicSession } = req.body
    if (!mongoose.isValidObjectId(classId)) {
      return res.status(400).json({ message: 'Class ID is invalid.' })
    }

    const classRecord = await Class.findById(classId)
    if (!classRecord) {
      return res.status(404).json({ message: 'Class not found.' })
    }

    const subjects = await Subject.find({ class: classId })
      .populate('teacher', 'name email')
      .sort({ name: 1 })
    if (subjects.length === 0) {
      return res.status(400).json({ message: 'This class has no subjects assigned.' })
    }

    const configuration = await getDefaultConfiguration()
    const periodSlots = buildPeriodSlots(configuration)
    const availableRooms = await Room.find({ isAvailable: true }).sort({ capacity: -1, name: 1 })
    const existingEntries = await Timetable.find({}).lean()
    const generatedEntries = []
    const warnings = []

    for (const subject of subjects) {
      const requiredPeriods = Number(subject.weeklyPeriods || 1)
      let assigned = 0

      for (const slot of periodSlots) {
        if (assigned >= requiredPeriods) break

        const teacherBusy = existingEntries.some(
          (entry) =>
            String(entry.teacherId) === String(subject.teacher?._id || subject.teacher) &&
            entry.day === slot.day &&
            entry.period === slot.period,
        )
        const classBusy = generatedEntries.some(
          (entry) => entry.classId.toString() === classId && entry.day === slot.day && entry.period === slot.period,
        )
        if (teacherBusy || classBusy) continue

        const roomCandidates = availableRooms.filter((room) => {
          if (!room.isAvailable) return false
          if (subject.roomType && room.type !== subject.roomType && room.type !== 'Classroom') {
            return false
          }

          return !existingEntries.some(
            (entry) =>
              String(entry.roomId) === String(room._id) &&
              entry.day === slot.day &&
              entry.period === slot.period,
          )
        })

        if (roomCandidates.length === 0) continue

        const selectedRoom = roomCandidates[0]
        generatedEntries.push({
          classId: classRecord._id,
          subjectId: subject._id,
          teacherId: subject.teacher,
          roomId: selectedRoom._id,
          academicSession: academicSession || classRecord.academicYear || '2026-27',
          day: slot.day,
          period: slot.period,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: 'draft',
        })
        assigned += 1
      }

      if (assigned < requiredPeriods) {
        warnings.push(
          `${subject.name} requires ${requiredPeriods} periods but only ${assigned} could be scheduled with current room and teacher availability.`,
        )
      }
    }

    if (generatedEntries.length === 0) {
      return res.status(400).json({
        message: 'No timetable slots could be generated for this class.',
        warnings,
      })
    }

    await Timetable.deleteMany({ classId: classRecord._id, academicSession: academicSession || classRecord.academicYear || '2026-27' })
    const createdEntries = await Timetable.insertMany(generatedEntries)

    return res.status(201).json({
      class: classRecord,
      configuration,
      schedule: createdEntries,
      warnings,
      generated: createdEntries.length,
    })
  } catch (error) {
    return next(error)
  }
}

async function listClassTimetable(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.classId)) {
      return res.status(400).json({ message: 'Class ID is invalid.' })
    }

    const entries = await Timetable.find({ classId: req.params.classId })
      .populate('subjectId', 'name code type')
      .populate('teacherId', 'name email')
      .populate('roomId', 'name type capacity')
      .sort({ day: 1, period: 1 })

    return res.json({ timetable: entries })
  } catch (error) {
    return next(error)
  }
}

async function listFacultyTimetable(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.facultyId)) {
      return res.status(400).json({ message: 'Faculty ID is invalid.' })
    }

    const entries = await Timetable.find({ teacherId: req.params.facultyId })
      .populate('classId', 'name section semester academicYear')
      .populate('subjectId', 'name code')
      .populate('roomId', 'name type')
      .sort({ day: 1, period: 1 })

    return res.json({ timetable: entries })
  } catch (error) {
    return next(error)
  }
}

async function getConflicts(req, res, next) {
  try {
    const timetableEntries = await Timetable.find({}).lean()
    const teacherConflicts = []
    const roomConflicts = []
    const classConflicts = []

    for (const entry of timetableEntries) {
      const sameTeacher = timetableEntries.filter(
        (candidate) =>
          String(candidate.teacherId) === String(entry.teacherId) &&
          candidate.day === entry.day &&
          candidate.period === entry.period &&
          String(candidate._id) !== String(entry._id),
      )
      if (sameTeacher.length > 0) {
        teacherConflicts.push({ entry, conflicting: sameTeacher })
      }

      const sameRoom = timetableEntries.filter(
        (candidate) =>
          String(candidate.roomId) === String(entry.roomId) &&
          candidate.day === entry.day &&
          candidate.period === entry.period &&
          String(candidate._id) !== String(entry._id),
      )
      if (sameRoom.length > 0) {
        roomConflicts.push({ entry, conflicting: sameRoom })
      }

      const sameClass = timetableEntries.filter(
        (candidate) =>
          String(candidate.classId) === String(entry.classId) &&
          candidate.day === entry.day &&
          candidate.period === entry.period &&
          String(candidate._id) !== String(entry._id),
      )
      if (sameClass.length > 0) {
        classConflicts.push({ entry, conflicting: sameClass })
      }
    }

    return res.json({
      teacherConflicts,
      roomConflicts,
      classConflicts,
      summary: {
        teacherConflicts: teacherConflicts.length,
        roomConflicts: roomConflicts.length,
        classConflicts: classConflicts.length,
      },
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  getConfiguration,
  updateConfiguration,
  listRooms,
  getClassTimetableData,
  validateTimetableData,
  generateClassTimetable,
  listClassTimetable,
  listFacultyTimetable,
  getConflicts,
}
