const mongoose = require('mongoose')
const ClubEvent = require('../models/ClubEvent')
const clubController = require('./clubController')

async function listClubEvents(req, res, next) {
  try {
    const filter = {}
    if (req.query.clubId) filter.club = req.query.clubId
    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    if (req.query.period === 'upcoming') filter.date = { $gte: today }
    if (req.query.period === 'past') filter.date = { $lt: today }

    const events = await ClubEvent.find(filter)
      .populate('club', 'name logo facultyCoordinator')
      .sort({ date: req.query.period === 'past' ? -1 : 1 })
    const responseEvents = events.map((event) => {
      const item = event.toObject()
      item.registrationCount = event.registrations.length
      item.isRegistered =
        req.user.role === 'student' &&
        event.registrations.some((id) => String(id) === String(req.user._id))
      delete item.registrations
      return item
    })
    return res.json({ events: responseEvents })
  } catch (error) {
    return next(error)
  }
}

async function createClubEvent(req, res, next) {
  try {
    const club = await clubController.findClub(req.body.club)
    if (!club) return res.status(404).json({ message: 'Club not found.' })
    if (!clubController.canManageClub(req.user, club)) {
      return res.status(403).json({ message: 'You cannot manage events for this club.' })
    }

    const event = await ClubEvent.create({
      club: club._id,
      title: req.body.title,
      date: req.body.date,
      description: req.body.description || '',
      createdBy: req.user._id,
    })
    await event.populate('club', 'name logo facultyCoordinator')
    return res.status(201).json({ event })
  } catch (error) {
    return next(error)
  }
}

async function updateClubEvent(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Event ID is invalid.' })
    }
    const event = await ClubEvent.findById(req.params.id)
    if (!event) return res.status(404).json({ message: 'Event not found.' })
    const club = await clubController.findClub(event.club)
    if (!club || !clubController.canManageClub(req.user, club)) {
      return res.status(403).json({ message: 'You cannot manage this event.' })
    }

    for (const field of ['title', 'date', 'description']) {
      if (req.body[field] !== undefined) event[field] = req.body[field]
    }
    await event.save()
    await event.populate('club', 'name logo facultyCoordinator')
    return res.json({ event })
  } catch (error) {
    return next(error)
  }
}

async function deleteClubEvent(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Event ID is invalid.' })
    }
    const event = await ClubEvent.findById(req.params.id)
    if (!event) return res.status(404).json({ message: 'Event not found.' })
    const club = await clubController.findClub(event.club)
    if (!club || !clubController.canManageClub(req.user, club)) {
      return res.status(403).json({ message: 'You cannot manage this event.' })
    }
    await event.deleteOne()
    return res.status(204).send()
  } catch (error) {
    return next(error)
  }
}

async function registerForClubEvent(req, res, next) {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can register for club events.' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Event ID is invalid.' })
    }
    const event = await ClubEvent.findById(req.params.id)
    if (!event) return res.status(404).json({ message: 'Event not found.' })
    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    if (event.date < today) {
      return res.status(400).json({ message: 'Registration is closed for past events.' })
    }
    await ClubEvent.updateOne(
      { _id: event._id },
      { $addToSet: { registrations: req.user._id } },
    )
    return res.json({ message: 'You are registered for this event.' })
  } catch (error) {
    return next(error)
  }
}

async function cancelClubEventRegistration(req, res, next) {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can manage event registrations.' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Event ID is invalid.' })
    }
    const event = await ClubEvent.findById(req.params.id)
    if (!event) return res.status(404).json({ message: 'Event not found.' })
    await ClubEvent.updateOne(
      { _id: event._id },
      { $pull: { registrations: req.user._id } },
    )
    return res.json({ message: 'Your event registration was cancelled.' })
  } catch (error) {
    return next(error)
  }
}

async function myParticipation(req, res, next) {
  try {
    const events = await ClubEvent.find({ registrations: req.user._id })
      .populate('club', 'name logo')
      .sort({ date: -1 })
    const participation = events.map((event) => {
      const item = event.toObject()
      item.registrationCount = event.registrations.length
      delete item.registrations
      return item
    })
    return res.json({ events: participation })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  listClubEvents,
  createClubEvent,
  updateClubEvent,
  deleteClubEvent,
  registerForClubEvent,
  cancelClubEventRegistration,
  myParticipation,
}
