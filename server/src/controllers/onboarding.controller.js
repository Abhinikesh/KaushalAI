'use strict'

const { Department, Role, FunctionalArea, User, Competency, AssessmentAttempt, RoleCompetency } = require('../models')

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

const AVAILABLE_INTERESTS = [
  {
    id: 'survey_operations',
    name: 'Data Collection and Survey Operations',
    description: 'National sampling frames, household & enterprise field surveys, CAPI digital instruments, and multi-stage sampling.',
    icon: 'Compass',
    category: 'statistical',
    aliases: ['Sample Survey Methodology & Sampling Frames', 'Data Collection & Survey Operations'],
  },
  {
    id: 'statistical_analysis',
    name: 'Statistical Analysis and Modeling',
    description: 'Descriptive and inferential statistics, sampling error estimation, hypothesis testing, and regression analysis for official data.',
    icon: 'TrendingUp',
    category: 'statistical',
    aliases: ['Statistical Modeling & Quantitative Analysis', 'Statistical Analysis & Modeling'],
  },
  {
    id: 'data_processing',
    name: 'Data Processing and Management',
    description: 'Enterprise database structures, SQL query pipelines, administrative big data registers, and scalable ETL processing.',
    icon: 'Database',
    category: 'technical',
    aliases: ['Administrative Big Data Integration & ETL', 'Data Processing & Management'],
  },
  {
    id: 'data_quality',
    name: 'Data Quality and Validation',
    description: 'Multi-stage field data scrutiny, high-frequency validation checks, statistical auditing, and data quality frameworks.',
    icon: 'ShieldCheck',
    category: 'statistical',
    aliases: ['Data Quality Assurance & Auditing Standards', 'Data Quality & Validation'],
  },
  {
    id: 'data_visualization',
    name: 'Data Visualization and Reporting',
    description: 'Interactive analytical dashboards, thematic statistical charting, GIS spatial mapping, and publication infographics.',
    icon: 'BarChart3',
    category: 'technical',
    aliases: ['Data Visualization & Executive Reporting', 'Data Visualization & Reporting'],
  },
  {
    id: 'research_methodology',
    name: 'Research and Methodology',
    description: 'Questionnaire formulation, stratification strategies, small area estimation, and survey design research methodologies.',
    icon: 'FileText',
    category: 'statistical',
    aliases: ['Research Methodology & Survey Design', 'Research & Methodology'],
  },
  {
    id: 'national_accounts',
    name: 'National Accounts & Macroeconomic Aggregates',
    description: 'Gross Domestic Product (GDP), Gross Value Added (GVA), supply-use tables, capital formation, and institutional sector accounts.',
    icon: 'Landmark',
    category: 'statistical',
    aliases: ['National Accounts & Macroeconomics'],
  },
  {
    id: 'price_indices',
    name: 'Price Indices and Economic Indicators',
    description: 'Consumer Price Index (CPI), Index of Industrial Production (IIP), wholesale price deflators, and inflation tracking.',
    icon: 'LineChart',
    category: 'statistical',
    aliases: ['Price Indices, Inflation & Industrial Metrics (CPI/IIP)', 'Price Indices & Economic Indicators'],
  },
  {
    id: 'official_policy',
    name: 'Official Statistics and Policy',
    description: 'Government statistical governance, public data policies, confidentiality protocols, and evidence-based decision making.',
    icon: 'Scale',
    category: 'digital_governance',
    aliases: ['Data Governance, Privacy & Public Policy', 'Official Statistics & Policy'],
  },
  {
    id: 'digital_tools',
    name: 'Digital Tools and Technology',
    description: 'Statistical computing in Python and R, machine learning algorithms, automated data scrutiny, and cybersecurity governance.',
    icon: 'Cpu',
    category: 'technical',
    aliases: ['AI, Machine Learning & Algorithmic Automation', 'Cybersecurity & Government Data Infrastructure', 'Digital Tools & Technology'],
  },
  {
    id: 'data_dissemination',
    name: 'Data Dissemination and SDG Tracking',
    description: 'Public data release portals, microdata anonymization, National Indicator Framework (NIF), and UN SDG monitoring.',
    icon: 'Globe',
    category: 'digital_governance',
    aliases: ['Sustainable Development Goals (SDG) Metrics', 'Data Dissemination & SDG Tracking'],
  },
  {
    id: 'administration_coordination',
    name: 'Administration and Coordination',
    description: 'Field office coordination, project management, resource allocation, and inter-divisional statistical workflows.',
    icon: 'Building2',
    category: 'behavioural',
    aliases: ['Administration & Coordination'],
  },
]

const COLOR_THEMES = [
  { id: 'abyss', label: 'Abyss Theme', swatches: ['#5b8dee', '#1e2235', '#2d3561'] },
  { id: 'cobalt', label: 'Cobalt Theme', swatches: ['#0088ff', '#1b4f72', '#0d1f2d'] },
  { id: 'classic', label: 'Classic Theme', swatches: ['#29aaff', '#ffffff', '#e5e9f0'] },
  { id: 'forest', label: 'Forest Theme', swatches: ['#1a6b3a', '#ffffff', '#e8f0ec'] },
  { id: 'onsen', label: 'Onsen Blue', swatches: ['#2cd3bf', '#0d1f2d', '#e8f4f3'] },
]

const LANGUAGES = [
  { code: 'en', nativeLabel: 'English', flag: '🇬🇧', desc: 'Platform content in English' },
  { code: 'hi', nativeLabel: 'हिन्दी', flag: '🇮🇳', desc: 'प्लेटफ़ॉर्म सामग्री हिंदी में' },
]

/**
 * GET /api/onboarding/options
 * Returns dynamic dropdown options for the onboarding questionnaire.
 */
async function getOnboardingOptions(_req, res, next) {
  try {
    let [departments, roles, functional_areas, competencies, role_competencies] = await Promise.all([
      Department.find({}).sort({ name: 1 }).lean(),
      Role.find({}).sort({ level: 1, name: 1 }).lean(),
      FunctionalArea.find({}).sort({ name: 1 }).lean(),
      Competency.find({}).sort({ name: 1 }).select('name category description competencyCode levelDescriptions').lean(),
      RoleCompetency.find({}).select('role_id competency_id required_level').lean(),
    ])

    // Self-healing: if empty in production DB, run Part 1 migration immediately
    if (departments.length === 0 || roles.length === 0 || functional_areas.length === 0) {
      console.log('[onboarding.controller] Reference data empty. Seeding departments and roles on the fly...')
      const migratePart1 = require('../seed/migratePart1MasterData')
      await migratePart1()
      ;[departments, roles, functional_areas] = await Promise.all([
        Department.find({}).sort({ name: 1 }).lean(),
        Role.find({}).sort({ level: 1, name: 1 }).lean(),
        FunctionalArea.find({}).sort({ name: 1 }).lean(),
      ])
    }

    res.json({
      success: true,
      departments,
      roles,
      functional_areas,
      competencies,
      role_competencies: role_competencies || [],
      education_levels: EDUCATION_LEVELS,
      common_certifications: COMMON_CERTIFICATIONS,
      responsibilities_options: RESPONSIBILITIES_OPTIONS,
      available_interests: AVAILABLE_INTERESTS,
      themes: COLOR_THEMES,
      languages: LANGUAGES,
      appearance_modes: [
        { id: 'light', label: 'Light Mode', desc: 'Clean government portal view' },
        { id: 'dark', label: 'Dark Mode', desc: 'Comfortable dark background for reduced glare' },
      ],
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/onboarding/state
 * Authoritative endpoint: returns learner's current step, completion status, and saved data.
 */
async function getOnboardingState(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const user = await User.findById(userId)
      .populate('role_id')
      .populate('functional_area_id')
      .populate('skills_to_develop')

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Administrators bypass learner onboarding
    if (user.role === 'admin') {
      return res.json({
        success: true,
        onboarding_completed: true,
        onboarding_step: 6,
        role: 'admin',
        isAdmin: true,
        message: 'Administrators are exempt from learner onboarding.',
      })
    }

    // Fetch latest diagnostic assessment attempt if available
    const latestAttempt = await AssessmentAttempt.findOne({
      user_id: user._id,
    })
      .sort({ createdAt: -1 })
      .lean()

    // Determine current permitted step (1 to 6)
    const currentStep = Math.min(6, Math.max(1, user.onboarding_step || 1))

    // Resolve department_id from role reference or department name
    let resolvedDeptId = null
    if (user.role_id?.department_ref) {
      resolvedDeptId = user.role_id.department_ref._id || user.role_id.department_ref
    } else if (user.department) {
      const d = await Department.findOne({ name: user.department }).lean()
      if (d) resolvedDeptId = d._id
    }

    res.json({
      success: true,
      onboarding_completed: Boolean(user.onboarding_completed),
      onboarding_step: currentStep,
      role: user.role,
      user_name: user.name,
      user_email: user.email,
      preferences: {
        language: user.preferences?.language || 'en',
        theme: user.preferences?.theme || 'abyss',
        appearanceMode: user.preferences?.appearanceMode || 'light',
        setupCompleted: Boolean(user.preferences?.setupCompleted),
      },
      learning_interests: user.learning_interests || [],
      profile: {
        department: user.department || '',
        department_id: resolvedDeptId,
        role_id: user.role_id?._id || user.role_id || null,
        role_name: user.role_id?.name || user.designation || '',
        functional_area_id: user.functional_area_id?._id || user.functional_area_id || null,
        functional_area_name: user.functional_area_id?.name || '',
        experience_years: user.experience_years ?? 0,
        education_level: user.education_level || '',
        field_of_study: user.field_of_study || '',
        certifications: user.certifications || [],
        current_responsibilities: user.current_responsibilities || [],
        derived_level: user.level || user.role_id?.level || 1,
      },
      skills_to_develop: user.skills_to_develop || [],
      latest_attempt: latestAttempt
        ? {
            id: latestAttempt._id,
            status: latestAttempt.status,
            overall_score: latestAttempt.overall_score,
            started_at: latestAttempt.started_at,
            completed_at: latestAttempt.completed_at,
            competency_scores: latestAttempt.competency_scores || [],
            ai_analysis: latestAttempt.ai_analysis || null,
          }
        : null,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/onboarding/step/:stepNumber
 * Saves data incrementally for the specified step.
 * Validates step order to prevent skipping steps.
 */
async function saveOnboardingStep(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const stepNumber = parseInt(req.params.stepNumber, 10)
    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 6) {
      return res.status(400).json({ success: false, message: 'Step number must be between 1 and 6' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const currentAllowedStep = user.onboarding_step || 1

    // Enforce step ordering: learner cannot jump ahead to stepNumber > currentAllowedStep
    if (stepNumber > currentAllowedStep) {
      return res.status(400).json({
        success: false,
        code: 'STEP_ORDER_VIOLATION',
        message: `Cannot access Step ${stepNumber}. Please complete Step ${currentAllowedStep} first.`,
        current_step: currentAllowedStep,
      })
    }

    // Process step-specific payloads
    switch (stepNumber) {
      case 1: {
        // Step 1: Learning Preferences (Language, Theme & Appearance Mode)
        const { language, theme, appearanceMode } = req.body

        const VALID_LANGUAGES = ['en', 'hi']
        if (language !== undefined) {
          if (!VALID_LANGUAGES.includes(language)) {
            return res.status(400).json({
              success: false,
              code: 'INVALID_LANGUAGE',
              message: `Invalid language '${language}'. Supported languages: ${VALID_LANGUAGES.join(', ')}`,
            })
          }
          user.preferences.language = language
        }

        const VALID_THEMES = ['abyss', 'cobalt', 'classic', 'forest', 'onsen']
        if (theme !== undefined) {
          if (!VALID_THEMES.includes(theme)) {
            return res.status(400).json({
              success: false,
              code: 'INVALID_THEME',
              message: `Invalid theme '${theme}'. Supported themes: ${VALID_THEMES.join(', ')}`,
            })
          }
          user.preferences.theme = theme
        }

        const VALID_MODES = ['light', 'dark']
        if (appearanceMode !== undefined) {
          if (!VALID_MODES.includes(appearanceMode)) {
            return res.status(400).json({
              success: false,
              code: 'INVALID_APPEARANCE_MODE',
              message: `Invalid appearance mode '${appearanceMode}'. Supported modes: ${VALID_MODES.join(', ')}`,
            })
          }
          user.preferences.appearanceMode = appearanceMode
        }

        user.preferences.setupCompleted = true
        user.onboarding_step = Math.max(currentAllowedStep, 2)
        break
      }

      case 2: {
        // Step 2: Professional Interests (Strict Validation & Deduplication)
        const { learning_interests, interests } = req.body
        const candidateInterests = Array.isArray(learning_interests)
          ? learning_interests
          : Array.isArray(interests)
          ? interests
          : null

        if (candidateInterests === null || !Array.isArray(candidateInterests)) {
          return res.status(400).json({
            success: false,
            code: 'INVALID_INTERESTS_PAYLOAD',
            message: 'learning_interests must be an array of selected interest IDs or domain names.',
          })
        }

        // Clean and filter strings
        const cleaned = candidateInterests
          .filter((item) => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim())

        // Deduplicate
        const uniqueItems = [...new Set(cleaned)]

        // Must have at least 1 selection before advancing from Step 2
        if (uniqueItems.length === 0) {
          return res.status(400).json({
            success: false,
            code: 'EMPTY_INTERESTS',
            message: 'Please select at least one professional interest to proceed to the next step.',
          })
        }

        // Validate each submitted item against authoritative AVAILABLE_INTERESTS
        const validatedIds = []
        for (const item of uniqueItems) {
          const match = AVAILABLE_INTERESTS.find(
            (opt) =>
              opt.id === item ||
              opt.name.toLowerCase() === item.toLowerCase() ||
              (opt.aliases && opt.aliases.some((a) => a.toLowerCase() === item.toLowerCase()))
          )

          if (!match) {
            return res.status(400).json({
              success: false,
              code: 'UNSUPPORTED_INTEREST',
              message: `Unsupported or invalid interest domain: '${item}'. Please choose from available professional domains.`,
              invalid_item: item,
            })
          }

          validatedIds.push(match.id)
        }

        // Persist deduplicated canonical IDs
        user.learning_interests = [...new Set(validatedIds)]
        user.onboarding_step = Math.max(currentAllowedStep, 3)
        break
      }

      case 3: {
        // Step 3: Professional Profile (Strict Validation & Master Data Checks)
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

        // 1. Validate Department ID
        if (!department_id) {
          return res.status(400).json({
            success: false,
            code: 'MISSING_DEPARTMENT',
            message: 'Ministry department / division is required.',
          })
        }
        if (!String(department_id).match(/^[0-9a-fA-F]{24}$/)) {
          return res.status(400).json({
            success: false,
            code: 'INVALID_DEPARTMENT_ID',
            message: 'Invalid department ID format.',
          })
        }
        const deptRecord = await Department.findById(department_id)
        if (!deptRecord) {
          return res.status(400).json({
            success: false,
            code: 'DEPARTMENT_NOT_FOUND',
            message: 'The selected ministry department does not exist in official master records.',
          })
        }

        // 2. Validate Role ID
        if (!role_id) {
          return res.status(400).json({
            success: false,
            code: 'MISSING_ROLE',
            message: 'Official job role / designation is required.',
          })
        }
        if (!String(role_id).match(/^[0-9a-fA-F]{24}$/)) {
          return res.status(400).json({
            success: false,
            code: 'INVALID_ROLE_ID',
            message: 'Invalid role ID format.',
          })
        }
        const roleRecord = await Role.findById(role_id)
        if (!roleRecord) {
          return res.status(400).json({
            success: false,
            code: 'ROLE_NOT_FOUND',
            message: 'The selected job role does not exist in official master records.',
          })
        }

        // 3. Verify Department-Role Hierarchy Relationship
        if (roleRecord.department_ref && String(roleRecord.department_ref) !== String(deptRecord._id)) {
          return res.status(400).json({
            success: false,
            code: 'ROLE_DEPARTMENT_MISMATCH',
            message: `Selected role '${roleRecord.name}' does not belong to department '${deptRecord.name}'.`,
          })
        }

        // 4. Validate Functional Area ID
        if (!functional_area_id) {
          return res.status(400).json({
            success: false,
            code: 'MISSING_FUNCTIONAL_AREA',
            message: 'Functional area / domain is required.',
          })
        }
        if (!String(functional_area_id).match(/^[0-9a-fA-F]{24}$/)) {
          return res.status(400).json({
            success: false,
            code: 'INVALID_FUNCTIONAL_AREA_ID',
            message: 'Invalid functional area ID format.',
          })
        }
        const faRecord = await FunctionalArea.findById(functional_area_id)
        if (!faRecord) {
          return res.status(400).json({
            success: false,
            code: 'FUNCTIONAL_AREA_NOT_FOUND',
            message: 'The selected functional area does not exist in official master records.',
          })
        }

        // 5. Validate Experience Years
        if (experience_years === undefined || experience_years === null || experience_years === '') {
          return res.status(400).json({
            success: false,
            code: 'MISSING_EXPERIENCE_YEARS',
            message: 'Years of professional experience is required.',
          })
        }
        const expNum = Number(experience_years)
        if (isNaN(expNum) || expNum < 0) {
          return res.status(400).json({
            success: false,
            code: 'INVALID_EXPERIENCE_YEARS',
            message: 'Experience must be a non-negative number.',
          })
        }
        if (expNum > 50) {
          return res.status(400).json({
            success: false,
            code: 'EXPERIENCE_EXCEEDS_MAX',
            message: 'Experience years cannot exceed 50 years.',
          })
        }

        // 6. Validate Key Responsibilities
        if (
          current_responsibilities !== undefined &&
          !Array.isArray(current_responsibilities)
        ) {
          return res.status(400).json({
            success: false,
            code: 'INVALID_RESPONSIBILITIES_PAYLOAD',
            message: 'current_responsibilities must be an array of responsibility descriptions.',
          })
        }
        const cleanedResponsibilities = Array.isArray(current_responsibilities)
          ? current_responsibilities
              .filter((r) => typeof r === 'string' && r.trim().length > 0)
              .map((r) => r.trim().slice(0, 150))
          : []
        if (cleanedResponsibilities.length === 0) {
          return res.status(400).json({
            success: false,
            code: 'EMPTY_RESPONSIBILITIES',
            message: 'Please select or provide at least one key operational responsibility.',
          })
        }

        // 7. Validate Education Level
        const cleanedEdu = typeof education_level === 'string' ? education_level.trim().slice(0, 100) : ''
        if (!cleanedEdu) {
          return res.status(400).json({
            success: false,
            code: 'MISSING_EDUCATION_LEVEL',
            message: 'Highest educational qualification is required.',
          })
        }

        // 8. Sanitize Field of Study (<= 100 characters)
        const cleanedField = typeof field_of_study === 'string' ? field_of_study.trim().slice(0, 100) : ''

        // 9. Sanitize Certifications (optional, strings <= 150 characters)
        let cleanedCerts = []
        if (Array.isArray(certifications)) {
          cleanedCerts = certifications
            .filter((c) => typeof c === 'string' && c.trim().length > 0)
            .map((c) => c.trim().slice(0, 150))
        }

        // 10. Persist validated fields into User document
        user.department = deptRecord.name
        user.role_id = roleRecord._id
        user.designation = roleRecord.name
        user.level = roleRecord.level
        user.gradeLevel = `Level ${roleRecord.level}`
        user.functional_area_id = faRecord._id
        user.experience_years = expNum
        user.current_responsibilities = [...new Set(cleanedResponsibilities)]
        user.areasOfWork = user.current_responsibilities
        user.education_level = cleanedEdu
        user.field_of_study = cleanedField
        user.certifications = [...new Set(cleanedCerts)]

        user.onboarding_step = Math.max(currentAllowedStep, 4)
        break
      }

      case 4: {
        // Step 4: Skills to Develop
        const { skills_to_develop } = req.body

        // 1. Validate payload type: must be an array
        if (!Array.isArray(skills_to_develop)) {
          return res.status(400).json({
            success: false,
            code: 'INVALID_SKILLS_PAYLOAD',
            message: 'skills_to_develop must be an array of competency IDs.',
          })
        }

        // 2. Enforce minimum requirement: at least 1 competency must be selected
        if (skills_to_develop.length === 0) {
          return res.status(400).json({
            success: false,
            code: 'EMPTY_SKILLS_TO_DEVELOP',
            message: 'Please select at least one competency to develop.',
          })
        }

        // 3. Validate ObjectId format for every item
        for (const item of skills_to_develop) {
          if (!item || (typeof item !== 'string' && typeof item !== 'object')) {
            return res.status(400).json({
              success: false,
              code: 'INVALID_COMPETENCY_ID',
              message: `Invalid competency ID: ${item}. Expected a 24-character hexadecimal ObjectId string.`,
            })
          }
          const idStr = String(item).trim()
          if (!idStr.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
              success: false,
              code: 'INVALID_COMPETENCY_ID',
              message: `Invalid competency ID format: '${idStr}'. Must be a 24-character hexadecimal ObjectId.`,
            })
          }
        }

        // 4. Deduplicate IDs safely
        const uniqueIds = [...new Set(skills_to_develop.map((id) => String(id).trim()))]

        // 5. Query MongoDB Competency collection to ensure all IDs exist
        const foundCompetencies = await Competency.find({ _id: { $in: uniqueIds } }).select('_id').lean()
        if (foundCompetencies.length !== uniqueIds.length) {
          const foundIdSet = new Set(foundCompetencies.map((c) => String(c._id)))
          const missingIds = uniqueIds.filter((id) => !foundIdSet.has(id))
          return res.status(400).json({
            success: false,
            code: 'COMPETENCY_NOT_FOUND',
            message: `One or more selected competencies do not exist in official records: ${missingIds.join(', ')}`,
          })
        }

        // 6. Persist validated ObjectIds to user.skills_to_develop
        user.skills_to_develop = uniqueIds

        // 7. Advance onboarding step to at least 5 (never downgrade)
        user.onboarding_step = Math.max(currentAllowedStep, 5)
        break
      }

      case 5: {
        // Step 5: Competency Assessment
        // Verifies whether a completed diagnostic attempt exists
        const completedAttempt = await AssessmentAttempt.findOne({
          user_id: user._id,
          status: 'completed',
        })

        if (completedAttempt) {
          user.onboarding_step = Math.max(currentAllowedStep, 6)
        }
        break
      }

      case 6: {
        // Step 6: Finalize Onboarding from Results Screen
        const completedAttempt = await AssessmentAttempt.findOne({
          user_id: user._id,
          status: 'completed',
        })

        if (!completedAttempt) {
          return res.status(400).json({
            success: false,
            message: 'You must complete the competency assessment before finalizing onboarding.',
          })
        }

        user.onboarding_completed = true
        user.onboarding_step = 6
        user.preferences.setupCompleted = true
        break
      }

      default:
        break
    }

    await user.save()

    res.json({
      success: true,
      onboarding_step: user.onboarding_step,
      onboarding_completed: Boolean(user.onboarding_completed),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
        level: user.level,
        experience_years: user.experience_years,
        education_level: user.education_level,
        field_of_study: user.field_of_study,
        certifications: user.certifications,
        current_responsibilities: user.current_responsibilities,
        role_id: user.role_id,
        functional_area_id: user.functional_area_id,
        preferences: user.preferences,
        learning_interests: user.learning_interests,
        skills_to_develop: user.skills_to_develop,
        onboarding_step: user.onboarding_step,
        onboarding_completed: Boolean(user.onboarding_completed),
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/onboarding/complete
 * Explicit completion action triggered from Step 6 results screen.
 */
async function completeOnboarding(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Require completed assessment attempt
    const completedAttempt = await AssessmentAttempt.findOne({
      user_id: user._id,
      status: 'completed',
    })

    if (!completedAttempt && user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'A completed competency assessment attempt is required before graduating onboarding.',
      })
    }

    user.onboarding_completed = true
    user.onboarding_step = 6
    user.preferences.setupCompleted = true
    await user.save()

    res.json({
      success: true,
      message: 'Onboarding completed successfully. Welcome to KaushalAI!',
      onboarding_completed: true,
      onboarding_step: 6,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
        level: user.level,
        preferences: user.preferences,
        onboarding_completed: true,
        onboarding_step: 6,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/onboarding/profile
 * Backward-compatible profile save endpoint.
 */
async function saveOnboardingProfile(req, res, next) {
  try {
    const userId = req.user?.id
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
        user.level = roleRecord.level
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

    // Advance onboarding step to at least 4
    user.onboarding_step = Math.max(user.onboarding_step || 1, 4)

    await user.save()

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
      onboarding_step: user.onboarding_step,
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
        onboarding_step: user.onboarding_step,
        onboarding_completed: Boolean(user.onboarding_completed),
      },
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getOnboardingOptions,
  getOnboardingState,
  saveOnboardingStep,
  completeOnboarding,
  saveOnboardingProfile,
}
