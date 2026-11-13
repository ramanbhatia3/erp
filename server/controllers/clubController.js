const mongoose = require('mongoose')
const Club = require('../models/Club')
const ClubAnnouncement = require('../models/ClubAnnouncement')
const ClubEvent = require('../models/ClubEvent')
const User = require('../models/User')

async function findClub(id) {
  if (!mongoose.isValidObjectId(id)) return null
  return Club.findById(id)
}

function canManageClub(user, club) {
  return (
    user.role === 'superadmin' ||
    (user.role === 'teacher' &&
      String(club.facultyCoordinator) === String(user._id))
  )
}

async function validateMembers(memberIds) {
  if (!Array.isArray(memberIds)) return 'Members must be a list of student IDs.'
  if (memberIds.some((id) => !mongoose.isValidObjectId(id))) {
    return 'A member ID is invalid.'
  }
  const uniqueIds = [...new Set(memberIds.map(String))]
  const count = await User.countDocuments({
    _id: { $in: uniqueIds },
    role: 'student',
    isActive: true,
  })
  return count === uniqueIds.length ? null : 'All members must be active students.'
}

async function validateCoordinator(id) {
  if (!mongoose.isValidObjectId(id)) return null
  return User.findOne({ _id: id, role: 'teacher', isActive: true }).select('_id')
}

async function listClubs(req, res, next) {
  try {
    const clubs = await Club.find()
      .populate('facultyCoordinator', 'name email')
      .sort({ name: 1 })
    const responseClubs = clubs.map((club) => {
      const item = club.toObject()
      item.memberCount = club.members.length
      item.isMember =
        req.user.role === 'student' &&
        club.members.some((id) => String(id) === String(req.user._id))
      delete item.members
      return item
    })
    return res.json({ clubs: responseClubs })
  } catch (error) {
    return next(error)
  }
}

async function createClub(req, res, next) {
  try {
    const facultyCoordinator =
      req.user.role === 'teacher'
        ? req.user._id
        : req.body.facultyCoordinator
    const coordinator = await validateCoordinator(facultyCoordinator)
    if (!coordinator) {
      return res.status(400).json({
        message: 'Select an active faculty member as coordinator.',
      })
    }

    const members = req.body.members || []
    const memberError = await validateMembers(members)
    if (memberError) return res.status(400).json({ message: memberError })

    const club = await Club.create({
      name: req.body.name,
      description: req.body.description || '',
      facultyCoordinator,
      members,
      logo: req.body.logo || '',
    })
    await club.populate([
      { path: 'facultyCoordinator', select: 'name email' },
      { path: 'members', select: 'name' },
    ])
    return res.status(201).json({ club })
  } catch (error) {
    return next(error)
  }
}

async function updateClub(req, res, next) {
  try {
    const club = await findClub(req.params.id)
    if (!club) return res.status(404).json({ message: 'Club not found.' })
    if (!canManageClub(req.user, club)) {
      return res.status(403).json({ message: 'You cannot manage this club.' })
    }
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'Provide at least one club field to update.' })
    }

    if (req.body.facultyCoordinator !== undefined) {
      if (req.user.role !== 'superadmin') {
        return res.status(403).json({
          message: 'Only a superadmin can reassign the faculty coordinator.',
        })
      }
      const coordinator = await validateCoordinator(req.body.facultyCoordinator)
      if (!coordinator) {
        return res.status(400).json({
          message: 'Select an active faculty member as coordinator.',
        })
      }
      club.facultyCoordinator = req.body.facultyCoordinator
    }

    if (req.body.members !== undefined) {
      const memberError = await validateMembers(req.body.members)
      if (memberError) return res.status(400).json({ message: memberError })
      club.members = req.body.members
    }
    for (const field of ['name', 'description', 'logo']) {
      if (req.body[field] !== undefined) club[field] = req.body[field]
    }

    await club.save()
    await club.populate([
      { path: 'facultyCoordinator', select: 'name email' },
      { path: 'members', select: 'name' },
    ])
    return res.json({ club })
  } catch (error) {
    return next(error)
  }
}

async function deleteClub(req, res, next) {
  try {
    const club = await findClub(req.params.id)
    if (!club) return res.status(404).json({ message: 'Club not found.' })
    if (!canManageClub(req.user, club)) {
      return res.status(403).json({ message: 'You cannot manage this club.' })
    }

    await Promise.all([
      ClubEvent.deleteMany({ club: club._id }),
      ClubAnnouncement.deleteMany({ club: club._id }),
    ])
    await club.deleteOne()
    return res.status(204).send()
  } catch (error) {
    return next(error)
  }
}

async function joinClub(req, res, next) {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can join clubs.' })
    }
    const club = await findClub(req.params.id)
    if (!club) return res.status(404).json({ message: 'Club not found.' })
    await Club.updateOne({ _id: club._id }, { $addToSet: { members: req.user._id } })
    return res.json({ message: 'You joined the club.' })
  } catch (error) {
    return next(error)
  }
}

async function leaveClub(req, res, next) {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can leave clubs.' })
    }
    const club = await findClub(req.params.id)
    if (!club) return res.status(404).json({ message: 'Club not found.' })
    await Club.updateOne({ _id: club._id }, { $pull: { members: req.user._id } })
    return res.json({ message: 'You left the club.' })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  listClubs,
  createClub,
  updateClub,
  deleteClub,
  joinClub,
  leaveClub,
  findClub,
  canManageClub,
}
