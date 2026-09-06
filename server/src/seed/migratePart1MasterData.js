'use strict'

/**
 * migratePart1MasterData.js
 *
 * Seeds ONLY the global reference collections needed for the real-data system:
 * 1. departments
 * 2. roles (with levels 1-5)
 * 3. functional_areas
 * 4. role_competencies (required competency level mapping per role)
 *
 * Safe and idempotent: can be re-run anytime.
 */

const mongoose = require('mongoose')
require('dotenv').config()

const {
  Department,
  Role,
  FunctionalArea,
  RoleCompetency,
  Competency,
} = require('../models')

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kaushalai'

const DEPARTMENTS = [
  {
    name: 'Field Operations Division (FOD)',
    code: 'FOD',
    ministry: 'Ministry of Statistics and Programme Implementation',
  },
  {
    name: 'National Accounts Division (NAD)',
    code: 'NAD',
    ministry: 'Ministry of Statistics and Programme Implementation',
  },
  {
    name: 'Economic Statistics Division (ESD)',
    code: 'ESD',
    ministry: 'Ministry of Statistics and Programme Implementation',
  },
  {
    name: 'Social Statistics Division (SSD)',
    code: 'SSD',
    ministry: 'Ministry of Statistics and Programme Implementation',
  },
  {
    name: 'Survey Design and Research Division (SDRD)',
    code: 'SDRD',
    ministry: 'Ministry of Statistics and Programme Implementation',
  },
  {
    name: 'Data Quality and Assurance Division (DQAD)',
    code: 'DQAD',
    ministry: 'Ministry of Statistics and Programme Implementation',
  },
]

const FUNCTIONAL_AREAS = [
  {
    name: 'Statistical Survey & Sample Design',
    description: 'Methodologies for national sampling frames, household surveys, and stratification.',
  },
  {
    name: 'National Accounts & Macroeconomic Aggregates',
    description: 'GDP, GVA, supply-use tables, capital formation, and institutional sector accounts.',
  },
  {
    name: 'Price & Index Compilation (CPI/IIP)',
    description: 'Consumer Price Index, Index of Industrial Production, and wholesale price deflators.',
  },
  {
    name: 'Field Data Collection & Quality Assurance',
    description: 'CAPI tablets, multi-stage field data scrutiny, high-frequency validation checks.',
  },
  {
    name: 'Data Analytics, Python & Modeling',
    description: 'Advanced statistical programming, exploratory data analysis, machine learning.',
  },
  {
    name: 'Official Statistics Dissemination & Policy',
    description: 'Public data releases, microdata anonymization, SDG indicator telemetry.',
  },
]

// 5-tier Role Framework:
// Level 1: Support Staff
// Level 2: Junior Assistant
// Level 3: Section Officer
// Level 4: Senior Officer
// Level 5: Department Head
const ROLE_TEMPLATES = [
  { name: 'Support Staff / Field Investigator', level: 1 },
  { name: 'Junior Assistant / Junior Statistical Officer (JSO)', level: 2 },
  { name: 'Section Officer / Statistical Officer (SO)', level: 3 },
  { name: 'Senior Officer / Senior Statistical Officer (SSO)', level: 4 },
  { name: 'Department Head / Director', level: 5 },
]

async function migratePart1() {
  console.log('\n======================================================')
  console.log('   MIGRATION: PART 1 REFERENCE MASTER DATA           ')
  console.log('======================================================\n')

  let shouldClose = false
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI)
    shouldClose = true
    console.log('Connected to MongoDB:', MONGO_URI)
  }

  // 1. Seed Departments
  console.log('▶ 1. Seeding Departments...')
  const departmentMap = {}
  for (const dept of DEPARTMENTS) {
    const record = await Department.findOneAndUpdate(
      { code: dept.code },
      dept,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    departmentMap[dept.code] = record
  }
  console.log(`  ✓ ${Object.keys(departmentMap).length} departments ready.`)

  // 2. Seed Functional Areas
  console.log('▶ 2. Seeding Functional Areas...')
  const functionalAreaMap = {}
  for (const fa of FUNCTIONAL_AREAS) {
    const record = await FunctionalArea.findOneAndUpdate(
      { name: fa.name },
      fa,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    functionalAreaMap[fa.name] = record
  }
  console.log(`  ✓ ${Object.keys(functionalAreaMap).length} functional areas ready.`)

  // 3. Seed Roles across Departments
  console.log('▶ 3. Seeding 5-tier Roles across Departments...')
  const createdRoles = []
  for (const dept of Object.values(departmentMap)) {
    for (const tpl of ROLE_TEMPLATES) {
      const roleName = `${tpl.name} (${dept.code})`
      const role = await Role.findOneAndUpdate(
        { name: roleName, department_ref: dept._id },
        {
          name: roleName,
          level: tpl.level,
          department_ref: dept._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      createdRoles.push(role)
    }
  }
  console.log(`  ✓ ${createdRoles.length} roles created across departments.`)

  // 4. Seed Role Competencies (Required levels 1-5 per role per competency)
  console.log('▶ 4. Seeding Role Competencies...')
  const competencies = await Competency.find({})
  if (competencies.length === 0) {
    console.log('  Notice: No competencies found in DB yet. Run npm run seed first if competencies are needed.')
  } else {
    let rcCount = 0
    for (const role of createdRoles) {
      // Required level matches role level (bounded between 1 and 5)
      const baseReqLevel = Math.min(5, Math.max(1, role.level))
      for (const comp of competencies) {
        await RoleCompetency.findOneAndUpdate(
          { role_id: role._id, competency_id: comp._id },
          {
            role_id: role._id,
            competency_id: comp._id,
            required_level: baseReqLevel,
          },
          { upsert: true, setDefaultsOnInsert: true }
        )
        rcCount++
      }
    }
    console.log(`  ✓ ${rcCount} role competency mappings established.`)
  }

  console.log('\n======================================================')
  console.log('   PART 1 MIGRATION COMPLETE                           ')
  console.log('======================================================\n')

  if (shouldClose) {
    await mongoose.disconnect()
  }
}

if (require.main === module) {
  migratePart1()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err)
      process.exit(1)
    })
}

module.exports = migratePart1
