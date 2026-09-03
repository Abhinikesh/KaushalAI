/**
 * seed.js — Primary database seeding script for KaushalAI.
 * ─────────────────────────────────────────────────────────────────────────────
 * Delegates to importRealData.js to populate human-curated datasets:
 *   - Competencies (33 official competencies across 4 domains)
 *   - Job Roles & Mappings (15 official roles with priority & requirement types)
 *   - Courses (36 iGOT-style courses + 24 NSSTA training academy courses)
 *
 * Safe to re-run (idempotent upserts).
 *
 * Usage:
 *   cd server && node src/seed/seed.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const mongoose = require('mongoose')
const importRealData = require('./importRealData')

async function run() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/kaushalai'
  console.log(`Connecting to MongoDB at: ${mongoUri}`)
  await mongoose.connect(mongoUri)

  console.log('Invoking real human-curated dataset import...')
  await importRealData()

  await mongoose.disconnect()
  console.log('Seeding completed successfully.')
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Seed script failed:', err)
    process.exit(1)
  })
}

module.exports = run
