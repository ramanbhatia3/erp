const ClubAnnouncement = require('../models/ClubAnnouncement')
const clubController = require('./clubController')

async function listClubAnnouncements(req, res, next) {
  try {
    const announcements = await ClubAnnouncement.find()
      .populate('club', 'name logo')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
    return res.json({ announcements })
  } catch (error) {
    return next(error)
  }
}

async function createClubAnnouncement(req, res, next) {
  try {
    const club = await clubController.findClub(req.body.club)
    if (!club) return res.status(404).json({ message: 'Club not found.' })
    if (!clubController.canManageClub(req.user, club)) {
      return res.status(403).json({ message: 'You cannot post announcements for this club.' })
    }
    const announcement = await ClubAnnouncement.create({
      club: club._id,
      title: req.body.title,
      message: req.body.message,
      createdBy: req.user._id,
    })
    await announcement.populate([
      { path: 'club', select: 'name logo' },
      { path: 'createdBy', select: 'name role' },
    ])
    return res.status(201).json({ announcement })
  } catch (error) {
    return next(error)
  }
}

module.exports = { listClubAnnouncements, createClubAnnouncement }
