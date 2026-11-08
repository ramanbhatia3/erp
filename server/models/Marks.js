const mongoose = require('mongoose')

const marksComponentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    marksObtained: {
      type: Number,
      required: true,
      min: 0,
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 0.01,
    },
  },
  { _id: false },
)

// Stores one student's marks for a subject in an academic term.
const marksSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    components: {
      type: [marksComponentSchema],
      required: true,
      validate: {
        validator: (components) => components.length > 0,
        message: 'At least one marks component is required.',
      },
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

marksSchema.index(
  { student: 1, subject: 1, semester: 1, academicYear: 1 },
  { unique: true },
)

module.exports = mongoose.model('Marks', marksSchema)
