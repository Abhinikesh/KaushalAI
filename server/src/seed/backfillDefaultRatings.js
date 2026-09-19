/**
 * One-time migration: backfill defaultRating (4.0–4.5) for all courses
 * that don't have one yet.
 *
 * Run with:
 *   node server/src/seed/backfillDefaultRatings.js
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') })
const mongoose = require('mongoose')
const Course = require('../models/Course')

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI
  if (!uri) throw new Error('No MONGO_URI found in .env')
  await mongoose.connect(uri)
  console.log('Connected to MongoDB')

  const courses = await Course.find({ defaultRating: { $in: [null, 0, undefined] } })
  console.log(`Found ${courses.length} courses without defaultRating`)

  for (const course of courses) {
    // Deterministic seed based on last byte of ObjectId
    const lastByte = parseInt(course._id.toString().slice(-2), 16)
    const seed = lastByte % 6  // 0..5
    course.defaultRating = Math.round((4.0 + seed / 10) * 10) / 10
    await course.save()
    console.log(`  ${course.title} → defaultRating: ${course.defaultRating}`)
  }

  console.log('✅ Backfill complete')
  await mongoose.disconnect()
}

run().catch((err) => { console.error(err); process.exit(1) })
