'use strict'

const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const LearningProgress = require('../models/LearningProgress')
const Course = require('../models/Course')
const User = require('../models/User')

// Mapping of course IDs to designated Virtual Lab sandbox modules
const COURSE_LAB_MAP = {
  'igot-crs-01': 'lab-python-basics',
  'igot-crs-02': 'lab-python-analytics',
  'igot-crs-03': 'lab-sql-districts',
  'igot-crs-04': 'lab-regex-validate-gov-emails',
  'igot-crs-05': 'lab-sheet-data-cleanup',
  'igot-crs-06': 'lab-sheet-payroll-formulas',
  '6a996d6d266163e0a9606c61': 'lab-python-basics',
  '6a996d6d266163e0a9606c62': 'lab-sql-employees',
  '6a996d6d266163e0a9606c63': 'lab-python-analytics',
  '6a996d6d266163e0a9606c64': 'lab-js-async-fetch',
  '6a996d6d266163e0a9606c67': 'lab-js-arrays',
  '6a996d6d266163e0a9606c68': 'lab-regex-validate-gov-emails',
  '6a996d6d266163e0a9606c69': 'lab-python-analytics',
  '6a996d6d266163e0a9606c6a': 'lab-python-basics'
}

// Known valid Virtual Lab IDs
const VALID_VIRTUAL_LAB_IDS = new Set([
  'lab-python-basics',
  'lab-python-analytics',
  'lab-sql-employees',
  'lab-sql-districts',
  'lab-js-arrays',
  'lab-js-strings',
  'lab-js-async-fetch',
  'lab-js-calculator',
  'lab-js-dates',
  'lab-html-profile-card',
  'lab-html-broken-layout',
  'lab-html-citizen-form',
  'lab-sheet-payroll-formulas',
  'lab-sheet-data-cleanup',
  'lab-sheet-scheme-aggregations',
  'lab-regex-extract-employee-ids',
  'lab-regex-validate-gov-emails',
  'lab-regex-clean-phone-numbers'
])

function resolveLabId(courseId, requestedLabId, courseTitle = '') {
  // If explicitly requested lab_id is valid, use it
  if (requestedLabId && VALID_VIRTUAL_LAB_IDS.has(requestedLabId)) {
    return requestedLabId
  }

  // Check direct alias or course map
  if (requestedLabId && COURSE_LAB_MAP[requestedLabId]) {
    return COURSE_LAB_MAP[requestedLabId]
  }
  const cleanLab = String(requestedLabId || '').replace(/^lab-/, '')
  if (COURSE_LAB_MAP[cleanLab]) {
    return COURSE_LAB_MAP[cleanLab]
  }

  if (courseId && COURSE_LAB_MAP[courseId]) {
    return COURSE_LAB_MAP[courseId]
  }

  // Keyword heuristic from course title
  const title = (courseTitle || '').toLowerCase()
  if (title.includes('python') || title.includes('pandas') || title.includes('data analysis')) return 'lab-python-basics'
  if (title.includes('sql') || title.includes('database')) return 'lab-sql-employees'
  if (title.includes('excel') || title.includes('sheet') || title.includes('finance') || title.includes('payroll')) return 'lab-sheet-payroll-formulas'
  if (title.includes('governance') || title.includes('ai') || title.includes('machine learning')) return 'lab-python-analytics'
  if (title.includes('district') || title.includes('survey')) return 'lab-sql-districts'
  if (title.includes('security') || title.includes('privacy') || title.includes('email') || title.includes('regex')) return 'lab-regex-validate-gov-emails'

  return 'lab-python-basics'
}

/**
 * POST /api/labs/access-token
 * Issues a short-lived signed JWT for launching the Virtual Labs sandbox.
 */
async function issueLabAccessToken(req, res, next) {
  try {
    const { course_id, lab_id } = req.body

    if (!course_id && !lab_id) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Either course_id or lab_id is required'
      })
    }

    const courseIdentifier = course_id || lab_id
    let courseTitle = ''

    // Validate course_id format if ObjectId
    if (mongoose.Types.ObjectId.isValid(courseIdentifier)) {
      const course = await Course.findById(courseIdentifier)
      if (course) {
        courseTitle = course.title
      }
    }

    const resolvedLabId = resolveLabId(courseIdentifier, lab_id, courseTitle)

    // Find or create learning progress for user and course
    let progress = await LearningProgress.findOne({
      user_id: req.user.id,
      course_id: courseIdentifier
    })

    if (!progress) {
      progress = new LearningProgress({
        user_id: req.user.id,
        course_id: courseIdentifier,
        lab_unlocked: true,
        lab_id: resolvedLabId,
        updated_at: new Date()
      })
      await progress.save().catch(() => {})
    } else if (progress.lab_unlocked !== true) {
      progress.lab_unlocked = true
      progress.lab_id = resolvedLabId
      await progress.save().catch(() => {})
    }

    // Fetch user details for name
    const user = await User.findById(req.user.id).select('name email')
    const userName = user?.name || 'Learner'

    const secret = process.env.JWT_LAB_ACCESS_SECRET || 'e345add7dd9b19f8e8c0d6005b66fb2f02283fadf60d48109c18c27a4c752da65ecb224d6ee55edcd3dfc4138197b80c271738146deef3e3fe637554f679108f'
    const labsAppUrl = process.env.LABS_APP_URL || 'http://localhost:5174'

    const tokenPayload = {
      user_id: String(req.user.id),
      course_id: String(courseIdentifier),
      course_context: courseTitle || String(courseIdentifier),
      lab_id: String(resolvedLabId),
      user_name: userName
    }

    const accessToken = jwt.sign(tokenPayload, secret, {
      expiresIn: '15m'
    })

    return res.status(200).json({
      access_token: accessToken,
      labs_app_url: labsAppUrl,
      lab_id: resolvedLabId,
      expires_in: 900
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/labs/status/:courseId
 * Helper to check whether the current user has unlocked and completed the lab for this course.
 */
async function getLabStatus(req, res, next) {
  try {
    const { courseId } = req.params

    const progress = await LearningProgress.findOne({
      user_id: req.user.id,
      course_id: courseId
    })

    const resolvedLabId = resolveLabId(courseId, progress?.lab_id)

    return res.status(200).json({
      course_id: courseId,
      lab_id: resolvedLabId,
      lab_unlocked: progress ? progress.lab_unlocked !== false : true,
      lab_completed: !!progress?.lab_completed,
      lab_score: progress?.lab_score || 0,
      lab_completed_at: progress?.lab_completed_at || null
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/labs/webhook/completion
 * Server-to-server webhook invoked by the Virtual Labs application upon lab completion.
 * Protected by X-Labs-Webhook-Secret header.
 * Idempotent: safe to invoke multiple times without unintended side effects.
 */
async function handleLabCompletionWebhook(req, res, next) {
  try {
    const receivedSecret = req.headers['x-labs-webhook-secret']
    const configuredSecret = process.env.LABS_WEBHOOK_SECRET || '02097ff73adcb64ee969157a570f206b4b0238f1090b5ea56ecbc5d2a1d5cf0053f4ac1bfe98380fc155d2fac2eeb5cacc06149e0b3205cb922c2500f9bcf18c'

    if (!receivedSecret || receivedSecret !== configuredSecret) {
      console.warn('[Labs Webhook] Unauthorized attempt - secret mismatch or missing header')
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'WEBHOOK_SECRET_INVALID',
        message: 'Invalid or missing X-Labs-Webhook-Secret header'
      })
    }

    const { user_id, score, completed_at } = req.body
    const lab_id = req.body.lab_id
    const course_id = req.body.course_id || req.body.course_context || COURSE_LAB_MAP[lab_id] || lab_id

    if (!user_id) {
      return res.status(400).json({
        error: 'BadRequest',
        code: 'MISSING_FIELDS',
        message: 'user_id is required'
      })
    }

    const numericScore = typeof score === 'number' ? score : Number(score) || 100
    const completionDate = completed_at ? new Date(completed_at) : new Date()

    // Find existing learning progress record for user and course
    let progress = await LearningProgress.findOne({
      user_id,
      course_id: course_id || lab_id
    })

    if (!progress) {
      // Upsert learning progress record
      progress = new LearningProgress({
        user_id,
        course_id: course_id || lab_id,
        course_completed: true,
        quiz_passed: true,
        quiz_score: 100,
        lab_unlocked: true,
        lab_completed: true,
        lab_score: numericScore,
        lab_completed_at: completionDate,
        lab_id: lab_id || null,
        updated_at: new Date()
      })
      await progress.save().catch((saveErr) => {
        console.warn('[Labs Webhook] Warning saving progress:', saveErr.message)
      })
    } else {
      // Update existing record idempotently
      progress.lab_unlocked = true
      progress.lab_completed = true
      progress.lab_score = numericScore
      progress.lab_completed_at = completionDate
      if (lab_id) {
        progress.lab_id = lab_id
      }
      progress.updated_at = new Date()
      await progress.save().catch((saveErr) => {
        console.warn('[Labs Webhook] Warning updating progress:', saveErr.message)
      })
    }

    console.log(
      `[Labs Webhook] Successfully processed lab completion -> User: ${user_id}, Course: ${course_id || 'N/A'}, Lab: ${lab_id || 'N/A'}, Score: ${numericScore}%, Time: ${completionDate.toISOString()}`
    )

    return res.status(200).json({
      status: 'ok',
      message: 'Learning progress updated successfully',
      progress: {
        user_id: progress?.user_id,
        course_id: progress?.course_id,
        lab_completed: progress?.lab_completed,
        lab_score: progress?.lab_score,
        lab_completed_at: progress?.lab_completed_at
      }
    })
  } catch (err) {
    console.error('[Labs Webhook] Error processing completion webhook:', err)
    next(err)
  }
}

module.exports = {
  issueLabAccessToken,
  getLabStatus,
  handleLabCompletionWebhook
}

