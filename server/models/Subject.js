const mongoose = require('mongoose')

// Stores a subject and the class and teacher it belongs to.
const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sharedGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ['Theory', 'Practical', 'Lab', 'Elective', 'Project', 'Training', 'Mandatory'],
      default: 'Theory',
    },
    credits: {
      type: Number,
      min: 0,
      max: 30,
      default: 3,
    },
    internalMax: {
      type: Number,
      min: 0,
      default: 40,
    },
    externalMax: {
      type: Number,
      min: 0,
      default: 60,
    },
    totalMarks: {
      type: Number,
      min: 0,
      default: 100,
    },
    weeklyPeriods: {
      type: Number,
      min: 1,
      max: 12,
      default: 1,
    },
    roomType: {
      type: String,
      trim: true,
      default: 'Classroom',
    },
    isLab: {
      type: Boolean,
      default: false,
    },
    requiresConsecutivePeriods: {
      type: Boolean,
      default: false,
    },
    consecutivePeriodCount: {
      type: Number,
      min: 1,
      max: 6,
      default: 1,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Subject', subjectSchema)
