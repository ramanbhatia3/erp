const Notification = require('../models/Notification')

async function createNotification(userIds, data) {
  const recipients = [
    ...new Set(
      (Array.isArray(userIds) ? userIds : [userIds])
        .filter(Boolean)
        .map((userId) => String(userId._id || userId)),
    ),
  ]

  if (recipients.length === 0) return []

  return Notification.insertMany(
    recipients.map((user) => ({
      user,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link || '',
    })),
  )
}

module.exports = createNotification
