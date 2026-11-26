const assert = require('node:assert/strict')
const test = require('node:test')
const { calculateMarks } = require('./calculations')
const { defaultMarksComponents } = require('./markingScheme')

const settings = {
  marksComponents: defaultMarksComponents,
  passingPercentage: 40,
}

function submittedMarks(values) {
  return defaultMarksComponents.map((component) => ({
    name: component.name,
    marksObtained: values[component.name],
    maxMarks: component.maxMarks,
  }))
}

test('calculates the complete grouped result out of 100', () => {
  const result = calculateMarks(submittedMarks({
    'MST 1': 20,
    'MST 2': 22,
    'Assignment 1': 8,
    'Assignment 2': 9,
    'Assignment 3': 10,
    Attendance: 5,
    'Final Exam': 59,
  }), settings)

  assert.deepEqual(result.displayComponents.map((component) => component.marksObtained), [
    21, 9, 5, 59,
  ])
  assert.equal(result.total, 94)
  assert.equal(result.maxTotal, 100)
  assert.equal(result.result, 'pass')
})

test('rounds fractional category scores upward after averaging', () => {
  const result = calculateMarks(submittedMarks({
    'MST 1': 6.01,
    'MST 2': 6.01,
    'Assignment 1': 6.01,
    'Assignment 2': 6.01,
    'Assignment 3': 6.01,
    Attendance: 5.01,
    'Final Exam': 6.01,
  }), settings)

  assert.deepEqual(result.displayComponents.map((component) => component.marksObtained), [
    7, 7, 6, 7,
  ])
  assert.equal(result.total, 27)
})

test('rejects missing and out-of-range component marks', () => {
  const incompleteMarks = submittedMarks({
    'MST 1': 24,
    'MST 2': 24,
    'Assignment 1': 10,
    'Assignment 2': 10,
    'Assignment 3': 10,
    Attendance: 6,
    'Final Exam': 60,
  }).filter((component) => component.name !== 'Final Exam')
  assert.throws(
    () => calculateMarks(incompleteMarks, settings),
    /missing for the "Final Exam" component/,
  )

  assert.throws(
    () => calculateMarks(submittedMarks({
      'MST 1': 24,
      'MST 2': 24,
      'Assignment 1': 10,
      'Assignment 2': 10,
      'Assignment 3': 10,
      Attendance: undefined,
      'Final Exam': 60,
    }), settings),
    /"Attendance" are required/,
  )

  assert.throws(
    () => calculateMarks(submittedMarks({
      'MST 1': 24,
      'MST 2': 24,
      'Assignment 1': 10,
      'Assignment 2': 10,
      'Assignment 3': 10,
      Attendance: 6.01,
      'Final Exam': 60,
    }), settings),
    /between 0 and 6/,
  )
})

test('calculates entered components without treating missing marks as zero', () => {
  const result = calculateMarks([
    { name: 'MST 1', marksObtained: 6.01, maxMarks: 24 },
    { name: 'Attendance', marksObtained: 5, maxMarks: 6 },
  ], settings, { allowPartial: true })

  assert.deepEqual(result.displayComponents.map((component) => component.name), [
    'MST Average (1/2 entered)',
    'Attendance',
  ])
  assert.deepEqual(result.displayComponents.map((component) => component.marksObtained), [
    7, 5,
  ])
  assert.equal(result.total, 12)
  assert.equal(result.maxTotal, 30)
  assert.equal(result.result, 'incomplete')
})

test('keeps historical ungrouped marks on their original calculation', () => {
  const result = calculateMarks([
    { name: 'MST-1', marksObtained: 20, maxMarks: 24 },
    { name: 'Final', marksObtained: 65, maxMarks: 100 },
  ], settings, { allowHistorical: true })

  assert.equal(result.total, 85)
  assert.equal(result.maxTotal, 124)
  assert.deepEqual(result.displayComponents, result.components)
})

test('calculates lab marks out of 50 with 30 internal (viva 1, viva 2, lab record) and 20 external', () => {
  const labSubject = { name: 'Engineering Physics Lab', code: 'BTAS103-23', isLab: true, type: 'Lab' }
  const result = calculateMarks([
    { name: 'Viva 1', marksObtained: 8, maxMarks: 10 },
    { name: 'Viva 2', marksObtained: 9, maxMarks: 10 },
    { name: 'Lab Record', marksObtained: 9, maxMarks: 10 },
    { name: 'Final Exam', marksObtained: 16, maxMarks: 20 },
  ], settings, { subject: labSubject })

  assert.equal(result.total, 42)
  assert.equal(result.maxTotal, 50)
  assert.equal(result.percentage, 84)
  assert.equal(result.result, 'pass')
  assert.equal(result.displayComponents.length, 4)
})

test('rejects out of range marks for lab components', () => {
  const labSubject = { name: 'Data Structures Lab', code: 'BTCS303-18', isLab: true }
  assert.throws(
    () => calculateMarks([
      { name: 'Viva 1', marksObtained: 11, maxMarks: 10 },
      { name: 'Viva 2', marksObtained: 9, maxMarks: 10 },
      { name: 'Lab Record', marksObtained: 9, maxMarks: 10 },
      { name: 'Final Exam', marksObtained: 16, maxMarks: 20 },
    ], settings, { subject: labSubject }),
    /between 0 and 10/,
  )
})
