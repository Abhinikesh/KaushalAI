/**
 * iGOT Karmayogi Course Adapter
 *
 * Clean adapter pattern — the two implementations share an identical interface.
 * To go live: set COURSE_SOURCE_MODE=live, IGOT_API_BASE_URL, and IGOT_API_KEY
 * in your environment. No other file needs to change.
 */

const axios = require('axios')
const Course = require('../../models/Course')

// ── Mock implementation (reads your own seeded MongoDB) ───────────────────────
// Simulates the shape that a real iGOT HTTP response would return.

const mockAdapter = {
  async fetchCatalogue() {
    const courses = await Course.find({ source: 'igot' })
      .populate('skillTags', 'name category')
      .lean()
    return courses.map(_normalise)
  },

  async fetchCourseById(externalCourseId) {
    const course = await Course.findOne({ source: 'igot', externalCourseId })
      .populate('skillTags', 'name category')
      .lean()
    return course ? _normalise(course) : null
  },

  async syncEnrollmentStatus(userId, externalCourseId) {
    // Stub — in production this would push a completion event to iGOT via their
    // Progress Update API so the user's profile on the national platform stays in sync.
    console.log(`[iGOT adapter] syncEnrollmentStatus stub — user=${userId} course=${externalCourseId}`)
  },
}

// ── Live implementation (real HTTP client) ────────────────────────────────────
// Fill these in when real iGOT API credentials are available.
// Docs reference: https://igot.gov.in/developer (hypothetical — update when real URL is known)

const liveAdapter = {
  _client: null,

  _getClient() {
    if (!this._client) {
      const baseURL = process.env.IGOT_API_BASE_URL
      const apiKey = process.env.IGOT_API_KEY
      if (!baseURL || !apiKey) {
        throw new Error(
          'COURSE_SOURCE_MODE=live requires IGOT_API_BASE_URL and IGOT_API_KEY env vars'
        )
      }
      this._client = axios.create({
        baseURL,
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        timeout: 10000,
      })
    }
    return this._client
  },

  async fetchCatalogue() {
    // Real call: GET /api/v1/courses?source=kaushalai&limit=100
    throw new Error('iGOT live adapter: fetchCatalogue not yet implemented')
  },

  async fetchCourseById(externalCourseId) {
    // Real call: GET /api/v1/courses/:externalCourseId
    throw new Error('iGOT live adapter: fetchCourseById not yet implemented')
  },

  async syncEnrollmentStatus(userId, externalCourseId) {
    // Real call: POST /api/v1/progress { userId, courseId, status: "completed" }
    throw new Error('iGOT live adapter: syncEnrollmentStatus not yet implemented')
  },
}

// ── Normaliser — maps DB/API shape to a stable internal contract ──────────────

function _normalise(course) {
  return {
    course_id: course._id?.toString() ?? course.externalCourseId,
    title: course.title,
    description: course.description ?? '',
    source: course.source,
    skill_tags: (course.skillTags ?? []).map((t) => (typeof t === 'string' ? t : t.name)),
    difficulty: course.difficulty,
    duration_hours: course.durationHours ?? 0,
    external_course_id: course.externalCourseId,
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

function getCourseAdapter() {
  const mode = process.env.COURSE_SOURCE_MODE ?? 'mock'
  if (mode === 'live') return liveAdapter
  return mockAdapter
}

module.exports = { getCourseAdapter }
