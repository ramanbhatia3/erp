const mongoose = require('mongoose')

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    type: {
      type: String,
      enum: [
        'holiday',
        'exam',
        'workshop',
        'seminar',
        'function',
        'competition',
        'placement',
        'deadline',
      ],
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    visibility: {
      type: String,
      enum: ['university', 'department', 'class'],
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

eventSchema.index({ date: 1, endDate: 1 })
eventSchema.index({ visibility: 1, department: 1, class: 1 })

module.exports = mongoose.model('Event', eventSchema)
