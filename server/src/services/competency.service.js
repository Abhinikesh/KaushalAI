const mongoose = require('mongoose')
const Competency = require('../models/Competency')
const Role = require('../models/Role')
const RoleCompetency = require('../models/RoleCompetency')
const JobRole = require('../models/JobRole')
const UserCompetency = require('../models/UserCompetency')
const User = require('../models/User')

const CANONICAL_CATEGORIES = ['statistical', 'technical', 'digital_governance', 'behavioural']

const CATEGORY_NAMES = {
  statistical: 'Statistical Methods',
  technical: 'Analytical & Technical',
  digital_governance: 'Governance & Quality',
  behavioural: 'Behavioural & Managerial',
}

async function listCompetencies() {
  return Competency.find().sort({ category: 1, name: 1 })
}

async function createCompetency(data) {
  return Competency.create(data)
}

async function listJobRoles() {
  return JobRole.find().populate('requiredCompetencies.competencyId', 'name category')
}

async function createJobRole(data) {
  return JobRole.create(data)
}

async function getUserCompetencies(userId) {
  return UserCompetency.find({
    $or: [{ user_id: userId }, { userId }],
  }).populate('competency_id', 'name category description level levelDescriptions')
}

async function upsertUserCompetency(userId, competencyId, level, source = 'self_assessed') {
  const record = await UserCompetency.findOneAndUpdate(
    { user_id: userId, competency_id: competencyId },
    { current_level: level, source, last_assessed_at: new Date() },
    { upsert: true, new: true, runValidators: true }
  ).populate('competency_id', 'name category description level levelDescriptions')

  // Keep SkillGap in sync
  try {
    const SkillGap = require('../models/SkillGap')
    const existingGap = await SkillGap.findOne({ user_id: userId, competency_id: competencyId })
    if (existingGap) {
      const reqLvl = existingGap.required_level || 3
      const newGap = reqLvl - level
      const priority = newGap >= 2 ? 'high' : newGap === 1 ? 'medium' : 'low'
      await SkillGap.updateOne(
        { _id: existingGap._id },
        { current_level: level, gap: newGap, priority, computed_at: new Date() }
      )
    }
  } catch (err) {
    console.error('[upsertUserCompetency] Error syncing SkillGap:', err.message)
  }

  return record
}

async function setUserJobRole(userId, jobRoleId) {
  const role = await JobRole.findById(jobRoleId)
  if (!role) {
    const err = new Error('Job role not found')
    err.status = 404
    throw err
  }
  return User.findByIdAndUpdate(userId, { jobRoleId }, { new: true }).select('-passwordHash')
}

/**
 * getCompetencyFramework
 * Authoritative read-only framework retrieval aggregating Competency, Role, and RoleCompetency.
 * Fully decoupled from user-level assessment or skill gap states.
 */
async function getCompetencyFramework(filters = {}) {
  const { category, search, role_id } = filters

  // 1. Validate category if supplied
  if (category && !CANONICAL_CATEGORIES.includes(category)) {
    const err = new Error(`Invalid category: "${category}". Must be one of: ${CANONICAL_CATEGORIES.join(', ')}`)
    err.status = 400
    throw err
  }

  // 2. Validate role_id format if supplied
  if (role_id && !mongoose.Types.ObjectId.isValid(role_id)) {
    const err = new Error(`Invalid role_id: "${role_id}". Must be a valid 24-character hexadecimal ObjectId`)
    err.status = 400
    throw err
  }

  // 3. Query canonical collections in parallel using .lean()
  const [allCompetencies, allRoles, allRoleComps] = await Promise.all([
    Competency.find().lean(),
    Role.find().lean(),
    RoleCompetency.find().lean(),
  ])

  // 4. Validate mapping references
  const validCompIdSet = new Set(allCompetencies.map((c) => c._id.toString()))
  const validRoleIdSet = new Set(allRoles.map((r) => r._id.toString()))

  // If role_id supplied, ensure it exists in Role collection
  if (role_id && !validRoleIdSet.has(role_id.toString())) {
    const err = new Error(`Role not found with ID: ${role_id}`)
    err.status = 404
    throw err
  }

  // Only retain mappings pointing to both a valid Role and valid Competency
  const validRoleComps = allRoleComps.filter((rc) => {
    const cId = (rc.competency_id?._id || rc.competency_id)?.toString()
    const rId = (rc.role_id?._id || rc.role_id)?.toString()
    return cId && rId && validCompIdSet.has(cId) && validRoleIdSet.has(rId)
  })

  // Map: competencyId -> Set of distinct valid roleIds
  const compToRolesMap = new Map()
  // Map: roleId -> Map(competencyId -> required_level)
  const roleToCompsMap = new Map()

  for (const rc of validRoleComps) {
    const cId = (rc.competency_id?._id || rc.competency_id).toString()
    const rId = (rc.role_id?._id || rc.role_id).toString()
    const reqLvl = typeof rc.required_level === 'number' ? rc.required_level : null

    if (!compToRolesMap.has(cId)) {
      compToRolesMap.set(cId, new Set())
    }
    compToRolesMap.get(cId).add(rId)

    if (!roleToCompsMap.has(rId)) {
      roleToCompsMap.set(rId, new Map())
    }
    if (reqLvl !== null) {
      roleToCompsMap.get(rId).set(cId, reqLvl)
    }
  }

  // 5. Global Summary (unaffected by request filters)
  const totalCompetencies = allCompetencies.length
  const assignedCompCount = compToRolesMap.size
  const unassignedCompCount = Math.max(0, totalCompetencies - assignedCompCount)
  const totalRoles = allRoles.length
  const totalRoleMappings = validRoleComps.length

  const summary = {
    total_categories: CANONICAL_CATEGORIES.length,
    total_competencies: totalCompetencies,
    assigned_competencies: assignedCompCount,
    unassigned_competencies: unassignedCompCount,
    total_roles: totalRoles,
    total_role_mappings: totalRoleMappings,
  }

  // 6. Global Category Summaries (unaffected by request filters)
  const categoryCounts = {}
  for (const cat of CANONICAL_CATEGORIES) {
    categoryCounts[cat] = 0
  }
  for (const comp of allCompetencies) {
    if (categoryCounts[comp.category] !== undefined) {
      categoryCounts[comp.category]++
    }
  }

  const categories = CANONICAL_CATEGORIES.map((code) => {
    const count = categoryCounts[code] || 0
    const percentage = totalCompetencies > 0 ? Math.round((count / totalCompetencies) * 100) : 0
    return {
      key: code,
      code,
      name: CATEGORY_NAMES[code] || code,
      count,
      percentage,
    }
  })

  // 7. Filter Competencies for `results`
  let filtered = allCompetencies

  // Role filter: only competencies assigned to specified role
  if (role_id) {
    const roleIdStr = role_id.toString()
    const assignedMap = roleToCompsMap.get(roleIdStr)
    if (!assignedMap || assignedMap.size === 0) {
      filtered = []
    } else {
      filtered = filtered.filter((c) => assignedMap.has(c._id.toString()))
    }
  }

  // Category filter
  if (category) {
    filtered = filtered.filter((c) => c.category === category)
  }

  // Search filter (text match over name, competencyCode, description; escapes regex special characters)
  const searchStr = (typeof search === 'string') ? search.trim().slice(0, 100) : ''
  if (searchStr) {
    const escaped = searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'i')
    filtered = filtered.filter((c) => {
      const matchName = regex.test(c.name || '')
      const matchCode = regex.test(c.competencyCode || '')
      const matchDesc = regex.test(c.description || '')
      return matchName || matchCode || matchDesc
    })
  }

  // Sort: canonical category enum order, then name ascending
  const catOrder = { statistical: 0, technical: 1, digital_governance: 2, behavioural: 3 }
  filtered.sort((a, b) => {
    const diff = (catOrder[a.category] ?? 99) - (catOrder[b.category] ?? 99)
    if (diff !== 0) return diff
    return (a.name || '').localeCompare(b.name || '')
  })

  // Map to response format with strictly defined schema fields + derived fields
  const results = filtered.map((c) => {
    const cIdStr = c._id.toString()
    const item = {
      _id: c._id,
      name: c.name,
      competencyCode: c.competencyCode || '',
      category: c.category,
      description: c.description || '',
      levelDescriptions: c.levelDescriptions || { beginner: '', intermediate: '', advanced: '' },
      roles_count: compToRolesMap.get(cIdStr)?.size || 0,
      is_assigned: (compToRolesMap.get(cIdStr)?.size || 0) > 0,
    }

    // When role_id filter is active, attach authoritative required_level for that role
    if (role_id) {
      const roleIdStr = role_id.toString()
      const reqLvl = roleToCompsMap.get(roleIdStr)?.get(cIdStr)
      if (typeof reqLvl === 'number') {
        item.required_level = reqLvl
      }
    }

    return item
  })

  return {
    success: true,
    summary,
    categories,
    results,
    meta: {
      filters: {
        category: category || null,
        search: searchStr || null,
        role_id: role_id ? role_id.toString() : null,
      },
      total_results: results.length,
    },
  }
}

async function listCanonicalRoles() {
  return Role.find({}).sort({ level: 1, name: 1 }).select('_id name level department code').lean()
}

module.exports = {
  listCompetencies,
  createCompetency,
  listJobRoles,
  createJobRole,
  getUserCompetencies,
  upsertUserCompetency,
  setUserJobRole,
  getCompetencyFramework,
  listCanonicalRoles,
  CANONICAL_CATEGORIES,
  CATEGORY_NAMES,
}
