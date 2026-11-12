const mongoose = require('mongoose')

const timetableConfigurationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'university',
      unique: true,
      immutable: true,
    },
    startTime: {
      type: String,
      default: '09:00',
    },
    endTime: {
      type: String,
      default: '16:00',
    },
    lectureDuration: {
      type: Number,
      default: 50,
      min: 30,
      max: 180,
    },
    workingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    breaks: {
      type: [
        {
          name: String,
          startTime: String,
          endTime: String,
        },
      ],
      default: [{ name: 'Break', startTime: '11:30', endTime: '12:00' }],
    },
    lunch: {
      startTime: { type: String, default: '13:40' },
      endTime: { type: String, default: '14:20' },
    },
    numberOfPeriods: {
      type: Number,
      default: 7,
      min: 1,
      max: 12,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('TimetableConfiguration', timetableConfigurationSchema)
