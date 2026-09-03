/**
 * importRealData.js — Imports real curated seed data into KaushalAI MongoDB.
 * ─────────────────────────────────────────────────────────────────────────────
 * Usage:
 *   cd server && node src/seed/importRealData.js
 *
 * Sources:
 *   - server/src/seed/data/competency_dataset.csv
 *   - server/src/seed/data/role_competency_mapping.csv
 *   - server/src/seed/data/igot_style_courses.csv
 *   - server/src/seed/data/NSSTA_Training_Courses.csv
 *
 * Idempotent: safe to re-run multiple times without creating duplicate records.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const { parse } = require('csv-parse/sync')

const Competency = require('../models/Competency')
const JobRole = require('../models/JobRole')
const Course = require('../models/Course')

const DATA_DIR = path.join(__dirname, 'data')

// ─────────────────────────────────────────────────────────────────────────────
// 1. GUESSED ROLE DEFINITIONS (ROLE001 - ROLE015)
// ─────────────────────────────────────────────────────────────────────────────
// [PLEASE VERIFY]: role_competency_mapping.csv references ROLE001 - ROLE015
// without explicit job titles. The following titles and MoSPI departments were
// generated based on the specific competency mix, domain ratios, and required
// proficiency levels. Every title below is flagged for review before demo day.
const GUESSED_ROLES = {
  ROLE001: {
    title: 'Junior Statistical Officer (JSO)',
    department: 'Field Operations Division (FOD)',
    description: 'Subordinate Statistical Service field cadre officer responsible for primary data collection and scrutiny.',
  },
  ROLE002: {
    title: 'Statistical Assistant / Junior Data Analyst',
    department: 'Survey Design and Research Division (SDRD)',
    description: 'Technical assistant executing survey data processing, SQL tabular queries, and draft indicator reporting.',
  },
  ROLE003: {
    title: 'Statistical Officer (SO)',
    department: 'National Accounts & Economic Statistics Division',
    description: 'Operational statistical officer compiling sectoral accounts, indices, and sample estimations.',
  },
  ROLE004: {
    title: 'Senior Statistical Officer (SSO)',
    department: 'Coordination and Publication Division (CPD)',
    description: 'Supervisory officer managing statistical publications, SDG indicators, and survey team field coordination.',
  },
  ROLE005: {
    title: 'Assistant Director (Statistical Analysis)',
    department: 'National Statistical Systems Division (NSSD)',
    description: 'Junior Indian Statistical Service (ISS) officer leading methodological analysis, macro models, and research.',
  },
  ROLE006: {
    title: 'Joint Director (Statistical Governance)',
    department: 'Ministry Headquarters / Executive Directorate',
    description: 'Senior ISS executive overseeing statistical governance, national accounts, data ethics, and ministerial policy.',
  },
  ROLE007: {
    title: 'Methodology & Sampling Specialist',
    department: 'Survey Design and Research Division (SDRD)',
    description: 'Advanced sampling theorist and survey methodologist calibrating survey frames, weights, and multipliers.',
  },
  ROLE008: {
    title: 'Data Analyst & Statistical Programmer',
    department: 'Data Informatics and Innovation Division (DIID)',
    description: 'Statistical programmer developing Python/R pipelines, automated data visualizations, and unit-level queries.',
  },
  ROLE009: {
    title: 'Data Scientist & AI Specialist',
    department: 'Data Informatics and Innovation Division (DIID)',
    description: 'Specialist developing machine learning pipelines, predictive econometric models, and AI tools for official data.',
  },
  ROLE010: {
    title: 'GIS & Geospatial Mapping Specialist',
    department: 'Field Operations Division (FOD) / Geomatics Unit',
    description: 'Geospatial analyst integrating satellite imagery, GIS census boundary mapping, and spatial sampling frames.',
  },
  ROLE011: {
    title: 'Cloud & Database Infrastructure Engineer',
    department: 'IT and Data Management Division (ITDMD)',
    description: 'Systems architect maintaining government cloud infrastructure, high-throughput databases, and data privacy.',
  },
  ROLE012: {
    title: 'Digital Governance & IT Architect',
    department: 'Digital Services and Cyber Infrastructure Wing',
    description: 'Enterprise technical lead managing digital public infrastructure, APIs, and secure digital service delivery.',
  },
  ROLE013: {
    title: 'Data Quality & Metadata Governance Officer',
    department: 'National Data Governance Center (NDGC)',
    description: 'Quality assurance and metadata custodian enforcing national data standards, cataloging, and privacy compliance.',
  },
  ROLE014: {
    title: 'Training Programme Director / Coordinator',
    department: 'National Statistical Systems Training Academy (NSSTA)',
    description: 'Faculty coordinator designing statistical curricula, capacity workshops, and officer evaluation frameworks.',
  },
  ROLE015: {
    title: 'Director (Administration & Human Capital)',
    department: 'Administration and Human Resources Directorate',
    description: 'Administrative director overseeing executive leadership, human resource planning, and institutional change.',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MAPPING CONSTANTS & CONVERSIONS
// ─────────────────────────────────────────────────────────────────────────────
const DOMAIN_MAP = {
  'Statistical Competencies': 'statistical',
  'Technical Competencies': 'technical',
  'Digital Governance': 'digital_governance',
  'Behavioural and Managerial Competencies': 'behavioural',
}

/**
 * Level mapping choice: Beginner=2, Intermediate=3, Advanced=4.
 * Rationale:
 * In KaushalAI's 5-point competency scale (1=Novice, 2=Beginner, 3=Intermediate, 4=Advanced, 5=Master/Expert),
 * the human-curated curriculum defines baseline operational proficiency starting at Beginner (Level 2),
 * independent autonomous capability at Intermediate (Level 3), and subject-matter leadership at Advanced (Level 4).
 * Level 1 remains available for untrained novices, and Level 5 represents national-level methodological innovators.
 */
const LEVEL_MAP = {
  beginner: 2,
  intermediate: 3,
  advanced: 4,
}

/**
 * Duration parsing assumption:
 * Assume 1 training day = 6 instructional hours (standard government academic day).
 * E.g., "5 days" = 30 hours, "1 week / 5 days" = 30 hours, "3 days" = 18 hours.
 */
function parseDurationHours(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 18
  const text = durationStr.toLowerCase().trim()
  const daysMatch = text.match(/(\d+)\s*day/i)
  if (daysMatch) return parseInt(daysMatch[1], 10) * 6
  const weeksMatch = text.match(/(\d+)\s*week/i)
  if (weeksMatch) return parseInt(weeksMatch[1], 10) * 30
  if (text.includes('6/7 week')) return 234
  const hoursMatch = text.match(/(\d+)\s*hour/i)
  if (hoursMatch) return parseInt(hoursMatch[1], 10)
  return 30
}

// Known aliases mapping specific course tags to official competency codes
const TAG_ALIASES = {
  'r programming': 'TECH002',
  'sampling techniques': 'STAT002',
  'sample surveys': 'STAT002',
  'data quality': 'STAT010',
  metadata: 'STAT009',
  'machine learning': 'TECH009',
  'artificial intelligence': 'TECH009',
  'generative ai': 'TECH009',
  'responsible ai': 'TECH009',
  'cloud security': 'TECH010',
  virtualization: 'TECH010',
  rest: 'TECH011',
  integration: 'TECH011',
  'open data': 'TECH012',
  'data sharing': 'TECH012',
  'information security': 'GOV001',
  'phishing awareness': 'GOV001',
  'personal data': 'GOV002',
  'data protection': 'GOV002',
  'electronic records': 'GOV003',
  'e-governance': 'GOV005',
  'digital services': 'GOV005',
  'spatial data': 'TECH007',
  mapping: 'TECH007',
  'communication skills': 'BEH002',
  'presentation skills': 'BEH002',
  presentation: 'BEH002',
  integrity: 'BEH004',
  'decision-making': 'BEH005',
  'problem solving': 'BEH005',
  'soft skills': 'BEH002',
  'macro statistics': 'STAT003',
  gdp: 'STAT003',
  wpi: 'STAT004',
  cpi: 'STAT004',
  'index numbers': 'STAT004',
  iip: 'STAT007',
  employment: 'STAT005',
  'labour force': 'STAT005',
  'poverty analysis': 'STAT008',
  sdg: 'STAT008',
  demography: 'STAT005',
  'population studies': 'STAT005',
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MAIN IMPORT PIPELINE
// ─────────────────────────────────────────────────────────────────────────────
async function importRealData() {
  const isStandalone = mongoose.connection.readyState === 0
  if (isStandalone) {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/kaushalai'
    console.log(`Connecting to MongoDB at: ${mongoUri}`)
    await mongoose.connect(mongoUri)
  }

  console.log('\n======================================================')
  console.log('       KAUSHALAI REAL SEED DATA IMPORT PIPELINE       ')
  console.log('======================================================\n')

  const summary = {
    competencies: { inserted: 0, updated: 0, total: 0 },
    jobRoles: { inserted: 0, updated: 0, total: 0 },
    courses: {
      igot: { inserted: 0, updated: 0, total: 0 },
      nssta: { inserted: 0, updated: 0, total: 0 },
    },
    unresolvedTags: new Map(),
  }

  // ── A. Import Competencies ──────────────────────────────────────────────────
  const compCsvPath = path.join(DATA_DIR, 'competency_dataset.csv')
  if (!fs.existsSync(compCsvPath)) {
    throw new Error(`Missing required CSV file: ${compCsvPath}`)
  }

  const rawComps = parse(fs.readFileSync(compCsvPath, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  console.log(`[1/4] Processing ${rawComps.length} competencies from competency_dataset.csv...`)

  const competencyCodeMap = new Map() // competencyCode -> Competency Document

  for (const row of rawComps) {
    if (!row.competency_id || !row.competency_name) {
      console.warn(`  [WARN] Skipping invalid competency row:`, row)
      continue
    }

    const mappedCategory = DOMAIN_MAP[row.domain] || 'statistical'

    const filter = {
      $or: [
        { competencyCode: row.competency_id.trim() },
        { name: row.competency_name.trim() },
      ],
    }
    const existing = await Competency.findOne(filter)

    const updateDoc = {
      name: row.competency_name.trim(),
      category: mappedCategory,
      description: row.description?.trim() || '',
      competencyCode: row.competency_id.trim(),
      levelDescriptions: {
        beginner: row.beginner_level?.trim() || '',
        intermediate: row.intermediate_level?.trim() || '',
        advanced: row.advanced_level?.trim() || '',
      },
    }

    const doc = await Competency.findOneAndUpdate(filter, updateDoc, {
      upsert: true,
      new: true,
      runValidators: true,
    })

    if (existing) {
      summary.competencies.updated++
    } else {
      summary.competencies.inserted++
    }
    summary.competencies.total++

    competencyCodeMap.set(doc.competencyCode, doc)
  }

  console.log(`  ✓ Competencies: ${summary.competencies.total} processed (${summary.competencies.inserted} new, ${summary.competencies.updated} updated)`)

  // ── B. Import Job Roles & Competency Mappings ───────────────────────────────
  const roleTitlesCsvPath = path.join(DATA_DIR, 'role_titles.csv')
  const roleTitlesMap = new Map()
  if (fs.existsSync(roleTitlesCsvPath)) {
    const rawTitles = parse(fs.readFileSync(roleTitlesCsvPath, 'utf8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
    for (const r of rawTitles) {
      const rid = (r.role_id || '').trim().toUpperCase()
      if (rid) {
        roleTitlesMap.set(rid, {
          title: r.title?.trim(),
          department: r.department?.trim() || 'MOSPI',
        })
      }
    }
    console.log(`  ✓ Loaded ${roleTitlesMap.size} official role titles from role_titles.csv`)
  }

  const mappingCsvPath = path.join(DATA_DIR, 'role_competency_mapping.csv')
  if (!fs.existsSync(mappingCsvPath)) {
    throw new Error(`Missing required CSV file: ${mappingCsvPath}`)
  }

  const rawMappings = parse(fs.readFileSync(mappingCsvPath, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  console.log(`\n[2/4] Processing ${rawMappings.length} role-competency mappings from role_competency_mapping.csv...`)

  // Group mappings by role_id
  const roleGroups = new Map()
  for (const row of rawMappings) {
    const roleId = (row.role_id || '').trim().toUpperCase()
    if (!roleId) continue
    if (!roleGroups.has(roleId)) {
      roleGroups.set(roleId, [])
    }
    roleGroups.get(roleId).push(row)
  }

  for (const [roleId, reqList] of roleGroups.entries()) {
    const roleMeta = roleTitlesMap.get(roleId) || GUESSED_ROLES[roleId] || {
      title: `Statistical Cadre Officer (${roleId})`,
      department: 'Official Statistics Directorate',
      description: 'Role mapped from institutional curriculum requirements.',
    }

    const requiredCompetencies = []

    for (const req of reqList) {
      const compCode = req.competency_id?.trim()
      const compDoc = competencyCodeMap.get(compCode)

      if (!compDoc) {
        console.warn(`  [WARN] Unknown competency ${compCode} for role ${roleId}`)
        continue
      }

      const rawLvl = (req.required_level || 'intermediate').toLowerCase().trim()
      const numericLevel = LEVEL_MAP[rawLvl] || 3
      const priority = req.priority || 'Medium'
      const requirementType = req.requirement_type || 'Core'

      requiredCompetencies.push({
        competencyId: compDoc._id,
        requiredLevel: numericLevel,
        priority,
        requirementType,
      })
    }

    const filter = {
      $or: [
        { roleCode: roleId },
        { title: roleMeta.title },
      ],
    }
    const existing = await JobRole.findOne(filter)

    const updateDoc = {
      roleCode: roleId,
      title: roleMeta.title,
      department: roleMeta.department,
      requiredCompetencies,
    }

    await JobRole.findOneAndUpdate(filter, updateDoc, {
      upsert: true,
      new: true,
      runValidators: true,
    })

    if (existing) {
      summary.jobRoles.updated++
    } else {
      summary.jobRoles.inserted++
    }
    summary.jobRoles.total++
  }

  console.log(`  ✓ Job Roles: ${summary.jobRoles.total} processed (${summary.jobRoles.inserted} new, ${summary.jobRoles.updated} updated)`)

  // ── Helper: Resolve skill tags to Competency ObjectIds ──────────────────────
  // Build lookup index by name, code, and aliases
  const compLookup = new Map()
  for (const [code, doc] of competencyCodeMap.entries()) {
    compLookup.set(code.toLowerCase(), doc._id)
    compLookup.set(doc.name.toLowerCase(), doc._id)
  }

  function resolveSkillTags(rawTagString, courseTitle, source) {
    if (!rawTagString) return []
    const tagNames = rawTagString.split(',').map((t) => t.trim()).filter(Boolean)
    const resolvedIds = new Set()

    for (const tag of tagNames) {
      const lower = tag.toLowerCase()
      let compId = compLookup.get(lower)

      if (!compId && TAG_ALIASES[lower]) {
        const targetCode = TAG_ALIASES[lower].toLowerCase()
        compId = compLookup.get(targetCode)
      }

      if (compId) {
        resolvedIds.add(compId)
      } else {
        const key = `${tag} (source: ${source})`
        if (!summary.unresolvedTags.has(key)) {
          summary.unresolvedTags.set(key, [])
        }
        summary.unresolvedTags.get(key).push(courseTitle)
      }
    }

    return Array.from(resolvedIds)
  }

  // ── C. Import iGOT Courses ──────────────────────────────────────────────────
  const igotCsvPath = path.join(DATA_DIR, 'igot_style_courses.csv')
  if (!fs.existsSync(igotCsvPath)) {
    throw new Error(`Missing required CSV file: ${igotCsvPath}`)
  }

  const rawIgot = parse(fs.readFileSync(igotCsvPath, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  console.log(`\n[3/4] Processing ${rawIgot.length} iGOT courses from igot_style_courses.csv...`)

  for (const row of rawIgot) {
    if (!row.title) continue

    const durationHours = parseDurationHours(row.duration)
    const difficulty = (row.difficulty || 'intermediate').toLowerCase()
    const validDifficulty = ['beginner', 'intermediate', 'advanced'].includes(difficulty)
      ? difficulty
      : 'intermediate'

    const skillTags = resolveSkillTags(row.skill_tags, row.title, 'igot')

    const filter = { title: row.title.trim(), source: 'igot' }
    const existing = await Course.findOne(filter)

    const updateDoc = {
      title: row.title.trim(),
      description: row.description?.trim() || '',
      source: 'igot',
      difficulty: validDifficulty,
      durationHours,
      targetGroup: row.target_group?.trim() || 'All Government Officials',
      skillTags,
    }

    await Course.findOneAndUpdate(filter, updateDoc, {
      upsert: true,
      new: true,
      runValidators: true,
    })

    if (existing) {
      summary.courses.igot.updated++
    } else {
      summary.courses.igot.inserted++
    }
    summary.courses.igot.total++
  }

  console.log(`  ✓ iGOT Courses: ${summary.courses.igot.total} processed (${summary.courses.igot.inserted} new, ${summary.courses.igot.updated} updated)`)

  // ── D. Import NSSTA Courses ─────────────────────────────────────────────────
  const nsstaCsvPath = path.join(DATA_DIR, 'NSSTA_Training_Courses.csv')
  if (!fs.existsSync(nsstaCsvPath)) {
    throw new Error(`Missing required CSV file: ${nsstaCsvPath}`)
  }

  const rawNssta = parse(fs.readFileSync(nsstaCsvPath, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  console.log(`\n[4/4] Processing ${rawNssta.length} NSSTA courses from NSSTA_Training_Courses.csv...`)

  for (const row of rawNssta) {
    if (!row.title) continue

    const durationHours = parseDurationHours(row.duration)
    const difficulty = (row.difficulty || 'intermediate').toLowerCase()
    const validDifficulty = ['beginner', 'intermediate', 'advanced'].includes(difficulty)
      ? difficulty
      : 'intermediate'

    const skillTags = resolveSkillTags(row.skill_tags, row.title, 'nssta')

    const filter = { title: row.title.trim(), source: 'nssta' }
    const existing = await Course.findOne(filter)

    const updateDoc = {
      title: row.title.trim(),
      description: row.description?.trim() || '',
      source: 'nssta',
      difficulty: validDifficulty,
      durationHours,
      targetGroup: row.target_group?.trim() || 'State DES / ISS / SSS',
      skillTags,
    }

    await Course.findOneAndUpdate(filter, updateDoc, {
      upsert: true,
      new: true,
      runValidators: true,
    })

    if (existing) {
      summary.courses.nssta.updated++
    } else {
      summary.courses.nssta.inserted++
    }
    summary.courses.nssta.total++
  }

  console.log(`  ✓ NSSTA Courses: ${summary.courses.nssta.total} processed (${summary.courses.nssta.inserted} new, ${summary.courses.nssta.updated} updated)`)

  // ── E. Final Summary & Unresolved Tags Report ───────────────────────────────
  console.log('\n======================================================')
  console.log('              IMPORT EXECUTION SUMMARY                ')
  console.log('======================================================')
  console.log(`Competencies: ${summary.competencies.total} (${summary.competencies.inserted} new, ${summary.competencies.updated} updated)`)
  console.log(`Job Roles:    ${summary.jobRoles.total} (${summary.jobRoles.inserted} new, ${summary.jobRoles.updated} updated)`)
  console.log(`iGOT Courses: ${summary.courses.igot.total} (${summary.courses.igot.inserted} new, ${summary.courses.igot.updated} updated)`)
  console.log(`NSSTA Courses:${summary.courses.nssta.total} (${summary.courses.nssta.inserted} new, ${summary.courses.nssta.updated} updated)`)
  console.log(`Total Courses:${summary.courses.igot.total + summary.courses.nssta.total}`)
  console.log('======================================================\n')

  if (summary.unresolvedTags.size > 0) {
    console.log(`[INFO] The following ${summary.unresolvedTags.size} skill tags from courses did not match a primary Competency:`)
    for (const [tag, courses] of summary.unresolvedTags.entries()) {
      console.log(`  - "${tag}" (appears in ${courses.length} course${courses.length > 1 ? 's' : ''}: e.g. "${courses[0]}")`)
    }
    console.log('\n(These tags are preserved in source CSVs; courses remain indexed by their resolved primary competencies.)\n')
  }

  if (isStandalone) {
    await mongoose.disconnect()
    console.log('Database connection closed cleanly.')
  }

  return summary
}

if (require.main === module) {
  importRealData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal import error:', err)
      process.exit(1)
    })
}

module.exports = importRealData
