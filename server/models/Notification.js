const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['announcement', 'attendance_shortage', 'marks', 'assignment'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    link: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
)

notificationSchema.index({ user: 1, createdAt: -1 })
notificationSchema.index({ user: 1, isRead: 1 })

module.exports = mongoose.model('Notification', notificationSchema)
