const mongoose = require('mongoose')
const Class = require('../models/Class')
const Department = require('../models/Department')
const Subject = require('../models/Subject')
const User = require('../models/User')
const Attendance = require('../models/Attendance')
const { getCurrentAcademicYear } = require('../utils/academicYear')

async function getTeacherScope(req) {
  if (req.user.role !== 'teacher') return {}

  const subjectClasses = await Subject.find({ teacher: req.user._id }).distinct('class')
  return {
    $or: [
      { advisor: req.user._id },
      { _id: { $in: subjectClasses } },
    ],
  }
}

async function validateDepartment(departmentId) {
  return Department.exists({ _id: departmentId })
}

async function listClasses(req, res, next) {
  try {
    const currentAcademicYear = getCurrentAcademicYear()
    await Class.updateMany(
      { academicYear: { $ne: currentAcademicYear } },
      { $set: { academicYear: currentAcademicYear } },
    )

    const filter = await getTeacherScope(req)

    if (req.query.department) {
      filter.department = req.query.department
    }
    if (req.query.semester) {
      filter.semester = Number(req.query.semester)
    }
    const classes = await Class.find(filter)
      .populate('department', 'name code')
      .populate('advisor', 'name email')
      .sort({ department: 1, semester: 1, name: 1 })

    return res.json({ classes })
  } catch (error) {
    return next(error)
  }
}

async function getClassSubjects(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Class ID is invalid.' })
    }

    const classRecord = await Class.findById(req.params.id)
    if (!classRecord) {
      return res.status(404).json({ message: 'Class not found.' })
    }

    if (req.user.role === 'teacher') {
      const hasAccess =
        String(classRecord.advisor) === String(req.user._id) ||
        await Subject.exists({ class: classRecord._id, teacher: req.user._id })
      if (!hasAccess) {
        return res.status(403).json({ message: 'You do not have access to this class.' })
      }
    }

    const subjects = await Subject.find({ class: req.params.id })
      .populate('department', 'name code')
      .populate('teacher', 'name email')
      .sort({ name: 1 })

    return res.json({ class: classRecord, subjects })
  } catch (error) {
    return next(error)
  }
}

async function getClassFaculty(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Class ID is invalid.' })
    }

    const classRecord = await Class.findById(req.params.id)
    if (!classRecord) {
      return res.status(404).json({ message: 'Class not found.' })
    }

    if (req.user.role === 'teacher') {
      const hasAccess =
        String(classRecord.advisor) === String(req.user._id) ||
        await Subject.exists({ class: classRecord._id, teacher: req.user._id })
      if (!hasAccess) {
        return res.status(403).json({ message: 'You do not have access to this class.' })
      }
    }

    const subjects = await Subject.find({ class: req.params.id })
      .populate('teacher', 'name email department')
      .lean()

    const faculty = [...new Map(subjects
      .filter((subject) => subject.teacher)
      .map((subject) => [String(subject.teacher._id), subject.teacher]))
      .values()]

    return res.json({ class: classRecord, faculty })
  } catch (error) {
    return next(error)
  }
}

async function createClass(req, res, next) {
  try {
    const { department, name, semester } = req.body

    if (!(await validateDepartment(department))) {
      return res.status(400).json({ message: 'Department was not found.' })
    }

    const newClass = await Class.create({
      department,
      name,
      semester,
      academicYear: getCurrentAcademicYear(),
    })

    await newClass.populate('department', 'name code')
    return res.status(201).json({ class: newClass })
  } catch (error) {
    return next(error)
  }
}

async function updateClass(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Class ID is invalid.' })
    }

    const existingClass = await Class.findById(req.params.id)
    if (!existingClass) {
      return res.status(404).json({ message: 'Class not found.' })
    }

    const updates = {}
    for (const field of ['department', 'name', 'semester', 'academicYear']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'Provide at least one class field to update.',
      })
    }

    if (
      updates.department &&
      !(await validateDepartment(updates.department))
    ) {
      return res.status(400).json({ message: 'Department was not found.' })
    }

    if (
      updates.department &&
      String(updates.department) !== String(existingClass.department)
    ) {
      const [hasSubjects, hasUsers] = await Promise.all([
        Subject.exists({ class: req.params.id }),
        User.exists({ class: req.params.id }),
      ])

      if (hasSubjects || hasUsers) {
        return res.status(409).json({
          message: "Move or remove this class's subjects and students before changing its department.",
        })
      }
    }

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true },
    ).populate('department', 'name code').populate('advisor', 'name email')

    if (!updatedClass) {
      return res.status(404).json({ message: 'Class not found.' })
    }

    return res.json({ class: updatedClass })
  } catch (error) {
    return next(error)
  }
}

async function deleteClass(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Class ID is invalid.' })
    }

    const [hasSubjects, hasStudents, hasAttendance] = await Promise.all([
      Subject.exists({ class: req.params.id }),
      User.exists({ class: req.params.id }),
      Attendance.exists({ class: req.params.id }),
    ])

    if (hasSubjects || hasStudents || hasAttendance) {
      return res.status(409).json({
        message: 'Remove this class from its subjects and students before deleting it. Classes with attendance history cannot be deleted.',
      })
    }

    const deletedClass = await Class.findByIdAndDelete(req.params.id)
    if (!deletedClass) {
      return res.status(404).json({ message: 'Class not found.' })
    }

    return res.status(204).send()
  } catch (error) {
    return next(error)
  }
}

module.exports = { listClasses, getClassSubjects, getClassFaculty, createClass, updateClass, deleteClass }
