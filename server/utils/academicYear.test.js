const assert = require('node:assert/strict')
const test = require('node:test')
const { getCurrentAcademicYear } = require('./academicYear')

test('academic year runs from July through June using Indian local dates', () => {
  assert.equal(
    getCurrentAcademicYear(new Date('2026-11-16T20:01:45+05:30')),
    '2026-27',
  )
  assert.equal(
    getCurrentAcademicYear(new Date('2025-03-15T12:00:00+05:30')),
    '2024-25',
  )
  assert.equal(
    getCurrentAcademicYear(new Date('2025-07-01T00:00:00+05:30')),
    '2025-26',
  )
})
