const mongoose = require('mongoose')
const Class = require('../models/Class')
const Department = require('../models/Department')
const Event = require('../models/Event')
const Subject = require('../models/Subject')

function getId(value) {
  return String(value?._id || value)
}

async function getTeacherScope(user) {
  const [advisorClasses, teachingSubjects] = await Promise.all([
    Class.find({ advisor: user._id }).select('_id department'),
    Subject.find({ teacher: user._id }).select('class'),
  ])
  const advisedClassIds = advisorClasses.map((item) => getId(item))
  const taughtClassIds = teachingSubjects.map((item) => getId(item.class))
  const classIds = [...new Set([...advisedClassIds, ...taughtClassIds])]
  const isClassAdvisor = advisedClassIds.length > 0

  return { classIds, isClassAdvisor }
}

async function getRelevantFilter(user) {
  if (user.role === 'superadmin') return {}

  const relevant = [{ visibility: 'university' }]
  if (user.role === 'student') {
    if (user.department) {
      relevant.push({
        visibility: 'department',
        department: user.department,
      })
    }
    if (user.class) {
      relevant.push({ visibility: 'class', class: user.class })
    }
    return { $or: relevant }
  }

  if (user.role === 'teacher') {
    if (user.department) {
      relevant.push({
        visibility: 'department',
        department: user.department,
      })
    }
    const { classIds } = await getTeacherScope(user)
    if (classIds.length) {
      relevant.push({
        visibility: 'class',
        class: { $in: classIds },
      })
    }
    return { $or: relevant }
  }

  return { visibility: 'university' }
}

async function validateEventScope(user, visibility, departmentId, classId) {
  if (user.role === 'superadmin') return { error: null }

  if (user.role !== 'teacher') {
    return { error: 'You do not have permission to manage events.' }
  }

  if (visibility === 'university') {
    return { error: 'Teachers cannot create university-wide events.' }
  }

  if (!user.department) {
    return { error: 'Your account is not assigned to a department.' }
  }

  if (String(departmentId) !== String(user.department)) {
    return { error: 'You can only manage events in your department.' }
  }

  const { classIds, isClassAdvisor } = await getTeacherScope(user)
  if (isClassAdvisor && visibility !== 'class') {
    return { error: 'Class advisors can only manage events for their assigned classes.' }
  }

  if (visibility === 'class') {
    if (!classIds.includes(String(classId))) {
      return { error: 'You can only manage events for classes you teach or advise.' }
    }
    if (isClassAdvisor) {
      const isAdvisedClass = await Class.exists({
        _id: classId,
        advisor: user._id,
      })
      if (!isAdvisedClass) {
        return { error: 'Class advisors can only manage events for their assigned classes.' }
      }
    }
  }

  return { error: null }
}

async function resolveEventScope(user, payload) {
  let departmentId
  let classId

  if (payload.visibility === 'department') {
    departmentId = payload.department
  } else if (payload.visibility === 'class') {
    classId = payload.class
    const targetClass = await Class.findById(classId).select('_id department')
    if (!targetClass) {
      return { response: { status: 404, message: 'Class not found.' } }
    }
    departmentId = targetClass.department
  }

  const permission = await validateEventScope(
    user,
    payload.visibility,
    departmentId,
    classId,
  )
  if (permission.error) {
    return { response: { status: 403, message: permission.error } }
  }

  if (payload.visibility === 'department') {
    const exists = await Department.exists({ _id: departmentId })
    if (!exists) {
      return { response: { status: 404, message: 'Department not found.' } }
    }
  }

  return {
    values: {
      visibility: payload.visibility,
      department: departmentId || undefined,
      class: classId || undefined,
    },
  }
}

function sendScopeError(res, response) {
  if (!response) return false
  res.status(response.status).json({ message: response.message })
  return true
}

function validateDates(date, endDate) {
  if (endDate && new Date(endDate) < new Date(date)) {
    return 'End date cannot be before the event date.'
  }
  return null
}

function getRangeDate(value, isEnd = false) {
  if (!value) return null
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  return new Date(
    dateOnly
      ? `${value}T${isEnd ? '23:59:59.999' : '00:00:00.000'}Z`
      : value,
  )
}

async function listEvents(req, res, next) {
  try {
    const filter = await getRelevantFilter(req.user)
    const { from, to, type } = req.query
    if (from || to) {
      const start = getRangeDate(from)
      const end = getRangeDate(to, true)
      if (start && end) {
        filter.$and = [
          ...(filter.$and || []),
          { date: { $lte: end } },
          {
            $or: [
              { endDate: { $gte: start } },
              { endDate: null, date: { $gte: start } },
            ],
          },
        ]
      } else if (start) {
        filter.$and = [
          ...(filter.$and || []),
          {
            $or: [
              { date: { $gte: start } },
              { endDate: { $gte: start } },
            ],
          },
        ]
      } else {
        filter.date = { $lte: end }
      }
    }
    if (type) filter.type = type

    const events = await Event.find(filter)
      .populate('department', 'name code')
      .populate('class', 'name section semester')
      .populate('createdBy', 'name role')
      .sort({ date: 1, createdAt: -1 })

    return res.json({ events })
  } catch (error) {
    return next(error)
  }
}

async function createEvent(req, res, next) {
  try {
    const dateError = validateDates(req.body.date, req.body.endDate)
    if (dateError) return res.status(400).json({ message: dateError })

    const scope = await resolveEventScope(req.user, req.body)
    if (sendScopeError(res, scope.response)) return

    const event = await Event.create({
      title: req.body.title,
      description: req.body.description || '',
      type: req.body.type,
      date: req.body.date,
      endDate: req.body.endDate || undefined,
      ...scope.values,
      createdBy: req.user._id,
    })
    await event.populate([
      { path: 'department', select: 'name code' },
      { path: 'class', select: 'name section semester' },
      { path: 'createdBy', select: 'name role' },
    ])

    return res.status(201).json({ event })
  } catch (error) {
    return next(error)
  }
}

async function updateEvent(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Event ID is invalid.' })
    }
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'Provide at least one event field to update.' })
    }

    const event = await Event.findById(req.params.id)
    if (!event) return res.status(404).json({ message: 'Event not found.' })

    const payload = {
      title: req.body.title ?? event.title,
      description: req.body.description ?? event.description,
      type: req.body.type ?? event.type,
      date: req.body.date ?? event.date,
      endDate: req.body.endDate === undefined ? event.endDate : req.body.endDate,
      visibility: req.body.visibility ?? event.visibility,
      department:
        req.body.department ??
        (event.department ? getId(event.department) : undefined),
      class:
        req.body.class ?? (event.class ? getId(event.class) : undefined),
    }

    const dateError = validateDates(payload.date, payload.endDate)
    if (dateError) return res.status(400).json({ message: dateError })

    const scope = await resolveEventScope(req.user, payload)
    if (sendScopeError(res, scope.response)) return

    if (
      req.user.role === 'teacher' &&
      event.createdBy &&
      getId(event.createdBy) !== getId(req.user)
    ) {
      return res.status(403).json({ message: 'You can only edit events you created.' })
    }

    Object.assign(event, payload, scope.values, {
      endDate: payload.endDate || undefined,
    })
    await event.save()
    await event.populate([
      { path: 'department', select: 'name code' },
      { path: 'class', select: 'name section semester' },
      { path: 'createdBy', select: 'name role' },
    ])

    return res.json({ event })
  } catch (error) {
    return next(error)
  }
}

async function deleteEvent(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Event ID is invalid.' })
    }

    const event = await Event.findById(req.params.id)
    if (!event) return res.status(404).json({ message: 'Event not found.' })

    if (req.user.role !== 'superadmin') {
      const scope = await validateEventScope(
        req.user,
        event.visibility,
        event.department,
        event.class,
      )
      if (scope.error) {
        return res.status(403).json({ message: scope.error })
      }
      if (getId(event.createdBy) !== getId(req.user)) {
        return res.status(403).json({ message: 'You can only delete events you created.' })
      }
    }

    await event.deleteOne()
    return res.status(204).send()
  } catch (error) {
    return next(error)
  }
}

module.exports = { listEvents, createEvent, updateEvent, deleteEvent }
