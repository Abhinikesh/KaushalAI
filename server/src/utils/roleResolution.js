'use strict'

const mongoose = require('mongoose')
const Role = require('../models/Role')
const Department = require('../models/Department')

/**
 * resolveAuthoritativeRole
 * Unambiguously resolves the authoritative Role document for a user.
 * 
 * Rules:
 * 1. If user.role_id is set:
 *    Fetches Role by ID with populated department_ref. If found, returns { role, resolved: true, method: 'assigned_role' }.
 * 2. If user.role_id is missing, checks if level AND a specific department can be resolved:
 *    - Looks up department either via user.department_ref or user.department name/code.
 *    - If department is found and level is valid (1-5), queries Role.find({ department_ref: deptId, level }).
 *    - If exactly one matching role is found, returns { role: matches[0], resolved: true, method: 'department_level_match' }.
 * 3. In ALL other cases (missing role_id and missing/ambiguous department, multiple matches, or 0 matches):
 *    Fails closed: returns { role: null, resolved: false, reason: 'unresolved_role_or_ambiguous' }.
 *    NEVER picks an arbitrary role across departments.
 *
 * @param {Object} user - User document or plain object with role_id, level, department_ref, department
 * @returns {Promise<{ role: Object|null, resolved: boolean, method?: string, reason?: string }>}
 */
async function resolveAuthoritativeRole(user) {
  if (!user) {
    return { role: null, resolved: false, reason: 'no_user_provided' }
  }

  // 1. Direct role_id resolution
  const roleId = user.role_id?._id || user.role_id
  if (roleId && mongoose.Types.ObjectId.isValid(String(roleId))) {
    const roleDoc = await Role.findById(roleId).populate('department_ref').lean()
    if (roleDoc) {
      return { role: roleDoc, resolved: true, method: 'assigned_role' }
    }
  }

  // 2. Strict department + level fallback (only if both are present and unambiguous)
  const userLevel = Number(user.level)
  const hasValidLevel = Number.isInteger(userLevel) && userLevel >= 1 && userLevel <= 5

  if (!hasValidLevel) {
    return { role: null, resolved: false, reason: 'missing_or_invalid_level' }
  }

  let deptId = null
  const rawDeptRef = user.department_ref?._id || user.department_ref
  if (rawDeptRef && mongoose.Types.ObjectId.isValid(String(rawDeptRef))) {
    deptId = rawDeptRef
  } else if (typeof user.department === 'string' && user.department.trim().length > 0) {
    const deptString = user.department.trim()
    const deptDoc = await Department.findOne({
      $or: [
        { code: deptString.toUpperCase() },
        { name: new RegExp('^' + deptString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
      ],
    }).select('_id').lean()
    if (deptDoc) {
      deptId = deptDoc._id
    }
  }

  if (!deptId) {
    return { role: null, resolved: false, reason: 'missing_or_unresolved_department' }
  }

  const matchingRoles = await Role.find({
    department_ref: deptId,
    level: userLevel,
  }).populate('department_ref').lean()

  if (matchingRoles.length === 1) {
    return { role: matchingRoles[0], resolved: true, method: 'department_level_match' }
  }

  return {
    role: null,
    resolved: false,
    reason: matchingRoles.length === 0 ? 'no_matching_role_for_dept_and_level' : 'ambiguous_multiple_roles_matched',
  }
}

module.exports = {
  resolveAuthoritativeRole,
}

