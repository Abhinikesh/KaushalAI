'use strict'

const { Department, Role, FunctionalArea, User } = require('../models')

const EDUCATION_LEVELS = [
  '10th Standard',
  '12th Standard',
  'Diploma',
  "Bachelor's Degree",
  "Master's Degree",
  'Professional Qualification',
  'Doctorate / Ph.D.',
  'Other',
]

const COMMON_CERTIFICATIONS = [
  'SAS Certified Statistical Business Analyst',
  'Microsoft Certified: Data Analyst Associate',
  'Google Data Analytics Professional Certificate',
  'ISO 9001 Lead Auditor',
  'Certified Information Systems Auditor (CISA)',
  'iGOT Public Administration Excellence',
  'NSSTA Advanced Survey Sampling Certification',
  'Tableau Certified Data Analyst',
  'Python for Data Science (NPTEL)',
  'R Programming for Public Health & Census',
]

const RESPONSIBILITIES_OPTIONS = [
  'Field Survey Administration',
  'Data Collection & Scrutiny',
  'Statistical Analysis & Reporting',
  'Team & Staff Coordination',
  'Financial Management & Budgeting',
  'Policy Analysis & Briefings',
  'Database Management & SQL',
  'Sampling Frame Design',
  'Quality Assurance & Audit',
  'CAPI Instrument Scripting',
  'Dissemination & Public Microdata',
]

/**
 * GET /api/onboarding/options
 * Returns dynamic dropdown options for the onboarding questionnaire.
 */
async function getOnboardingOptions(_req, res, next) {
  try {
    const [departments, roles, functional_areas] = await Promise.all([
      Department.find({}).sort({ name: 1 }).lean(),
      Role.find({}).sort({ level: 1, name: 1 }).lean(),
      FunctionalArea.find({}).sort({ name: 1 }).lean(),
    ])

    res.json({
      success: true,
      departments,
      roles,
      functional_areas,
      education_levels: EDUCATION_LEVELS,
      common_certifications: COMMON_CERTIFICATIONS,
      responsibilities_options: RESPONSIBILITIES_OPTIONS,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/onboarding/profile
 * Saves onboarding questionnaire data for the authenticated user.
 * Auto-derives level (1-5) from the selected role.
 * Does NOT mark onboarding_completed = true yet (that occurs post-assessment in Part 3).
 */
async function saveOnboardingProfile(req, res, next) {
  try {
    const userId = req.user && req.user.id
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const {
      department_id,
      role_id,
      functional_area_id,
      experience_years,
      education_level,
      field_of_study,
      certifications,
      current_responsibilities,
    } = req.body

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    let derivedLevel = user.level || 1
    let roleRecord = null
    let deptRecord = null
    let faRecord = null

    if (role_id) {
      roleRecord = await Role.findById(role_id)
      if (roleRecord) {
        derivedLevel = roleRecord.level
        user.role_id = roleRecord._id
        user.designation = roleRecord.name
        user.gradeLevel = `Level ${roleRecord.level}`
      }
    }

    if (department_id) {
      deptRecord = await Department.findById(department_id)
      if (deptRecord) {
        user.department = deptRecord.name
      }
    }

    if (functional_area_id) {
      faRecord = await FunctionalArea.findById(functional_area_id)
      if (faRecord) {
        user.functional_area_id = faRecord._id
      }
    }

    if (experience_years !== undefined) {
      user.experience_years = Math.max(0, Number(experience_years) || 0)
    }

    if (education_level !== undefined) {
      user.education_level = education_level
    }

    if (field_of_study !== undefined) {
      user.field_of_study = field_of_study
    }

    if (Array.isArray(certifications)) {
      user.certifications = certifications
    }

    if (Array.isArray(current_responsibilities)) {
      user.current_responsibilities = current_responsibilities
      user.areasOfWork = current_responsibilities
    }

    // Note: onboarding_completed remains false until diagnostic test completion in Part 3
    await user.save()

    // Level description mapping
    const levelTitles = {
      1: 'Support Staff (Level 1)',
      2: 'Junior Assistant (Level 2)',
      3: 'Section Officer (Level 3)',
      4: 'Senior Officer (Level 4)',
      5: 'Department Head (Level 5)',
    }

    res.json({
      success: true,
      derived_level: derivedLevel,
      level_title: levelTitles[derivedLevel] || `Level ${derivedLevel}`,
      role_name: roleRecord ? roleRecord.name : user.designation,
      department_name: deptRecord ? deptRecord.name : user.department,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        department: user.department,
        level: derivedLevel,
        experience_years: user.experience_years,
        education_level: user.education_level,
        field_of_study: user.field_of_study,
        certifications: user.certifications,
        current_responsibilities: user.current_responsibilities,
        onboarding_completed: user.onboarding_completed,
      },
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getOnboardingOptions,
  saveOnboardingProfile,
}
