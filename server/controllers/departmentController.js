const mongoose = require('mongoose')
const Department = require('../models/Department')
const Class = require('../models/Class')
const Subject = require('../models/Subject')
const User = require('../models/User')

function isDuplicateCode(error) {
  return error.code === 11000 && error.keyPattern?.code
}

async function getValidHod(hodId) {
  if (!hodId) return null

  const hod = await User.findOne({
    _id: hodId,
    role: 'teacher',
    isActive: true,
  }).select('_id')

  return hod
}

function sendDepartmentError(error, res, next) {
  if (isDuplicateCode(error)) {
    return res.status(409).json({ message: 'A department with this code already exists.' })
  }

  return next(error)
}

async function listDepartments(req, res, next) {
  try {
    if (req.user.role === 'teacher' && !req.user.department) {
      return res.status(403).json({
        message: 'Your account is not assigned to a department.',
      })
    }

    const filter =
      req.user.role === 'teacher'
        ? { _id: req.user.department }
        : {}
    const search = req.query.search?.trim()

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { code: { $regex: escapedSearch, $options: 'i' } },
      ]
    }

    const departments = await Department.find(filter)
      .populate('hod', 'name email')
      .sort({ name: 1 })

    return res.json({ departments })
  } catch (error) {
    return next(error)
  }
}

async function listTeachers(req, res, next) {
  try {
    const teachers = await User.find({ role: 'teacher', isActive: true })
      .select('name email')
      .sort({ name: 1 })

    return res.json({ teachers })
  } catch (error) {
    return next(error)
  }
}

async function createDepartment(req, res, next) {
  try {
    const { name, code, hod } = req.body

    if (hod && !(await getValidHod(hod))) {
      return res.status(400).json({
        message: 'The HOD must be an active teacher.',
      })
    }

    const department = await Department.create({
      name,
      code,
      hod: hod || undefined,
    })

    await department.populate('hod', 'name email')
    return res.status(201).json({ department })
  } catch (error) {
    return sendDepartmentError(error, res, next)
  }
}

async function updateDepartment(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Department ID is invalid.' })
    }

    const updates = {}
    const { name, code, hod } = req.body

    if (name !== undefined) updates.name = name
    if (code !== undefined) updates.code = code

    if (hod !== undefined) {
      if (hod && !(await getValidHod(hod))) {
        return res.status(400).json({
          message: 'The HOD must be an active teacher.',
        })
      }

      updates.hod = hod || null
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'Provide at least one department field to update.',
      })
    }

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true },
    ).populate('hod', 'name email')

    if (!department) {
      return res.status(404).json({ message: 'Department not found.' })
    }

    return res.json({ department })
  } catch (error) {
    return sendDepartmentError(error, res, next)
  }
}

async function deleteDepartment(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Department ID is invalid.' })
    }

    const [hasClasses, hasSubjects, hasUsers] = await Promise.all([
      Class.exists({ department: req.params.id }),
      Subject.exists({ department: req.params.id }),
      User.exists({ department: req.params.id }),
    ])

    if (hasClasses || hasSubjects || hasUsers) {
      return res.status(409).json({
        message: 'Remove this department from its classes, subjects, and users before deleting it.',
      })
    }

    const department = await Department.findByIdAndDelete(req.params.id)

    if (!department) {
      return res.status(404).json({ message: 'Department not found.' })
    }

    return res.status(204).send()
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  listDepartments,
  listTeachers,
  createDepartment,
  updateDepartment,
  deleteDepartment,
}
