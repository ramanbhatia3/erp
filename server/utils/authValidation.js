const { validationResult } = require('express-validator')

// Return express-validator errors in a consistent response.
function checkValidation(req, res, next) {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please check the submitted information.',
      errors: errors.array(),
    })
  }

  next()
}

module.exports = checkValidation
