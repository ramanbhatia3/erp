const mongoose = require('mongoose')

// Stores a class, its department, and its assigned advisor.
const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
    },
    advisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Class', classSchema)
