const Class = require('../models/Class')
const Marks = require('../models/Marks')
const Subject = require('../models/Subject')
const User = require('../models/User')
const {
  getMarksSettings,
  calculateMarks,
  calculatePerformance,
} = require('../utils/calculations')
const { isStudentEligibleForClass } = require('../utils/marksEligibility')

function getId(value) {
  return String(value?._id || value)
}

function formatMark(mark, settings) {
  const record = mark.toObject ? mark.toObject() : mark
  const calculation = calculateMarks(record.components, settings, {
    allowHistorical: true,
  })
  return {
    ...record,
    calculation: {
      ...calculation,
      components: calculation.displayComponents,
    },
  }
}

async function validateMarkRelations({ studentId, subject, enteredByRole }) {
  const student = await User.findOne({
    _id: studentId,
    role: 'student',
  })
    .select('_id class department program isActive')
    .populate('department', 'code')
    .populate('class', 'name')

  if (!student) {
    return { error: 'The selected student was not found.' }
  }

  const classRecord = await Class.findById(subject.class)
    .select('department semester academicYear name')
    .populate('department', 'code')
  if (!classRecord) {
    return { error: 'The subject class was not found.' }
  }

  const belongsToClass = getId(student.class) === getId(subject.class)
  if (enteredByRole === 'teacher') {
    if (!student.isActive) {
      return { error: 'Teachers can only enter marks for active students.' }
    }
    if (!belongsToClass) {
      return { error: 'The selected student must belong to the subject class.' }
    }
  } else if (!belongsToClass && !isStudentEligibleForClass(student, classRecord)) {
    return {
      error: 'Choose a student from this program for the subject class.',
    }
  }

  return { student, classRecord }
}

async function createMarks(req, res, next) {
  try {
    const subjectFilter = { _id: req.body.subject }
    if (req.user.role === 'teacher') subjectFilter.teacher = req.user._id
    const subject = await Subject.findOne(subjectFilter).select('class name code')

    if (!subject) {
      return res.status(403).json({
        message: req.user.role === 'teacher'
          ? 'You can only enter marks for subjects assigned to you.'
          : 'The selected subject was not found.',
      })
    }

    const relations = await validateMarkRelations({
      studentId: req.body.student,
      subject,
      enteredByRole: req.user.role,
    })
    if (relations.error) {
      return res.status(400).json({ message: relations.error })
    }

    const settings = await getMarksSettings()
    let calculation
    try {
      calculation = calculateMarks(req.body.components, settings, {
        allowPartial: true,
      })
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
      { path: 'class', select: 'name semester academicYear' },
      { path: 'enteredBy', select: 'name' },
    ])

    return res.status(201).json({
      mark: formatMark(mark, settings),
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

    const subjectFilter = {
      _id: mark.subject,
      class: mark.class,
    }
    if (req.user.role === 'teacher') subjectFilter.teacher = req.user._id
    const subject = await Subject.findOne(subjectFilter)
    if (!subject) {
      return res.status(403).json({
        message: req.user.role === 'teacher'
          ? 'You can only edit marks for subjects currently assigned to you.'
          : 'The subject for this marks record was not found.',
      })
    }

    const settings = await getMarksSettings()
    let calculation
    try {
      calculation = calculateMarks(req.body.components, settings, {
        allowPartial: true,
      })
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }

    mark.components = calculation.components
    mark.enteredBy = req.user._id
    await mark.save()
    await mark.populate([
      { path: 'student', select: 'name email rollNo' },
      { path: 'subject', select: 'name code' },
      { path: 'class', select: 'name semester academicYear' },
      { path: 'enteredBy', select: 'name' },
    ])

    return res.json({
      mark: formatMark(mark, settings),
    })
  } catch (error) {
    return next(error)
  }
}

async function listClassSubjectMarks(req, res, next) {
  try {
    const { classId, subjectId } = req.params
    const subjectFilter = {
      _id: subjectId,
      class: classId,
    }
    if (req.user.role === 'teacher') subjectFilter.teacher = req.user._id
    const subject = await Subject.findOne(subjectFilter)

    if (!subject) {
      return res.status(403).json({
        message: req.user.role === 'teacher'
          ? 'You can only view marks for your assigned subjects.'
          : 'The selected subject was not found for this class.',
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
      .populate('subject', 'name code type')
      .populate('class', 'name semester academicYear')
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
