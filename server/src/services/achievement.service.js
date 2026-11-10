const mongoose = require('mongoose')
const QuizAttempt = require('../models/QuizAttempt')
const Enrollment = require('../models/Enrollment')
const UserCompetency = require('../models/UserCompetency')

/**
 * Safely extracts a valid Date object or null from a timestamp value.
 * @param {*} val
 * @returns {Date|null}
 */
function safeDate(val) {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Safely extracts epoch milliseconds for sorting.
 * @param {*} val
 * @returns {number}
 */
function safeEpoch(val) {
  const d = safeDate(val)
  return d ? d.getTime() : 0
}

/**
 * Deterministically evaluates and returns a learner's achievements,
 * progress metrics, and unlocked badges based on authoritative database records.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<{ summary: Object, achievements: Array }>}
 */
async function getUserAchievements(userId) {
  if (!userId) {
    throw { status: 400, message: 'User ID is required' }
  }

  // Handle both string and ObjectId queries
  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : null

  const userQuery = userObjectId
    ? { $in: [userObjectId, String(userId)] }
    : String(userId)

  // 1. Fetch relevant user records concurrently
  const [quizAttempts, enrollments, userCompetencies] = await Promise.all([
    QuizAttempt.find({
      $or: [
        { userId: userQuery },
        ...(userObjectId ? [{ userId: userObjectId }] : [])
      ]
    }).lean(),

    Enrollment.find({
      $or: [
        { userId: userQuery },
        ...(userObjectId ? [{ userId: userObjectId }] : [])
      ]
    }).lean(),

    UserCompetency.find({
      $or: [
        { user_id: userQuery },
        { userId: userQuery },
        ...(userObjectId
          ? [{ user_id: userObjectId }, { userId: userObjectId }]
          : [])
      ]
    }).lean()
  ])

  // 2. Classify and Sort Quiz Attempts
  // DEF-24.1.1-01: Exclude in-progress and expired attempts without completion.
  // DEF-24.1.1-04: Sort chronologically by completion/attempt timestamp.
  const completedAttempts = quizAttempts
    .filter((a) => {
      if (a.status === 'in_progress' || a.status === 'expired') {
        return false
      }
      return a.status === 'completed' || a.completedAt != null
    })
    .sort((a, b) => {
      const timeA = safeEpoch(a.completedAt || a.attemptedAt)
      const timeB = safeEpoch(b.completedAt || b.attemptedAt)
      return timeA - timeB
    })

  const passedAttempts = completedAttempts.filter(
    (a) => a.passed === true || (typeof a.score === 'number' && a.score >= 70)
  )

  const distinctionAttempts = completedAttempts.filter(
    (a) => typeof a.score === 'number' && a.score >= 90
  )

  // 3. Classify and Sort Enrollments
  // DEF-24.1.1-03: Exclude unaccepted 'recommended' enrollments.
  // DEF-24.1.1-04: Sort chronologically by start or completion date.
  const activeEnrollments = enrollments
    .filter((e) => e.status && e.status !== 'recommended')
    .sort((a, b) => {
      const timeA = safeEpoch(a.startedAt || a.completedAt || a.createdAt)
      const timeB = safeEpoch(b.startedAt || b.completedAt || b.createdAt)
      return timeA - timeB
    })

  const completedCourses = activeEnrollments
    .filter((e) => e.status === 'completed' || e.progressPercent === 100)
    .sort((a, b) => {
      const timeA = safeEpoch(a.completedAt || a.startedAt)
      const timeB = safeEpoch(b.completedAt || b.startedAt)
      return timeA - timeB
    })

  // 4. Classify and Sort Competencies
  // DEF-24.1.1-05: Exclude subjective 'self_assessed' ratings; require objective assessment.
  // DEF-24.1.1-04: Sort chronologically by assessment date.
  const verifiedCompetencies = userCompetencies
    .filter(
      (c) =>
        typeof c.current_level === 'number' &&
        c.current_level >= 1 &&
        c.source !== 'self_assessed'
    )
    .sort((a, b) => {
      const timeA = safeEpoch(cDate(a))
      const timeB = safeEpoch(cDate(b))
      return timeA - timeB
    })

  function cDate(comp) {
    return comp.last_assessed_at || comp.lastAssessedAt || comp.updatedAt
  }

  const expertCompetencies = verifiedCompetencies.filter(
    (c) => typeof c.current_level === 'number' && c.current_level >= 4
  )

  // 5. Compute distinct calendar days of active learning
  // DEF-24.1.1-03: Only use genuine learning lifecycle timestamps.
  // Exclude unaccepted recommendations and administrative createdAt/updatedAt noise.
  const activityDays = new Set()

  completedAttempts.forEach((a) => {
    const ts = safeDate(a.completedAt || a.attemptedAt)
    if (ts) {
      activityDays.add(ts.toISOString().slice(0, 10))
    }
  })

  activeEnrollments.forEach((e) => {
    const ts = safeDate(e.startedAt || e.completedAt)
    if (ts) {
      activityDays.add(ts.toISOString().slice(0, 10))
    }
  })

  // Chronologically sorted distinct active learning days
  const sortedActiveDays = Array.from(activityDays).sort()
  const activeDaysCount = sortedActiveDays.length

  // 6. Build the 6 Canonical Achievements with Deterministic Criteria
  const achievements = [
    {
      id: 'first_assessment_ace',
      title: 'First Assessment Ace',
      desc: 'Achieved 70%+ score on an official statistical cadre assessment.',
      category: 'Excellence',
      icon: 'Target',
      color: '#2563EB',
      bg: '#EFF6FF',
      current: passedAttempts.length,
      target: 1,
      progress_percent: Math.min(100, Math.round((passedAttempts.length / 1) * 100)),
      unlocked: passedAttempts.length >= 1,
      unlocked_at: passedAttempts.length > 0
        ? (passedAttempts[0].completedAt || passedAttempts[0].attemptedAt || null)
        : null,
      evidence: passedAttempts.length > 0
        ? `Passed assessment with score ${passedAttempts[0].score}%`
        : null
    },
    {
      id: 'survey_methodologist',
      title: 'Survey Methodologist',
      desc: 'Enrolled in and engaged with at least 2 official statistical capacity modules.',
      category: 'Domain Skill',
      icon: 'BarChart3',
      color: '#10B981',
      bg: '#ECFDF5',
      current: activeEnrollments.length,
      target: 2,
      progress_percent: Math.min(100, Math.round((activeEnrollments.length / 2) * 100)),
      unlocked: activeEnrollments.length >= 2,
      unlocked_at: activeEnrollments.length >= 2
        ? (activeEnrollments[1].startedAt || activeEnrollments[1].completedAt || activeEnrollments[1].createdAt || null)
        : null,
      evidence: activeEnrollments.length >= 2
        ? `Enrolled in ${activeEnrollments.length} capacity modules`
        : null
    },
    {
      id: 'statistical_analyst',
      title: 'Statistical Analyst',
      desc: 'Completed at least 3 separate assessment attempts with verified audit logs.',
      category: 'Technical',
      icon: 'Code2',
      color: '#8B5CF6',
      bg: '#FAF5FF',
      current: completedAttempts.length,
      target: 3,
      progress_percent: Math.min(100, Math.round((completedAttempts.length / 3) * 100)),
      unlocked: completedAttempts.length >= 3,
      unlocked_at: completedAttempts.length >= 3
        ? (completedAttempts[2].completedAt || completedAttempts[2].attemptedAt || null)
        : null,
      evidence: completedAttempts.length >= 3
        ? `Completed ${completedAttempts.length} evaluations`
        : null
    },
    {
      id: 'active_learning_scholar',
      title: 'Active Learning Scholar',
      desc: 'Engaged in capacity building across multiple distinct calendar days.',
      category: 'Consistency',
      icon: 'Flame',
      color: '#F97316',
      bg: '#FFF7ED',
      current: activeDaysCount,
      target: 3,
      progress_percent: Math.min(100, Math.round((activeDaysCount / 3) * 100)),
      unlocked: activeDaysCount >= 3,
      // DEF-24.1.1-02: Unlock date is strictly the 3rd qualifying day (index 2), never drifting
      unlocked_at: activeDaysCount >= 3 ? sortedActiveDays[2] : null,
      evidence: activeDaysCount >= 3
        ? `Active across ${activeDaysCount} distinct calendar days`
        : null
    },
    {
      id: 'distinction_scholar',
      title: 'Distinction Scholar',
      desc: 'Achieved a distinction score of 90%+ on any official evaluation.',
      category: 'Mastery',
      icon: 'Award',
      color: '#E11D48',
      bg: '#FFF1F2',
      current: distinctionAttempts.length,
      target: 1,
      progress_percent: Math.min(100, Math.round((distinctionAttempts.length / 1) * 100)),
      unlocked: distinctionAttempts.length >= 1,
      unlocked_at: distinctionAttempts.length > 0
        ? (distinctionAttempts[0].completedAt || distinctionAttempts[0].attemptedAt || null)
        : null,
      evidence: distinctionAttempts.length > 0
        ? `Achieved distinction score of ${distinctionAttempts[0].score}%`
        : null
    },
    {
      id: 'competency_master',
      title: 'Grandmaster of Statistics',
      desc: 'Achieved Level 4 or Level 5 Advanced/Expert status across 2 or more core competency domains.',
      category: 'Leadership',
      icon: 'Landmark',
      color: '#64748B',
      bg: '#F1F5F9',
      current: expertCompetencies.length,
      target: 2,
      progress_percent: Math.min(100, Math.round((expertCompetencies.length / 2) * 100)),
      unlocked: expertCompetencies.length >= 2,
      unlocked_at: expertCompetencies.length >= 2
        ? (cDate(expertCompetencies[1]) || null)
        : null,
      evidence: expertCompetencies.length >= 2
        ? `Mastered ${expertCompetencies.length} advanced competencies`
        : null
    }
  ]

  const unlockedCount = achievements.filter((a) => a.unlocked).length

  return {
    summary: {
      total_achievements: achievements.length,
      unlocked_count: unlockedCount,
      completed_courses: completedCourses.length,
      passed_assessments: passedAttempts.length,
      verified_competencies: verifiedCompetencies.length,
      active_learning_days: activeDaysCount
    },
    achievements
  }
}

module.exports = {
  getUserAchievements
}
