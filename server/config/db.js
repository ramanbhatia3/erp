const mongoose = require('mongoose')

// Connect to the MongoDB database configured in the environment.
async function connectDB() {
  const mongoUri = process.env.MONGO_URI

  if (!mongoUri) {
    throw new Error('MONGO_URI is not set. Add it to the server .env file.')
  }

  await mongoose.connect(mongoUri)
  console.log('MongoDB connected')
}

module.exports = connectDB
