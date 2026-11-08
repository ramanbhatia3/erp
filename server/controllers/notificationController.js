const mongoose = require('mongoose')
const Notification = require('../models/Notification')

async function listMine(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 100
    const page = Number(req.query.page) || 1
    const filter = { user: req.user._id }
    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter),
    ])

    return res.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return next(error)
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    })

    return res.json({ count })
  } catch (error) {
    return next(error)
  }
}

async function markRead(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Notification ID is invalid.' })
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true, runValidators: true },
    )

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' })
    }

    return res.json({ notification })
  } catch (error) {
    return next(error)
  }
}

async function markAllRead(req, res, next) {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } },
    )

    return res.json({ modifiedCount: result.modifiedCount })
  } catch (error) {
    return next(error)
  }
}

module.exports = { listMine, getUnreadCount, markRead, markAllRead }
