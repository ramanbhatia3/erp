const Class = require('../models/Class')
const Department = require('../models/Department')
const User = require('../models/User')
const { getStudentAcademicProgress } = require('./studentAcademic')

const programCodes = new Set(['CSE', 'IT', 'ME', 'CE'])

function getStudentProgramCode(value) {
  const program = String(value || '').trim().toUpperCase()
  return programCodes.has(program) ? program : null
}

function getStudentPlacementTarget(programValue, startingYear, date = new Date()) {
  const progress = getStudentAcademicProgress(startingYear, date)
  if (progress.academicStatus === 'unknown') {
    return { progress, placement: null }
  }

  const program = getStudentProgramCode(programValue)
  if (!program) {
    throw new Error('Student program must be CSE, IT, ME, or CE.')
  }

  const semester = progress.academicStatus === 'alumni'
    ? 8
    : progress.currentSemester

  return {
    progress,
    placement: {
      program,
      semester,
      departmentCode: semester <= 2 ? 'AS' : program,
    },
  }
}

async function findStudentPlacement(program, startingYear, date = new Date()) {
  const { progress, placement } = getStudentPlacementTarget(
    program,
    startingYear,
    date,
  )
  if (!placement) return { progress, placement: null }

  const department = await Department.findOne({
    code: placement.departmentCode,
  }).select('_id code')
  if (!department) {
    throw new Error(`Department ${placement.departmentCode} is missing for student placement.`)
  }

  const classRecord = await Class.findOne({
    department: department._id,
    name: placement.program,
    semester: placement.semester,
  }).select('_id')
  if (!classRecord) {
    throw new Error(
      `Class ${placement.program}, semester ${placement.semester} is missing for student placement.`,
    )
  }

  return { progress, placement, department, classRecord }
}

async function synchronizeStudentPlacement(student, date = new Date()) {
  if (student.role !== 'student') return null

  const progress = getStudentAcademicProgress(student.startingYear, date)
  if (!student.class || progress.academicStatus === 'unknown') return progress

  let program = student.program
  if (!program && student.class) {
    const classRecord = typeof student.class === 'object' && student.class.name
      ? student.class
      : await Class.findById(student.class).select('name')
    program = classRecord?.name
  }

  if (!program) return progress

  const result = await findStudentPlacement(program, student.startingYear, date)
  if (!result.placement) return result.progress

  const changed =
    String(student.department) !== String(result.department._id) ||
    String(student.class) !== String(result.classRecord._id) ||
    student.program !== result.placement.program

  if (changed) {
    student.department = result.department._id
    student.class = result.classRecord._id
    student.program = result.placement.program
    await student.save()
  }

  return result.progress
}

async function synchronizeAllStudentPlacements(date = new Date()) {
  const students = await User.find({ role: 'student' })
    .select('_id department class program startingYear')

  for (const student of students) {
    await synchronizeStudentPlacement(student, date)
  }

  return students.length
}

module.exports = {
  findStudentPlacement,
  getStudentProgramCode,
  getStudentPlacementTarget,
  synchronizeAllStudentPlacements,
  synchronizeStudentPlacement,
}
