const mongoose = require('mongoose')

async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI
  if (!uri) {
    throw new Error('Neither MONGO_URI nor MONGODB_URI environment variable is set. Please set your MongoDB connection string in Render environment settings or server/.env.')
  }
  await mongoose.connect(uri)
  console.log('MongoDB connected')
}

module.exports = { connectDB }
