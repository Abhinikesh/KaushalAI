'use strict'
/**
 * Seed test officer roster entries.
 * Safe to re-run — uses upsert so it won't duplicate.
 *
 * Usage:
 *   cd server && node src/seed/seedRoster.js
 */

require('dotenv').config()
const mongoose = require('mongoose')
const AuthorizedOfficer = require('../models/AuthorizedOfficer')
const JobRole = require('../models/JobRole')

async function main() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('MongoDB connected')

  // Find existing job roles to attach
  const statOfficer = await JobRole.findOne({ title: /statistical officer/i }).lean()
  const dataAnalyst = await JobRole.findOne({ title: /data analyst/i }).lean()
  const trainer     = await JobRole.findOne({ title: /trainer/i }).lean()

  const officers = [
    {
      employeeId:    'MOSPI-2024-001',
      fullName:      'Priya Nair',
      officialEmail: 'priya.nair@mospi.gov.in',
      department:    'MOSPI',
      jobRoleId:     statOfficer?._id ?? null,
    },
    {
      employeeId:    'MOSPI-2024-002',
      fullName:      'Rajan Sharma',
      officialEmail: 'rajan.sharma@mospi.gov.in',
      department:    'NSSO',
      jobRoleId:     dataAnalyst?._id ?? null,
    },
    {
      employeeId:    'MOSPI-2024-003',
      fullName:      'Anita Desai',
      officialEmail: 'anita.desai@mospi.gov.in',
      department:    'CSO',
      jobRoleId:     trainer?._id ?? null,
    },
    {
      employeeId:    'DEMO-001',
      fullName:      'Demo User',
      officialEmail: 'demo@example.com',
      department:    'MOSPI',
      jobRoleId:     statOfficer?._id ?? null,
    },
    {
      employeeId:    'DEMO-002',
      fullName:      'Test Admin',
      officialEmail: 'testadmin@example.com',
      department:    'MOSPI',
      jobRoleId:     null,
    },
  ]

  let inserted = 0
  let skipped  = 0

  for (const o of officers) {
    const res = await AuthorizedOfficer.updateOne(
      { employeeId: o.employeeId },
      { $setOnInsert: o },
      { upsert: true }
    )
    if (res.upsertedCount > 0) {
      console.log(`  ✓ Inserted: ${o.employeeId} — ${o.fullName}`)
      inserted++
    } else {
      console.log(`  ⟳ Already exists: ${o.employeeId} — ${o.fullName}`)
      skipped++
    }
  }

  console.log(`\nDone — ${inserted} inserted, ${skipped} already existed.`)
  console.log('\nTest signup credentials:')
  console.log('  employeeId: DEMO-001  name: Demo User')
  console.log('  employeeId: DEMO-002  name: Test Admin')
  await mongoose.disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
