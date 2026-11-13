const mongoose = require('mongoose')

const clubAnnouncementSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

clubAnnouncementSchema.index({ club: 1, createdAt: -1 })

module.exports = mongoose.model('ClubAnnouncement', clubAnnouncementSchema)
