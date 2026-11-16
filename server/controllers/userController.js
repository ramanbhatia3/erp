const crypto = require('crypto')
const Class = require('../models/Class')
const Department = require('../models/Department')
const User = require('../models/User')
const { feeNames, getSemesterFees, getStudentServices } = require('../utils/studentServices')
const { getStudentAcademicProgress } = require('../utils/studentAcademic')
const {
  findStudentPlacement,
  getStudentProgramCode,
  synchronizeAllStudentPlacements,
  synchronizeStudentPlacement,
} = require('../utils/studentPlacement')

const userFields = 'name email role department class program section rollNo startingYear isActive studentServices'

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

function formatManagedUser(user) {
  const record = user.toObject ? user.toObject() : user
  return user.role === 'student'
    ? { ...record, ...getStudentAcademicProgress(user.startingYear) }
    : record
}

async function validateDepartmentAndClass({ role, department, classId }) {
  const departmentExists = await Department.exists({ _id: department })
  if (!departmentExists) return 'Department was not found.'

  if (role === 'student' && classId) {
    const classRecord = await Class.findById(classId).select('department name')
    if (!classRecord) return 'Class was not found.'
    if (String(classRecord.department) !== String(department)) {
      return 'The selected class must belong to the selected department.'
    }
    if (!getStudentProgramCode(classRecord.name)) {
      return 'Student class must be a CSE, IT, ME, or CE program class.'
    }
  }

  return null
}

async function listUsers(req, res, next) {
  try {
    if (!req.query.role || req.query.role === 'student') {
      await synchronizeAllStudentPlacements()
    }

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
      .populate('class', 'name semester academicYear')
      .sort({ name: 1 })

    return res.json({ users: users.map(formatManagedUser) })
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
    const {
      name,
      email,
      role,
      department,
      class: classId,
      section,
      rollNo,
      startingYear,
      password,
    } = req.body

    if (!['teacher', 'student'].includes(role)) {
      return res.status(400).json({ message: 'Only teacher and student accounts can be created here.' })
    }

    const relationError = await validateDepartmentAndClass({
      role,
      department,
      classId,
    })
    if (relationError) return res.status(400).json({ message: relationError })

    let studentPlacement
    let program
    if (role === 'student') {
      const classRecord = await Class.findById(classId).select('name')
      program = getStudentProgramCode(classRecord?.name)
      studentPlacement = await findStudentPlacement(program, startingYear)
      if (!studentPlacement.placement) {
        return res.status(400).json({ message: 'A valid starting year is required for student placement.' })
      }
    }

    const user = await User.create({
      name,
      email,
      role,
      department: studentPlacement?.department?._id || department,
      ...(role === 'student'
        ? {
            class: studentPlacement.classRecord._id,
            program,
            section,
            rollNo,
            startingYear,
          }
        : {}),
      password,
      isFirstLogin: false,
    })
    await user.populate([
      { path: 'department', select: 'name code' },
      { path: 'class', select: 'name semester academicYear' },
    ])

    return res.status(201).json({
      user: formatManagedUser(user),
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
      ['class', 'section', 'rollNo', 'startingYear'].some(
        (field) => req.body[field] !== undefined,
      )
    ) {
      return res.status(400).json({
        message: 'Class, section, roll number, and starting year only apply to student accounts.',
      })
    }

    const updates = {}
    for (const field of [
      'name',
      'email',
      'department',
      'class',
      'section',
      'rollNo',
      'startingYear',
    ]) {
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

    if (role === 'student' && updates.class) {
      const classRecord = await Class.findById(updates.class).select('name')
      const program = getStudentProgramCode(classRecord?.name)
      if (!program) {
        return res.status(400).json({
          message: 'Student class must be a CSE, IT, ME, or CE program class.',
        })
      }
      updates.program = program
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Provide at least one user field to update.' })
    }

    Object.assign(user, updates)
    if (role === 'student') await synchronizeStudentPlacement(user)
    await user.save()
    await user.populate([
      { path: 'department', select: 'name code' },
      { path: 'class', select: 'name semester academicYear' },
    ])

    return res.json({ user: formatManagedUser(user) })
  } catch (error) {
    return sendUserError(error, res, next)
  }
}

async function setUserStatus(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
    if (!user || !['teacher', 'student'].includes(user.role)) {
      return res.status(404).json({ message: 'Managed user not found.' })
    }

    if (
      user.role === 'teacher' &&
      !req.body.isActive &&
      (await Class.exists({ advisor: user._id }))
    ) {
      return res.status(409).json({
        message: "Reassign this teacher's classes before deactivating the account.",
      })
    }

    user.isActive = req.body.isActive
    await user.save()

    return res.json({
      message: user.isActive ? 'User reactivated.' : 'User suspended.',
      user: formatManagedUser(user),
    })
  } catch (error) {
    return next(error)
  }
}

async function setUserPassword(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
    if (!user || !['teacher', 'student'].includes(user.role)) {
      return res.status(404).json({ message: 'Managed user not found.' })
    }

    user.password = req.body.password
    user.isFirstLogin = false
    await user.save()

    return res.json({
      message: 'Password updated by an administrator.',
      user: { id: user.id, name: user.name, email: user.email },
    })
  } catch (error) {
    return next(error)
  }
}

async function removeStudentFromClass(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
    if (!user || user.role !== 'student') {
      return res.status(404).json({ message: 'Student account not found.' })
    }
    if (!user.class) {
      return res.status(400).json({ message: 'This student is not assigned to a class.' })
    }

    user.class = null
    await user.save()
    await user.populate('department', 'name code')

    return res.json({
      message: 'Student removed from the class.',
      user: formatManagedUser(user),
    })
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
      'startingYear',
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
      if (
        values.length !== headers.length ||
        values.some((value, fieldIndex) =>
          headers[fieldIndex] !== 'section' && !value,
        )
      ) {
        throw new Error(`CSV row ${index + 2} must contain all required values.`)
      }

      const row = Object.fromEntries(headers.map((header, fieldIndex) => [header, values[fieldIndex]]))
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        throw new Error(`CSV row ${index + 2} has an invalid email address.`)
      }
      if (!/^\d+$/.test(row.semester) || Number(row.semester) < 1 || Number(row.semester) > 8) {
        throw new Error(`CSV row ${index + 2} must use a semester from 1 to 8.`)
      }
      if (!/^\d{4}$/.test(row.startingYear) || Number(row.startingYear) < 2000 || Number(row.startingYear) > 2100) {
        throw new Error(`CSV row ${index + 2} must use a valid starting year from 2000 to 2100.`)
      }

      return {
        ...row,
        email: row.email.toLowerCase(),
        semester: Number(row.semester),
        startingYear: Number(row.startingYear),
      }
    })

    const emails = rows.map((row) => row.email)
    if (new Set(emails).size !== emails.length) {
      return res.status(400).json({ message: 'CSV contains duplicate email addresses.' })
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

      const matchingClasses = await Class.find({
        department: department._id,
        name: row.className,
        semester: row.semester,
        academicYear: row.academicYear,
      }).select('_id')

      if (matchingClasses.length === 0) {
        throw new Error(`Class "${row.className}" (semester ${row.semester}, academic year ${row.academicYear}) was not found for ${row.departmentCode}.`)
      }
      if (matchingClasses.length > 1) {
        throw new Error(`More than one class matches "${row.className}" (semester ${row.semester}, academic year ${row.academicYear}) for ${row.departmentCode}; resolve the duplicate classes before importing students.`)
      }

      const placement = await findStudentPlacement(
        row.className,
        row.startingYear,
      )
      if (!placement.placement) {
        throw new Error(`CSV row for ${row.email} has no valid student placement.`)
      }

      classes.push({ row, placement })
    }

    const targetRollNumbers = classes.map(
      ({ row, placement }) => `${placement.department._id}:${row.rollNo}`,
    )
    if (new Set(targetRollNumbers).size !== classes.length) {
      return res.status(400).json({ message: 'CSV contains duplicate roll numbers in a department.' })
    }

    for (const { row, placement } of classes) {
      const existingRollNumber = await User.exists({
        role: 'student',
        department: placement.department._id,
        rollNo: row.rollNo,
      })
      if (existingRollNumber) {
        return res.status(409).json({ message: `Roll number ${row.rollNo} already exists in the destination department.` })
      }
    }

    const createdUsers = []
    for (const { row, placement } of classes) {
      const defaultPassword = createDefaultPassword()
      const user = await User.create({
        name: row.name,
        email: row.email,
        role: 'student',
        department: placement.department._id,
        class: placement.classRecord._id,
        program: placement.placement.program,
        section: row.section,
        rollNo: row.rollNo,
        startingYear: row.startingYear,
        password: defaultPassword,
        isFirstLogin: false,
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

async function getMyStudentServices(req, res, next) {
  try {
    return res.json({ services: getStudentServices(req.user) })
  } catch (error) {
    return next(error)
  }
}

async function updateStudentServices(req, res, next) {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      role: 'student',
    })
    if (!user) {
      return res.status(404).json({ message: 'Student account not found.' })
    }

    const services = user.studentServices || {}
    const assignedHostel = req.body.hostel !== undefined
      ? req.body.hostel || ''
      : services.hostel || ''
    if (req.body.hostelRoom?.trim() && !assignedHostel) {
      return res.status(400).json({
        message: 'Assign a hostel before assigning a hostel room.',
      })
    }

    if (req.body.hostel !== undefined) {
      const hostel = assignedHostel
      if (hostel !== services.hostel) services.hostelRoom = ''
      services.hostel = hostel
    }
    if (req.body.hostelRoom !== undefined) services.hostelRoom = req.body.hostelRoom
    if (req.body.usesTransport !== undefined) {
      services.usesTransport = req.body.usesTransport
    }

    user.studentServices = services
    await user.save()
    return res.json({
      message: 'Student hostel, room, and transport assignment updated.',
      services: getStudentServices(user),
    })
  } catch (error) {
    return next(error)
  }
}

async function updateStudentSemesterFees(req, res, next) {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      role: 'student',
    })
    if (!user) {
      return res.status(404).json({ message: 'Student account not found.' })
    }

    const semester = Number(req.params.semester)
    const currentFees = getSemesterFees(user, semester)
    const exceedsFee = feeNames.find(
      (name) => req.body.paid[name] > currentFees.fees[name].amount,
    )
    if (exceedsFee) {
      return res.status(400).json({
        message: `The recorded ${exceedsFee} payment cannot exceed its semester fee of ${currentFees.fees[exceedsFee].amount}.`,
      })
    }

    if (!user.studentServices) user.studentServices = {}
    const semesterFees = (user.studentServices.semesterFees || []).map((item) =>
      item.toObject(),
    )
    const record = semesterFees.find((item) => item.semester === semester)
    const paidAmounts = {
      academicPaid: req.body.paid.academic,
      hostelPaid: req.body.paid.hostel,
      transportationPaid: req.body.paid.transportation,
      examPaid: req.body.paid.exam,
    }
    const assessedAmounts = {
      assessedAcademic: currentFees.fees.academic.amount,
      assessedHostel: currentFees.fees.hostel.amount,
      assessedTransportation: currentFees.fees.transportation.amount,
      assessedExam: currentFees.fees.exam.amount,
    }
    if (record) {
      Object.assign(record, paidAmounts)
      for (const [field, amount] of Object.entries(assessedAmounts)) {
        if (record[field] === undefined) record[field] = amount
      }
    } else {
      semesterFees.push({ semester, ...paidAmounts, ...assessedAmounts })
    }
    user.studentServices.semesterFees = semesterFees
    await user.save()

    return res.json({
      message: `Semester ${semester} fee payments updated.`,
      services: getStudentServices(user),
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  listUsers,
  listTeachers,
  createUser,
  updateUser,
  setUserStatus,
  setUserPassword,
  removeStudentFromClass,
  uploadStudentsCsv,
  assignClassAdvisor,
  getMyStudentServices,
  updateStudentServices,
  updateStudentSemesterFees,
}
