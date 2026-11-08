const mongoose = require('mongoose')

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
      default: () => [
        { name: 'MST-1', maxMarks: 24 },
        { name: 'MST-2', maxMarks: 24 },
        { name: 'Assignment', maxMarks: 10 },
        { name: 'Attendance', maxMarks: 6 },
        { name: 'Final', maxMarks: 100 },
      ],
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
      default: '2026-27',
      trim: true,
      maxlength: 20,
    },
    currentSemester: {
      type: Number,
      default: 1,
      min: 1,
      max: 12,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Settings', settingsSchema)
