const assert = require('node:assert/strict')
const test = require('node:test')
const { getCurrentAcademicYear } = require('./academicYear')
const Settings = require('../models/Settings')
const Timetable = require('../models/Timetable')

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

test('Mongoose defaults ignore the query context passed during upserts', () => {
  const queryContext = {}
  const currentAcademicYear = getCurrentAcademicYear()

  assert.equal(
    Settings.schema.path('currentAcademicYear').defaultValue.call(queryContext, queryContext),
    currentAcademicYear,
  )
  assert.equal(
    Timetable.schema.path('academicSession').defaultValue.call(queryContext, queryContext),
    currentAcademicYear,
  )
})
