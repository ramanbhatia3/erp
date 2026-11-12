const mongoose = require('mongoose')

const timetableEntrySchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    academicSession: {
      type: String,
      trim: true,
      default: '2026-27',
    },
    day: {
      type: String,
      required: true,
      trim: true,
    },
    period: {
      type: Number,
      required: true,
      min: 1,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Timetable', timetableEntrySchema)
