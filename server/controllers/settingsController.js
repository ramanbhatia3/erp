const Settings = require('../models/Settings')
const { getMarksSettings } = require('../utils/calculations')
const { getCurrentAcademicYear } = require('../utils/academicYear')

// Return the university settings, creating the default record on first access.
async function getSettings(req, res, next) {
  try {
    const settings = await getMarksSettings()
    const currentAcademicYear = getCurrentAcademicYear()
    if (settings.currentAcademicYear !== currentAcademicYear) {
      settings.currentAcademicYear = currentAcademicYear
      await settings.save()
    }

    return res.json({ settings })
  } catch (error) {
    return next(error)
  }
}

async function updateSettings(req, res, next) {
  try {
    await getMarksSettings()
    const settings = await Settings.findOneAndUpdate(
      { key: 'university' },
      {
        $set: {
          attendanceThreshold: req.body.attendanceThreshold,
          passingPercentage: req.body.passingPercentage,
          currentAcademicYear: getCurrentAcademicYear(),
        },
        $setOnInsert: { key: 'university' },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    )

    return res.json({
      message: 'Settings saved successfully.',
      settings,
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = { getSettings, updateSettings }
