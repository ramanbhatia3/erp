const mongoose = require('mongoose')
const { defaultMarksComponents } = require('../utils/markingScheme')
const { getCurrentAcademicYear } = require('../utils/academicYear')

const marksComponentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 0.01,
      max: 1000,
    },
    group: {
      type: String,
      enum: ['mst', 'assignment', 'attendance', 'final'],
      required: true,
    },
  },
  { _id: false },
)

// Keep one settings record for the whole university.
const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'university',
      unique: true,
      immutable: true,
    },
    attendanceThreshold: {
      type: Number,
      default: 75,
      min: 0,
      max: 100,
    },
    marksComponents: {
      type: [marksComponentSchema],
      default: () => defaultMarksComponents,
      validate: {
        validator: (components) => components.length > 0,
        message: 'At least one marks component is required.',
      },
    },
    passingPercentage: {
      type: Number,
      default: 40,
      min: 0,
      max: 100,
    },
    currentAcademicYear: {
      type: String,
      default: () => getCurrentAcademicYear(),
      trim: true,
      maxlength: 20,
    },
    marksFormulaVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Settings', settingsSchema)
