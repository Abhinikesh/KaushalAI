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
 * Helper to check whether the current user has unlocked the lab for this course.
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
      lab_completed: !!progress?.lab_completed
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  issueLabAccessToken,
  getLabStatus
}
