const assert = require('node:assert/strict')
const test = require('node:test')
const {
  getStudentPlacementTarget,
  synchronizeStudentPlacement,
} = require('./studentPlacement')

test('places first- and second-year students in Applied Sciences classes', () => {
  const firstSemester = getStudentPlacementTarget(
    'ME',
    2026,
    new Date(2026, 10, 16),
  )
  const secondSemester = getStudentPlacementTarget(
    'ME',
    2026,
    new Date(2027, 0, 15),
  )

  assert.deepEqual(firstSemester.placement, {
    program: 'ME',
    semester: 1,
    departmentCode: 'AS',
  })
  assert.deepEqual(secondSemester.placement, {
    program: 'ME',
    semester: 2,
    departmentCode: 'AS',
  })
})

test('places students in their program department from semester three', () => {
  const result = getStudentPlacementTarget(
    'CSE',
    2025,
    new Date(2026, 10, 16),
  )

  assert.deepEqual(result.placement, {
    program: 'CSE',
    semester: 3,
    departmentCode: 'CSE',
  })
})

test('keeps alumni associated with their final program semester', () => {
  const result = getStudentPlacementTarget(
    'CE',
    2022,
    new Date(2030, 6, 1),
  )

  assert.deepEqual(result.placement, {
    program: 'CE',
    semester: 8,
    departmentCode: 'CE',
  })
  assert.equal(result.progress.academicStatus, 'alumni')
})

test('does not reassign students who were intentionally removed from a class', async () => {
  const progress = await synchronizeStudentPlacement({
    role: 'student',
    class: null,
    program: 'CSE',
    startingYear: 2026,
  }, new Date(2026, 10, 16))

  assert.equal(progress.currentSemester, 1)
  assert.equal(progress.academicStatus, 'studying')
})
