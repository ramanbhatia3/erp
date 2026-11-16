const mongoose = require('mongoose')
const Class = require('../models/Class')
const Department = require('../models/Department')
const Subject = require('../models/Subject')
const User = require('../models/User')
const Attendance = require('../models/Attendance')
const Marks = require('../models/Marks')

function getTeacherScope(req) {
  if (req.user.role !== 'teacher') return {}

  return { teacher: req.user._id }
}

async function validateSubjectRelations({ department, classId, teacher }) {
  const [departmentExists, classRecord, teacherRecord] = await Promise.all([
    Department.exists({ _id: department }),
    Class.findById(classId).select('department'),
    User.findOne({
      _id: teacher,
      role: 'teacher',
      isActive: true,
    }).select('_id'),
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

  return null
}

async function listSubjects(req, res, next) {
  try {
    const filter = getTeacherScope(req)

    if (req.query.department) filter.department = req.query.department
    if (req.query.class) filter.class = req.query.class

    const subjects = await Subject.find(filter)
      .populate('department', 'name code')
      .populate('class', 'name semester academicYear')
      .populate('teacher', 'name email')
      .sort({ department: 1, class: 1, name: 1 })

    return res.json({ subjects })
  } catch (error) {
    return next(error)
  }
}

async function createSubject(req, res, next) {
  try {
    const {
      name,
      code,
      department,
      class: classId,
      teacher,
      type,
      weeklyPeriods,
      roomType,
      isLab,
      requiresConsecutivePeriods,
      consecutivePeriodCount,
    } = req.body
    const validationMessage = await validateSubjectRelations({
      department,
      classId,
      teacher,
    })

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage })
    }

    const classRecord = await Class.findById(classId)
      .populate('department', 'code')
      .select('department semester')
    const isSharedFoundationSubject =
      classRecord.department?.code === 'AS' &&
      [1, 2].includes(Number(classRecord.semester))
    let subject

    if (isSharedFoundationSubject) {
      const peerClasses = await Class.find({
        department: classRecord.department._id,
        semester: classRecord.semester,
      }).select('_id')
      const classIds = peerClasses.map((item) => item._id)
      const duplicate = await Subject.exists({
        class: { $in: classIds },
        code,
      })
      if (duplicate) {
        return res.status(409).json({
          message: 'A subject with this code already exists in an Applied Sciences class for this semester.',
        })
      }

      const sharedGroupId = new mongoose.Types.ObjectId()
      await Subject.insertMany(classIds.map((peerClass) => ({
        name,
        code,
        department,
        class: peerClass._id,
        teacher,
        sharedGroupId,
        type,
        weeklyPeriods,
        roomType,
        isLab,
        requiresConsecutivePeriods,
        consecutivePeriodCount,
      })))
      subject = await Subject.findOne({ sharedGroupId, class: classId })
    } else {
      subject = await Subject.create({
        name,
        code,
        department,
        class: classId,
        teacher,
        type,
        weeklyPeriods,
        roomType,
        isLab,
        requiresConsecutivePeriods,
        consecutivePeriodCount,
      })
    }

    await subject.populate([
      { path: 'department', select: 'name code' },
      { path: 'class', select: 'name semester academicYear' },
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
    for (const field of [
      'name',
      'code',
      'department',
      'class',
      'teacher',
      'type',
      'weeklyPeriods',
      'roomType',
      'isLab',
      'requiresConsecutivePeriods',
      'consecutivePeriodCount',
    ]) {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    }

    if (
      currentSubject.sharedGroupId &&
      (
        (updates.class && String(updates.class) !== String(currentSubject.class)) ||
        (updates.department &&
          String(updates.department) !== String(currentSubject.department))
      )
    ) {
      return res.status(409).json({
        message: 'A shared Applied Sciences subject cannot be moved to another class or department.',
      })
    }

    if (
      !currentSubject.sharedGroupId &&
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

    if (
      currentSubject.sharedGroupId &&
      updates.code &&
      updates.code !== currentSubject.code
    ) {
      const sharedSubjects = await Subject.find({
        sharedGroupId: currentSubject.sharedGroupId,
      }).select('_id class')
      const sharedIds = sharedSubjects.map((item) => item._id)
      const duplicate = await Subject.exists({
        class: { $in: sharedSubjects.map((item) => item.class) },
        code: updates.code,
        _id: { $nin: sharedIds },
      })
      if (duplicate) {
        return res.status(409).json({
          message: 'A subject with this code already exists in an Applied Sciences class for this semester.',
        })
      }
    }

    let subject
    if (currentSubject.sharedGroupId) {
      const sharedUpdates = { ...updates }
      delete sharedUpdates.department
      delete sharedUpdates.class
      await Subject.updateMany(
        { sharedGroupId: currentSubject.sharedGroupId },
        { $set: sharedUpdates },
        { runValidators: true },
      )
      subject = await Subject.findById(req.params.id)
    } else {
      subject = await Subject.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true },
      )
    }

    await subject.populate([
      { path: 'department', select: 'name code' },
      { path: 'class', select: 'name semester academicYear' },
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

    const subject = await Subject.findById(req.params.id)
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' })
    }
    const relatedSubjects = subject.sharedGroupId
      ? await Subject.find({ sharedGroupId: subject.sharedGroupId }).select('_id')
      : [{ _id: subject._id }]
    const subjectIds = relatedSubjects.map((item) => item._id)

    if (
      await Attendance.exists({ subject: { $in: subjectIds } }) ||
      await Marks.exists({ subject: { $in: subjectIds } })
    ) {
      return res.status(409).json({
        message: 'A subject with marks or attendance history cannot be deleted.',
      })
    }

    await Subject.deleteMany({ _id: { $in: subjectIds } })
    return res.status(204).send()
  } catch (error) {
    return next(error)
  }
}

async function listTeachers(req, res, next) {
  try {
    const filter = { role: 'teacher', isActive: true }
    if (req.query.department) filter.department = req.query.department
    const teachers = await User.find(filter)
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
