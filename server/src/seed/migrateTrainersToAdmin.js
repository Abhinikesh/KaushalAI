'use strict'

require('dotenv').config()
const mongoose = require('mongoose')
const User = require('../models/User')

async function migrateTrainersToAdmin() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kaushalai'
  console.log(`Connecting to MongoDB at ${uri}...`)

  try {
    await mongoose.connect(uri)
    console.log('MongoDB connected.')

    const trainersCount = await User.countDocuments({ role: 'trainer' })
    console.log(`Found ${trainersCount} user(s) with role: 'trainer'.`)

    if (trainersCount > 0) {
      const result = await User.updateMany(
        { role: 'trainer' },
        { $set: { role: 'admin' } }
      )
      console.log(`Successfully migrated ${result.modifiedCount} user(s) from 'trainer' to 'admin'.`)
    } else {
      console.log('No trainer accounts needed migration.')
    }

    // Verify
    const remainingTrainers = await User.countDocuments({ role: 'trainer' })
    const totalAdmins = await User.countDocuments({ role: 'admin' })
    console.log(`Verification: Remaining trainers: ${remainingTrainers}, Total admins: ${totalAdmins}`)

    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  }
}

migrateTrainersToAdmin()
