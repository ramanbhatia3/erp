const mongoose = require('mongoose')

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    roomNumber: {
      type: String,
      trim: true,
    },
    building: {
      type: String,
      trim: true,
    },
    floor: {
      type: Number,
      min: 0,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    type: {
      type: String,
      enum: ['Classroom', 'Computer Lab', 'Laboratory', 'Seminar Hall', 'Conference Room', 'Office'],
      default: 'Classroom',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    equipment: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Room', roomSchema)
