const { getStudentProgramCode } = require('./studentPlacement')

function isStudentEligibleForClass(student, classRecord) {
  const departmentCode = classRecord.department?.code
  const semester = Number(classRecord.semester)
  const classProgram =
    getStudentProgramCode(classRecord.name) ||
    (departmentCode === 'AS' ? null : getStudentProgramCode(departmentCode))

  if (!classProgram) return false
  if (semester <= 2 && departmentCode !== 'AS') return false
  if (semester > 2 && departmentCode !== classProgram) return false

  const studentDepartmentCode = student.department?.code
  const studentProgram =
    getStudentProgramCode(student.program) ||
    getStudentProgramCode(student.class?.name) ||
    (studentDepartmentCode === 'AS'
      ? null
      : getStudentProgramCode(studentDepartmentCode))

  return studentProgram === classProgram
}

module.exports = { isStudentEligibleForClass }
