const assert = require('node:assert/strict')
const test = require('node:test')
const { getSemesterFees, getStudentServices } = require('./studentServices')

test('calculates the standard semester fees without hostel or transport', () => {
  const result = getSemesterFees({}, 1)

  assert.equal(result.fees.academic.amount, 40000)
  assert.equal(result.fees.hostel.amount, 0)
  assert.equal(result.fees.transportation.amount, 0)
  assert.equal(result.fees.exam.amount, 1500)
  assert.equal(result.total, 41500)
})

test('calculates hostel and transport fees and subtracts recorded payments', () => {
  const student = {
    studentServices: {
      hostel: 'girls-hostel-a',
      usesTransport: true,
      semesterFees: [{
        semester: 2,
        academicPaid: 10000,
        hostelPaid: 5000,
        transportationPaid: 15000,
        examPaid: 0,
      }],
    },
  }
  const result = getSemesterFees(student, 2)

  assert.equal(result.fees.academic.amount, 40000)
  assert.equal(result.fees.hostel.amount, 20000)
  assert.equal(result.fees.transportation.amount, 15000)
  assert.equal(result.fees.exam.amount, 1500)
  assert.equal(result.total, 76500)
  assert.equal(result.totalPaid, 30000)
  assert.equal(result.balance, 46500)
})

test('returns semester summaries for the supported semester range', () => {
  const result = getStudentServices({ studentServices: { hostel: 'boys-hostel-b' } })

  assert.equal(result.hostel, 'boys-hostel-b')
  assert.equal(result.semesters.length, 8)
  assert.equal(result.semesters[7].semester, 8)
})

test('preserves fees assessed before a later hostel or transport assignment change', () => {
  const result = getSemesterFees({
    studentServices: {
      hostel: 'boys-hostel-a',
      usesTransport: true,
      semesterFees: [{
        semester: 1,
        assessedAcademic: 40000,
        assessedHostel: 0,
        assessedTransportation: 0,
        assessedExam: 1500,
        academicPaid: 20000,
        hostelPaid: 0,
        transportationPaid: 0,
        examPaid: 0,
      }],
    },
  }, 1)

  assert.equal(result.fees.academic.amount, 40000)
  assert.equal(result.fees.hostel.amount, 0)
  assert.equal(result.fees.transportation.amount, 0)
  assert.equal(result.balance, 21500)
})
