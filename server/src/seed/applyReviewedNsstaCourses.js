/**
 * applyReviewedNsstaCourses.js
 * ─────────────────────────────────────────────────────────────────────────────
 * STAGE 2 of 2 in the NSSTA real-data pipeline.
 *
 * Reads the HUMAN-REVIEWED course list from seed/data/nssta_courses_reviewed.json
 * and upserts the entries into the Course collection in MongoDB.
 *
 * Pre-requisites:
 *   1. You have reviewed and edited nssta_courses_reviewed.json manually.
 *   2. The main seed (seed.js) has already been run — Competency records exist.
 *
 * Usage:
 *   cd server && node src/seed/applyReviewedNsstaCourses.js
 *
 * Idempotent: matching on course title, so safe to re-run after edits.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict'

require('dotenv').config({ path: '.env' })
const mongoose   = require('mongoose')
const fs         = require('fs')
const path       = require('path')
const Course     = require('../models/Course')
const Competency = require('../models/Competency')

const REVIEWED_PATH = path.join(__dirname, 'data', 'nssta_courses_reviewed.json')

// Default category assigned to auto-created competencies that don't already exist.
// All NSSTA courses are statistical training, so this is a safe default.
const DEFAULT_COMPETENCY_CATEGORY = 'statistical'

async function resolveSkillTags(tagNames) {
  const ids = []
  for (const name of tagNames) {
    const trimmed = name.trim()
    if (!trimmed) continue

    let comp = await Competency.findOne({ name: new RegExp(`^${trimmed}$`, 'i') }).lean()

    if (!comp) {
      // Auto-create missing competency — log it for follow-up review
      console.log(`   ⚠️  Competency not found: "${trimmed}" — creating with category="${DEFAULT_COMPETENCY_CATEGORY}"`)
      console.log(`      Review this entry manually if "statistical" is not the correct category.`)
      const created = await Competency.create({
        name:        trimmed,
        category:    DEFAULT_COMPETENCY_CATEGORY,
        description: `Auto-created during NSSTA course import. Review and update description.`,
        maxLevel:    5,
      })
      ids.push(created._id)
    } else {
      ids.push(comp._id)
    }
  }
  return ids
}

async function main() {
  if (!fs.existsSync(REVIEWED_PATH)) {
    console.error(`❌  Reviewed courses file not found: ${REVIEWED_PATH}`)
    console.error(`   Run importNsstaData.js first, review the output, then populate nssta_courses_reviewed.json.`)
    process.exit(1)
  }

  const entries = JSON.parse(fs.readFileSync(REVIEWED_PATH, 'utf-8'))
  if (!Array.isArray(entries) || entries.length === 0) {
    console.error('❌  nssta_courses_reviewed.json is empty or not an array.')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/kaushalai')
  console.log(`\nMongoDB connected.`)
  console.log(`Processing ${entries.length} reviewed course entries…\n`)

  let inserted = 0, updated = 0, errors = 0

  for (const entry of entries) {
    try {
      const { title, description, source, skillTags, difficulty, durationHours, targetGroups } = entry

      if (!title || !title.trim()) {
        console.warn(`   ⚠️  Skipping entry with missing title: ${JSON.stringify(entry).slice(0, 80)}`)
        continue
      }

      // Resolve string skill tags → Competency ObjectIds
      const skillTagIds = await resolveSkillTags(skillTags ?? [])

      const courseData = {
        title:        title.trim(),
        description:  description?.trim() ?? '',
        source:       source ?? 'nssta',
        skillTags:    skillTagIds,
        difficulty:   difficulty ?? 'intermediate',
        durationHours: typeof durationHours === 'number' ? durationHours : null,
        targetGroups: targetGroups ?? [],
        provider:     'NSSTA / MoSPI',
        enrollmentUrl: '',  // real URLs can be added later
      }

      const existing = await Course.findOne({ title: new RegExp(`^${title.trim()}$`, 'i') })

      if (existing) {
        await Course.updateOne({ _id: existing._id }, { $set: courseData })
        console.log(`   🔄  Updated:  ${title}`)
        updated++
      } else {
        await Course.create(courseData)
        console.log(`   ✅  Inserted: ${title}`)
        inserted++
      }
    } catch (err) {
      console.error(`   ❌  Error processing "${entry.title}": ${err.message}`)
      errors++
    }
  }

  const total = await Course.countDocuments({ source: 'nssta' })

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Import summary:`)
  console.log(`  Inserted: ${inserted}`)
  console.log(`  Updated:  ${updated}`)
  console.log(`  Errors:   ${errors}`)
  console.log(`  Total NSSTA courses in DB: ${total}`)
  console.log(`${'─'.repeat(60)}\n`)

  await mongoose.disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
