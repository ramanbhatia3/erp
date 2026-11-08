const Class = require('../models/Class')
const Marks = require('../models/Marks')
const Subject = require('../models/Subject')
const User = require('../models/User')
const createNotification = require('../utils/notify')
const {
  getMarksSettings,
  calculateMarks,
  calculatePerformance,
} = require('../utils/calculations')

function getId(value) {
  return String(value?._id || value)
}

function formatMark(mark, settings) {
  const record = mark.toObject ? mark.toObject() : mark
  return {
    ...record,
    calculation: calculateMarks(record.components, settings, {
      allowHistorical: true,
    }),
  }
}

async function validateMarkRelations({ studentId, subject }) {
  const student = await User.findOne({
    _id: studentId,
    role: 'student',
    isActive: true,
  }).select('_id class')

  if (!student) {
    return { error: 'The selected student is not an active student.' }
  }
  if (getId(student.class) !== getId(subject.class)) {
    return { error: 'The selected student must belong to the subject class.' }
  }

  const classRecord = await Class.findById(subject.class).select('semester academicYear')
  if (!classRecord) {
    return { error: 'The subject class was not found.' }
  }

  return { student, classRecord }
}

async function createMarks(req, res, next) {
  try {
    const subject = await Subject.findOne({
      _id: req.body.subject,
      teacher: req.user._id,
    }).select('class name code')

    if (!subject) {
      return res.status(403).json({
        message: 'You can only enter marks for subjects assigned to you.',
      })
    }

    const relations = await validateMarkRelations({
      studentId: req.body.student,
      subject,
    })
    if (relations.error) {
      return res.status(400).json({ message: relations.error })
    }

    const settings = await getMarksSettings()
    let calculation
    try {
      calculation = calculateMarks(req.body.components, settings)
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }

    const mark = await Marks.create({
      student: relations.student._id,
      subject: subject._id,
      class: subject.class,
      semester: relations.classRecord.semester,
      academicYear: relations.classRecord.academicYear,
      components: calculation.components,
      enteredBy: req.user._id,
    })

    await mark.populate([
      { path: 'student', select: 'name email rollNo' },
      { path: 'subject', select: 'name code' },
      { path: 'class', select: 'name section semester academicYear' },
      { path: 'enteredBy', select: 'name' },
    ])

    await createNotification([relations.student._id], {
      type: 'marks',
      title: `New marks posted for ${subject.name}`,
      message: 'Your marks have been added. Open results to view the details.',
      link: '/dashboard/student/results',
    })

    return res.status(201).json({
      mark: { ...formatMark(mark, settings), calculation },
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Marks already exist for this student, subject, and academic term.',
      })
    }
    return next(error)
  }
}

async function updateMarks(req, res, next) {
  try {
    const mark = await Marks.findById(req.params.id)
    if (!mark) {
      return res.status(404).json({ message: 'Marks record not found.' })
    }

    const subject = await Subject.findOne({
      _id: mark.subject,
      class: mark.class,
      teacher: req.user._id,
    })
    if (!subject) {
      return res.status(403).json({
        message: 'You can only edit marks for subjects currently assigned to you.',
      })
    }

    const settings = await getMarksSettings()
    let calculation
    try {
      calculation = calculateMarks(req.body.components, settings)
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }

    mark.components = calculation.components
    mark.enteredBy = req.user._id
    await mark.save()
    await mark.populate([
      { path: 'student', select: 'name email rollNo' },
      { path: 'subject', select: 'name code' },
      { path: 'class', select: 'name section semester academicYear' },
      { path: 'enteredBy', select: 'name' },
    ])

    return res.json({
      mark: { ...formatMark(mark, settings), calculation },
    })
  } catch (error) {
    return next(error)
  }
}

async function listClassSubjectMarks(req, res, next) {
  try {
    const { classId, subjectId } = req.params
    const subject = await Subject.findOne({
      _id: subjectId,
      class: classId,
      teacher: req.user._id,
    })

    if (!subject) {
      return res.status(403).json({
        message: 'You can only view marks for your assigned subjects.',
      })
    }

    const settings = await getMarksSettings()
    const marks = await Marks.find({ class: classId, subject: subjectId })
      .populate('student', 'name email rollNo')
      .populate('enteredBy', 'name')
      .sort({ 'student.name': 1 })

    return res.json({
      marks: marks.map((mark) => formatMark(mark, settings)),
      settings: {
        marksComponents: settings.marksComponents,
        passingPercentage: settings.passingPercentage,
      },
    })
  } catch (error) {
    return next(error)
  }
}

async function getStudentMarks(req, res, next) {
  try {
    const settings = await getMarksSettings()
    const marks = await Marks.find({ student: req.user._id })
      .populate('subject', 'name code')
      .populate('class', 'name section semester academicYear')
      .populate('enteredBy', 'name')
      .sort({ academicYear: -1, semester: 1, subject: 1 })

    const performance = calculatePerformance(marks, settings)

    return res.json({
      marks: marks.map((mark) => formatMark(mark, settings)),
      performance,
      passingPercentage: settings.passingPercentage,
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  createMarks,
  updateMarks,
  listClassSubjectMarks,
  getStudentMarks,
}
