const mongoose = require('mongoose')

// Stores attendance for one class, subject, date, and lecture.
const attendanceSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    lectureNo: {
      type: Number,
      required: true,
      min: 1,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    records: [
      {
        _id: false,
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        status: {
          type: String,
          enum: ['present', 'absent'],
          required: true,
        },
      },
    ],
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    editedAt: {
      type: Date,
    },
  },
  { timestamps: true },
)

attendanceSchema.index(
  { class: 1, subject: 1, date: 1, lectureNo: 1 },
  { unique: true },
)

module.exports = mongoose.model('Attendance', attendanceSchema)
