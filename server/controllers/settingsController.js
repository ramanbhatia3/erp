const Settings = require('../models/Settings')

// Return the university settings, creating the default record on first access.
async function getSettings(req, res, next) {
  try {
    const settings = await Settings.findOneAndUpdate(
      { key: 'university' },
      { $setOnInsert: { key: 'university' } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    )

    return res.json({ settings })
  } catch (error) {
    return next(error)
  }
}

async function updateSettings(req, res, next) {
  try {
    const settings = await Settings.findOneAndUpdate(
      { key: 'university' },
      {
        $set: {
          attendanceThreshold: req.body.attendanceThreshold,
          marksComponents: req.body.marksComponents,
          passingPercentage: req.body.passingPercentage,
          currentAcademicYear: req.body.currentAcademicYear,
          currentSemester: req.body.currentSemester,
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
