const mongoose = require('mongoose')

const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    facultyCoordinator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    logo: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
    },
  },
  { timestamps: true },
)

clubSchema.index({ name: 1 })

module.exports = mongoose.model('Club', clubSchema)
