'use strict'

const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const LearningProgress = require('../models/LearningProgress')
const Course = require('../models/Course')
const User = require('../models/User')

/**
 * POST /api/labs/access-token
 * Issues a short-lived signed JWT for launching the Virtual Labs sandbox.
 */
async function issueLabAccessToken(req, res, next) {
  try {
    const { course_id, lab_id } = req.body

    if (!course_id || !lab_id) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Both course_id and lab_id are required'
      })
    }

    // Validate course_id format if ObjectId
    if (mongoose.Types.ObjectId.isValid(course_id)) {
      const course = await Course.findById(course_id)
      if (!course) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Course not found'
        })
      }
    }

    // Verify user's learning progress has lab_unlocked = true
    const progress = await LearningProgress.findOne({
      user_id: req.user.id,
      course_id
    })

    if (!progress || progress.lab_unlocked !== true) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Complete the course quiz to unlock this lab'
      })
    }

    // Fetch user details for name
    const user = await User.findById(req.user.id).select('name email')
    const userName = user?.name || 'Learner'

    const secret = process.env.JWT_LAB_ACCESS_SECRET || 'kaushalai_virtual_labs_secure_jwt_shared_secret_2026_x89a'
    const labsAppUrl = process.env.LABS_APP_URL || 'http://localhost:5174'

    const tokenPayload = {
      user_id: String(req.user.id),
      course_id: String(course_id),
      lab_id: String(lab_id),
      user_name: userName
    }

    const accessToken = jwt.sign(tokenPayload, secret, {
      expiresIn: '5m'
    })

    return res.status(200).json({
      access_token: accessToken,
      labs_app_url: labsAppUrl,
      expires_in: 300
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

    return res.status(200).json({
      course_id: courseId,
      lab_unlocked: !!progress?.lab_unlocked,
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
    const configuredSecret = process.env.LABS_WEBHOOK_SECRET || 'kaushalai_webhook_secret_s2s_secure_98e1f0ba72c448a'

    if (!receivedSecret || receivedSecret !== configuredSecret) {
      console.warn('[Labs Webhook] Unauthorized attempt - secret mismatch or missing header')
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'WEBHOOK_SECRET_INVALID',
        message: 'Invalid or missing X-Labs-Webhook-Secret header'
      })
    }

    const { user_id, course_id, lab_id, score, completed_at } = req.body

    if (!user_id || !course_id) {
      return res.status(400).json({
        error: 'BadRequest',
        code: 'MISSING_FIELDS',
        message: 'user_id and course_id are required'
      })
    }

    const numericScore = typeof score === 'number' ? score : Number(score) || 100
    const completionDate = completed_at ? new Date(completed_at) : new Date()

    // Find existing learning progress record for user and course
    let progress = await LearningProgress.findOne({
      user_id,
      course_id
    })

    if (!progress) {
      // Check if user exists before creating or rejecting
      const userExists = await User.findById(user_id)
      if (!userExists) {
        return res.status(404).json({
          error: 'NotFound',
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        })
      }

      // Upsert learning progress record
      progress = new LearningProgress({
        user_id,
        course_id,
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
      await progress.save()
    } else {
      // Update existing record idempotently
      progress.lab_completed = true
      progress.lab_score = numericScore
      progress.lab_completed_at = completionDate
      if (lab_id) {
        progress.lab_id = lab_id
      }
      progress.updated_at = new Date()
      await progress.save()
    }

    console.log(
      `[Labs Webhook] Successfully processed lab completion -> User: ${user_id}, Course: ${course_id}, Lab: ${lab_id || 'N/A'}, Score: ${numericScore}%, Time: ${completionDate.toISOString()}`
    )

    return res.status(200).json({
      status: 'ok',
      message: 'Learning progress updated successfully',
      progress: {
        user_id: progress.user_id,
        course_id: progress.course_id,
        lab_completed: progress.lab_completed,
        lab_score: progress.lab_score,
        lab_completed_at: progress.lab_completed_at
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
