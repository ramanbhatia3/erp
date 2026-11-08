const crypto = require('crypto')
const Class = require('../models/Class')
const Department = require('../models/Department')
const User = require('../models/User')

const userFields = 'name email role department class section rollNo isActive isFirstLogin'

function createDefaultPassword() {
  return crypto.randomBytes(12).toString('base64url')
}

function isDuplicateEmail(error) {
  return error.code === 11000 && error.keyPattern?.email
}

function sendUserError(error, res, next) {
  if (isDuplicateEmail(error)) {
    return res.status(409).json({ message: 'A user with this email already exists.' })
  }

  return next(error)
}

async function validateDepartmentAndClass({ role, department, classId }) {
  const departmentExists = await Department.exists({ _id: department })
  if (!departmentExists) return 'Department was not found.'

  if (role === 'student') {
    const classRecord = await Class.findById(classId).select('department')
    if (!classRecord) return 'Class was not found.'
    if (String(classRecord.department) !== String(department)) {
      return 'The selected class must belong to the selected department.'
    }
  }

  return null
}

async function listUsers(req, res, next) {
  try {
    const filter = { role: { $in: ['teacher', 'student'] } }

    if (req.query.role) filter.role = req.query.role
    if (req.query.department) filter.department = req.query.department
    if (req.query.class) filter.class = req.query.class
    if (req.query.active === 'true') filter.isActive = true
    if (req.query.active === 'false') filter.isActive = false

    const search = req.query.search?.trim()
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$and = [
        { $or: [{ name: { $regex: escaped, $options: 'i' } }, { email: { $regex: escaped, $options: 'i' } }, { rollNo: { $regex: escaped, $options: 'i' } }] },
      ]
    }

    const users = await User.find(filter)
      .select(userFields)
      .populate('department', 'name code')
      .populate('class', 'name semester section academicYear')
      .sort({ name: 1 })

    return res.json({ users })
  } catch (error) {
    return next(error)
  }
}

async function listTeachers(req, res, next) {
  try {
    const filter = { role: 'teacher', isActive: true }
    if (req.query.department) filter.department = req.query.department

    const teachers = await User.find(filter)
      .select('name email department')
      .sort({ name: 1 })

    return res.json({ teachers })
  } catch (error) {
    return next(error)
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, role, department, class: classId, section, rollNo } = req.body

    if (!['teacher', 'student'].includes(role)) {
      return res.status(400).json({ message: 'Only teacher and student accounts can be created here.' })
    }

    const relationError = await validateDepartmentAndClass({
      role,
      department,
      classId,
    })
    if (relationError) return res.status(400).json({ message: relationError })

    const defaultPassword = createDefaultPassword()
    const user = await User.create({
      name,
      email,
      role,
      department,
      ...(role === 'student' ? { class: classId, section, rollNo } : {}),
      password: defaultPassword,
    })
    await user.populate([
      { path: 'department', select: 'name code' },
      { path: 'class', select: 'name semester section academicYear' },
    ])

    return res.status(201).json({
      user,
      defaultPassword,
    })
  } catch (error) {
    return sendUserError(error, res, next)
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
    if (!user || !['teacher', 'student'].includes(user.role)) {
      return res.status(404).json({ message: 'Managed user not found.' })
    }

    if (
      user.role === 'teacher' &&
      ['class', 'section', 'rollNo'].some((field) => req.body[field] !== undefined)
    ) {
      return res.status(400).json({
        message: 'Class, section, and roll number only apply to student accounts.',
      })
    }

    const updates = {}
    for (const field of ['name', 'email', 'department', 'class', 'section', 'rollNo']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    }

    const role = user.role
    const department = updates.department || user.department
    const classId = role === 'student' ? updates.class || user.class : undefined

    if (
      role === 'teacher' &&
      updates.department &&
      String(updates.department) !== String(user.department) &&
      (await Class.exists({ advisor: user._id }))
    ) {
      return res.status(409).json({
        message: "Reassign this teacher's class advisor duties before changing departments.",
      })
    }

    const relationError = await validateDepartmentAndClass({
      role,
      department,
      classId,
    })
    if (relationError) return res.status(400).json({ message: relationError })

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Provide at least one user field to update.' })
    }

    Object.assign(user, updates)
    await user.save()
    await user.populate([
      { path: 'department', select: 'name code' },
      { path: 'class', select: 'name semester section academicYear' },
    ])

    return res.json({ user })
  } catch (error) {
    return sendUserError(error, res, next)
  }
}

async function deactivateUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
    if (!user || !['teacher', 'student'].includes(user.role)) {
      return res.status(404).json({ message: 'Managed user not found.' })
    }

    if (user.role === 'teacher' && (await Class.exists({ advisor: user._id }))) {
      return res.status(409).json({
        message: "Reassign this teacher's classes before deactivating the account.",
      })
    }

    user.isActive = false
    await user.save()

    return res.json({ message: 'User deactivated.', user })
  } catch (error) {
    return next(error)
  }
}

function parseCsvLine(line) {
  const fields = []
  let field = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"' && quoted && line[index + 1] === '"') {
      field += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      fields.push(field.trim())
      field = ''
    } else {
      field += character
    }
  }

  if (quoted) throw new Error('CSV contains an unclosed quoted field.')
  fields.push(field.trim())
  return fields
}

async function uploadStudentsCsv(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Choose a CSV file to upload.' })
    }
    if (!req.file.originalname.toLowerCase().endsWith('.csv')) {
      return res.status(400).json({ message: 'The uploaded file must have a .csv extension.' })
    }

    const content = req.file.buffer.toString('utf8').replace(/^\uFEFF/, '')
    const lines = content.split(/\r?\n/).filter((line) => line.trim())
    const requiredHeaders = [
      'name',
      'email',
      'departmentCode',
      'className',
      'semester',
      'section',
      'academicYear',
      'rollNo',
    ]

    if (lines.length < 2) {
      return res.status(400).json({ message: 'CSV must contain a header and at least one student row.' })
    }

    const headers = parseCsvLine(lines[0]).map((header) => header.trim())
    if (
      headers.length !== requiredHeaders.length ||
      !requiredHeaders.every((header, index) => headers[index] === header)
    ) {
      return res.status(400).json({
        message: `CSV headers must be exactly: ${requiredHeaders.join(', ')}`,
      })
    }

    if (lines.length > 501) {
      return res.status(400).json({ message: 'Upload a maximum of 500 students per CSV.' })
    }

    const rows = lines.slice(1).map((line, index) => {
      const values = parseCsvLine(line)
      if (values.length !== headers.length || values.some((value) => !value)) {
        throw new Error(`CSV row ${index + 2} must contain all 8 values.`)
      }

      const row = Object.fromEntries(headers.map((header, fieldIndex) => [header, values[fieldIndex]]))
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        throw new Error(`CSV row ${index + 2} has an invalid email address.`)
      }
      if (!/^\d+$/.test(row.semester) || Number(row.semester) < 1 || Number(row.semester) > 12) {
        throw new Error(`CSV row ${index + 2} has an invalid semester.`)
      }

      return { ...row, email: row.email.toLowerCase(), semester: Number(row.semester) }
    })

    const emails = rows.map((row) => row.email)
    if (new Set(emails).size !== emails.length) {
      return res.status(400).json({ message: 'CSV contains duplicate email addresses.' })
    }
    if (new Set(rows.map((row) => `${row.departmentCode}:${row.rollNo}`)).size !== rows.length) {
      return res.status(400).json({ message: 'CSV contains duplicate roll numbers in a department.' })
    }

    const existingUsers = await User.find({ email: { $in: emails } }).select('email')
    if (existingUsers.length) {
      return res.status(409).json({
        message: `These email addresses already exist: ${existingUsers.map((user) => user.email).join(', ')}`,
      })
    }

    const departmentCodes = [...new Set(rows.map((row) => row.departmentCode.toUpperCase()))]
    const departments = await Department.find({ code: { $in: departmentCodes } }).select('_id code')
    const departmentsByCode = new Map(departments.map((department) => [department.code, department]))
    const classes = []

    for (const row of rows) {
      const department = departmentsByCode.get(row.departmentCode.toUpperCase())
      if (!department) {
        throw new Error(`Department code ${row.departmentCode} was not found.`)
      }

      const classRecord = await Class.findOne({
        department: department._id,
        name: row.className,
        semester: row.semester,
        section: row.section,
        academicYear: row.academicYear,
      }).select('_id')

      if (!classRecord) {
        throw new Error(`Class "${row.className}" (semester ${row.semester}, section ${row.section}) was not found for ${row.departmentCode}.`)
      }

      classes.push({ row, department, classRecord })
    }

    for (const { row, department } of classes) {
      const existingRollNumber = await User.exists({
        role: 'student',
        department: department._id,
        rollNo: row.rollNo,
      })
      if (existingRollNumber) {
        return res.status(409).json({
          message: `Roll number ${row.rollNo} already exists in ${row.departmentCode}.`,
        })
      }
    }

    const createdUsers = []
    for (const { row, department, classRecord } of classes) {
      const defaultPassword = createDefaultPassword()
      const user = await User.create({
        name: row.name,
        email: row.email,
        role: 'student',
        department: department._id,
        class: classRecord._id,
        section: row.section,
        rollNo: row.rollNo,
        password: defaultPassword,
      })
      createdUsers.push({
        id: user.id,
        name: user.name,
        email: user.email,
        defaultPassword,
      })
    }

    return res.status(201).json({
      message: `${createdUsers.length} students created.`,
      users: createdUsers,
    })
  } catch (error) {
    if (error instanceof Error && !error.name.startsWith('Mongo')) {
      return res.status(400).json({ message: error.message })
    }
    return sendUserError(error, res, next)
  }
}

async function assignClassAdvisor(req, res, next) {
  try {
    const classRecord = await Class.findById(req.params.classId)
    if (!classRecord) {
      return res.status(404).json({ message: 'Class not found.' })
    }

    const { advisor } = req.body
    if (advisor) {
      const teacher = await User.findOne({
        _id: advisor,
        role: 'teacher',
        department: classRecord.department,
        isActive: true,
      })

      if (!teacher) {
        return res.status(400).json({
          message: "Choose an active teacher from this class's department.",
        })
      }
    }

    classRecord.advisor = advisor || null
    await classRecord.save()
    await classRecord.populate([
      { path: 'department', select: 'name code' },
      { path: 'advisor', select: 'name email' },
    ])

    return res.json({ class: classRecord })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  listUsers,
  listTeachers,
  createUser,
  updateUser,
  deactivateUser,
  uploadStudentsCsv,
  assignClassAdvisor,
}
