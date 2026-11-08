const mongoose = require('mongoose')
const Class = require('../models/Class')
const Department = require('../models/Department')
const Subject = require('../models/Subject')
const User = require('../models/User')
const Attendance = require('../models/Attendance')

function getTeacherScope(req, res) {
  if (req.user.role !== 'teacher') return {}

  if (!req.user.department) {
    res.status(403).json({
      message: 'Your account is not assigned to a department.',
    })
    return null
  }

  const departmentId = String(req.user.department)
  if (req.query.department && req.query.department !== departmentId) {
    res.status(403).json({
      message: 'You do not have access to this department.',
    })
    return null
  }

  return { department: req.user.department }
}

async function validateSubjectRelations({ department, classId, teacher }) {
  const [departmentExists, classRecord, teacherRecord] = await Promise.all([
    Department.exists({ _id: department }),
    Class.findById(classId).select('department'),
    User.findOne({
      _id: teacher,
      role: 'teacher',
      isActive: true,
    }).select('department'),
  ])

  if (!departmentExists) {
    return 'Department was not found.'
  }
  if (!classRecord) {
    return 'Class was not found.'
  }
  if (String(classRecord.department) !== String(department)) {
    return 'The selected class must belong to the selected department.'
  }
  if (!teacherRecord) {
    return 'The assigned teacher must be an active teacher.'
  }
  if (String(teacherRecord.department) !== String(department)) {
    return 'The assigned teacher must belong to the selected department.'
  }

  return null
}

async function listSubjects(req, res, next) {
  try {
    const filter = getTeacherScope(req, res)
    if (!filter) return

    if (req.query.department) filter.department = req.query.department
    if (req.query.class) filter.class = req.query.class

    const subjects = await Subject.find(filter)
      .populate('department', 'name code')
      .populate('class', 'name section semester academicYear')
      .populate('teacher', 'name email')
      .sort({ department: 1, class: 1, name: 1 })

    return res.json({ subjects })
  } catch (error) {
    return next(error)
  }
}

async function createSubject(req, res, next) {
  try {
    const { name, code, department, class: classId, teacher } = req.body
    const validationMessage = await validateSubjectRelations({
      department,
      classId,
      teacher,
    })

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage })
    }

    const subject = await Subject.create({
      name,
      code,
      department,
      class: classId,
      teacher,
    })

    await subject.populate([
      { path: 'department', select: 'name code' },
      { path: 'class', select: 'name section semester academicYear' },
      { path: 'teacher', select: 'name email' },
    ])

    return res.status(201).json({ subject })
  } catch (error) {
    return next(error)
  }
}

async function updateSubject(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Subject ID is invalid.' })
    }

    const currentSubject = await Subject.findById(req.params.id)
    if (!currentSubject) {
      return res.status(404).json({ message: 'Subject not found.' })
    }

    const updates = {}
    for (const field of ['name', 'code', 'department', 'class', 'teacher']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    }

    if (
      updates.class &&
      String(updates.class) !== String(currentSubject.class) &&
      (await Attendance.exists({ subject: currentSubject._id }))
    ) {
      return res.status(409).json({
        message: 'A subject with attendance history cannot be moved to another class.',
      })
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'Provide at least one subject field to update.',
      })
    }

    const relationValues = {
      department: updates.department || currentSubject.department,
      classId: updates.class || currentSubject.class,
      teacher: updates.teacher || currentSubject.teacher,
    }
    const validationMessage = await validateSubjectRelations(relationValues)

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage })
    }

    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true },
    ).populate([
      { path: 'department', select: 'name code' },
      { path: 'class', select: 'name section semester academicYear' },
      { path: 'teacher', select: 'name email' },
    ])

    return res.json({ subject })
  } catch (error) {
    return next(error)
  }
}

async function deleteSubject(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Subject ID is invalid.' })
    }

    if (await Attendance.exists({ subject: req.params.id })) {
      return res.status(409).json({
        message: 'A subject with attendance history cannot be deleted.',
      })
    }

    const subject = await Subject.findByIdAndDelete(req.params.id)
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' })
    }

    return res.status(204).send()
  } catch (error) {
    return next(error)
  }
}

async function listTeachers(req, res, next) {
  try {
    const department = req.query.department
    const teachers = await User.find({
      role: 'teacher',
      isActive: true,
      department,
    })
      .select('name email')
      .sort({ name: 1 })

    return res.json({ teachers })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  listTeachers,
}
