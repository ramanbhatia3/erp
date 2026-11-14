const Announcement = require('../models/Announcement')
const Class = require('../models/Class')
const Department = require('../models/Department')
const Subject = require('../models/Subject')

async function createAnnouncement(req, res, next) {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only the super admin can post announcements.' })
    }

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

    return res.status(201).json({ announcement })
  } catch (error) {
    return next(error)
  }
}

async function listAnnouncements(req, res, next) {
  try {
    let filter = {}

    if (req.user.role === 'teacher') {
      const [advisorClasses, teachingSubjects] = await Promise.all([
        Class.find({ advisor: req.user._id }).select('_id'),
        Subject.find({ teacher: req.user._id }).select('class'),
      ])
      const classIds = [
        ...new Set([
          ...advisorClasses.map((item) => String(item._id)),
          ...teachingSubjects.map((subject) => String(subject.class)),
        ]),
      ]
      const relevant = [{ visibility: 'university' }]

      if (req.user.department) {
        relevant.push({
          visibility: 'department',
          department: req.user.department,
        })
      }

      if (classIds.length) {
        relevant.push({
          visibility: 'class',
          class: { $in: classIds },
        })
      }

      filter = { $or: relevant }
    } else if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'You do not have permission.' })
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
