const Announcement = require('../models/Announcement')
const Class = require('../models/Class')
const Department = require('../models/Department')
const User = require('../models/User')
const createNotification = require('../utils/notify')

async function createAnnouncement(req, res, next) {
  try {
    const { title, message, visibility } = req.body
    let department
    let classId

    if (visibility === 'department') {
      department = req.body.department
    } else if (visibility === 'class') {
      classId = req.body.class

      const targetClass = await Class.findById(classId).select('_id department')
      if (!targetClass) {
        return res.status(404).json({ message: 'Class not found.' })
      }

      department = targetClass.department
    }

    if (req.user.role === 'teacher') {
      if (visibility === 'university') {
        return res.status(403).json({
          message: 'Teachers can only post to their department or classes.',
        })
      }

      if (!req.user.department) {
        return res.status(403).json({
          message: 'Your account is not assigned to a department.',
        })
      }

      if (String(department) !== String(req.user.department)) {
        return res.status(403).json({
          message: 'You can only post announcements within your department.',
        })
      }

      const advisorClasses = await Class.find({ advisor: req.user._id })
        .select('_id')

      if (advisorClasses.length > 0) {
        const isAssignedClass = advisorClasses.some(
          (item) => String(item._id) === String(classId),
        )

        if (visibility !== 'class' || !isAssignedClass) {
          return res.status(403).json({
            message: 'Class advisors can only post to their assigned classes.',
          })
        }
      }
    }

    if (visibility === 'department') {
      const exists = await Department.exists({ _id: department })
      if (!exists) {
        return res.status(404).json({ message: 'Department not found.' })
      }
    }

    const announcement = await Announcement.create({
      title,
      message,
      visibility,
      department: department || undefined,
      class: classId || undefined,
      createdBy: req.user._id,
    })

    await announcement.populate([
      { path: 'department', select: 'name code' },
      { path: 'class', select: 'name section semester' },
      { path: 'createdBy', select: 'name role' },
    ])

    let recipients
    if (visibility === 'university') {
      recipients = await User.find({
        isActive: true,
        _id: { $ne: req.user._id },
      }).distinct('_id')
    } else if (visibility === 'department') {
      recipients = await User.find({
        department,
        isActive: true,
        _id: { $ne: req.user._id },
      }).distinct('_id')
    } else {
      const targetClass = await Class.findById(classId)
        .select('department advisor')
      const recipientFilter = {
        isActive: true,
        _id: { $ne: req.user._id },
        $or: [
          { role: 'student', class: classId },
          ...(targetClass?.department
            ? [{ role: 'teacher', department: targetClass.department }]
            : []),
          ...(targetClass?.advisor ? [{ _id: targetClass.advisor }] : []),
        ],
      }
      recipients = await User.find(recipientFilter).distinct('_id')
    }

    await createNotification(recipients, {
      type: 'announcement',
      title: `New announcement: ${title}`,
      message: message.length > 997 ? `${message.slice(0, 997)}...` : message,
      link: '/dashboard',
    })

    return res.status(201).json({ announcement })
  } catch (error) {
    return next(error)
  }
}

async function listAnnouncements(req, res, next) {
  try {
    let filter = {}

    if (req.user.role === 'student') {
      const relevant = [{ visibility: 'university' }]

      if (req.user.department) {
        relevant.push({
          visibility: 'department',
          department: req.user.department,
        })
      }

      if (req.user.class) {
        relevant.push({ visibility: 'class', class: req.user.class })
      }

      filter = { $or: relevant }
    } else if (req.user.role === 'teacher') {
      const advisorClasses = await Class.find({ advisor: req.user._id })
        .select('_id')
      const relevant = [{ visibility: 'university' }]

      if (req.user.department) {
        relevant.push({
          visibility: 'department',
          department: req.user.department,
        })
      }

      if (advisorClasses.length > 0) {
        relevant.push({
          visibility: 'class',
          class: { $in: advisorClasses.map((item) => item._id) },
        })
      } else if (req.user.department) {
        relevant.push({
          visibility: 'class',
          department: req.user.department,
        })
      }

      filter = { $or: relevant }
    } else if (req.user.role !== 'superadmin') {
      filter = { visibility: 'university' }
    }

    const requestedLimit = Number(req.query.limit) || 100
    const announcements = await Announcement.find(filter)
      .populate('department', 'name code')
      .populate('class', 'name section semester')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(requestedLimit)

    return res.json({ announcements })
  } catch (error) {
    return next(error)
  }
}

module.exports = { createAnnouncement, listAnnouncements }
