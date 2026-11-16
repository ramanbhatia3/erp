const assert = require('node:assert/strict')
const test = require('node:test')
const { isStudentEligibleForClass } = require('./marksEligibility')

test('allows an advancing CSE student to receive marks in earlier CSE semesters', () => {
  const student = {
    program: 'CSE',
    department: { code: 'CSE' },
    class: { name: 'CSE' },
  }

  for (const semester of [1, 2, 3, 4, 5, 6]) {
    const classRecord = {
      name: 'CSE',
      semester,
      department: { code: semester <= 2 ? 'AS' : 'CSE' },
    }
    assert.equal(isStudentEligibleForClass(student, classRecord), true)
  }
})

test('does not allow marks in a different program class', () => {
  assert.equal(isStudentEligibleForClass(
    { program: 'IT', department: { code: 'IT' }, class: { name: 'IT' } },
    { name: 'CSE', semester: 1, department: { code: 'AS' } },
  ), false)
})

test('uses the student current class as a program fallback', () => {
  assert.equal(isStudentEligibleForClass(
    { class: { name: 'ME' }, department: { code: 'AS' } },
    { name: 'ME', semester: 2, department: { code: 'AS' } },
  ), true)
})
