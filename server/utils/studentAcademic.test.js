const assert = require('node:assert/strict')
const test = require('node:test')
const { getStudentAcademicProgress } = require('./studentAcademic')

test('starts semester one in August and advances in January and July', () => {
  assert.deepEqual(
    getStudentAcademicProgress(2023, new Date(2023, 7, 1)),
    { currentSemester: 1, academicStatus: 'studying', lastCompletedSemester: 0 },
  )
  assert.equal(
    getStudentAcademicProgress(2023, new Date(2024, 0, 1)).currentSemester,
    2,
  )
  assert.equal(
    getStudentAcademicProgress(2023, new Date(2024, 6, 1)).currentSemester,
    3,
  )
  assert.equal(
    getStudentAcademicProgress(2023, new Date(2026, 10, 16)).currentSemester,
    7,
  )
})

test('marks a student as alumni after semester eight completes', () => {
  assert.deepEqual(
    getStudentAcademicProgress(2023, new Date(2027, 5, 30)),
    { currentSemester: 8, academicStatus: 'studying', lastCompletedSemester: 7 },
  )
  assert.deepEqual(
    getStudentAcademicProgress(2023, new Date(2027, 6, 1)),
    { currentSemester: null, academicStatus: 'alumni', lastCompletedSemester: 8 },
  )
})

test('reports students without a valid start year as unknown', () => {
  assert.equal(
    getStudentAcademicProgress(undefined).academicStatus,
    'unknown',
  )
})
