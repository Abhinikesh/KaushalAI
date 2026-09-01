/**
 * NSSTA/TPAC Training Programme Adapter
 *
 * Mirrors the iGOT adapter pattern exactly. Swap mock→live by setting
 * COURSE_SOURCE_MODE=live, NSSTA_API_BASE_URL, and NSSTA_API_KEY.
 */

const axios = require('axios')
const Course = require('../../models/Course')

const mockAdapter = {
  async fetchCatalogue() {
    const courses = await Course.find({ source: 'nssta' })
      .populate('skillTags', 'name category')
      .lean()
    return courses.map(_normalise)
  },

  async fetchCourseById(externalCourseId) {
    const course = await Course.findOne({ source: 'nssta', externalCourseId })
      .populate('skillTags', 'name category')
      .lean()
    return course ? _normalise(course) : null
  },

  async syncEnrollmentStatus(userId, externalCourseId) {
    // Stub — real implementation would call NSSTA TPAC API to register completion
    // and trigger certificate generation via their training management system.
    console.log(`[NSSTA adapter] syncEnrollmentStatus stub — user=${userId} course=${externalCourseId}`)
  },
}

const liveAdapter = {
  _client: null,

  _getClient() {
    if (!this._client) {
      const baseURL = process.env.NSSTA_API_BASE_URL
      const apiKey = process.env.NSSTA_API_KEY
      if (!baseURL || !apiKey) {
        throw new Error(
          'COURSE_SOURCE_MODE=live requires NSSTA_API_BASE_URL and NSSTA_API_KEY env vars'
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
    // Real call: GET /tpac/v1/programmes?format=json
    throw new Error('NSSTA live adapter: fetchCatalogue not yet implemented')
  },

  async fetchCourseById(externalCourseId) {
    // Real call: GET /tpac/v1/programmes/:externalCourseId
    throw new Error('NSSTA live adapter: fetchCourseById not yet implemented')
  },

  async syncEnrollmentStatus(userId, externalCourseId) {
    // Real call: POST /tpac/v1/enrollment { userId, programmeId, completionDate }
    throw new Error('NSSTA live adapter: syncEnrollmentStatus not yet implemented')
  },
}

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

function getNsstaAdapter() {
  const mode = process.env.COURSE_SOURCE_MODE ?? 'mock'
  if (mode === 'live') return liveAdapter
  return mockAdapter
}

module.exports = { getNsstaAdapter }
