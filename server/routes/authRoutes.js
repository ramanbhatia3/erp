const express = require('express')
const { body } = require('express-validator')
const authController = require('../controllers/authController')
const { protect } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()

router.post(
  '/login',
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Enter a valid email address.'),
  body('password').isString().notEmpty().withMessage('Password is required.'),
  checkValidation,
  authController.login,
)

router.get('/me', protect, authController.getMe)

router.put(
  '/change-password',
  protect,
  body('currentPassword')
    .isString()
    .notEmpty()
    .withMessage('Current password is required.'),
  body('newPassword')
    .isString()
    .bail()
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters.')
    .custom((password) => Buffer.byteLength(password, 'utf8') <= 72)
    .withMessage('New password must be no more than 72 bytes.'),
  checkValidation,
  authController.changePassword,
)

module.exports = router
