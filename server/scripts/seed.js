require('dotenv').config()

const mongoose = require('mongoose')
const connectDB = require('../config/db')
const User = require('../models/User')

async function seedSuperadmin() {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SUPERADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in server/.env.')
  }

  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('SUPERADMIN_PASSWORD must be no more than 72 bytes.')
  }

  await connectDB()

  const existingUser = await User.findOne({ email })

  if (existingUser) {
    if (existingUser.role !== 'superadmin') {
      throw new Error('SUPERADMIN_EMAIL belongs to an account that is not a superadmin.')
    }

    console.log('The superadmin account already exists; no changes made.')
    return
  }

  await User.create({
    name: process.env.SUPERADMIN_NAME?.trim() || 'RBPU Hub Superadmin',
    email,
    password,
    role: 'superadmin',
  })

  console.log('Superadmin account created.')
}

seedSuperadmin()
  .catch((error) => {
    console.error('Unable to seed superadmin:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
