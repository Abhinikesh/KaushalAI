const axios = require('axios')
const FormData = require('form-data')

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'

const _client = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

function _handleError(err, operation) {
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
    const serviceErr = new Error(
      `AI service unavailable — ${operation} failed. Ensure ai-service is running at ${AI_SERVICE_URL}.`
    )
    serviceErr.status = 503
    throw serviceErr
  }
  if (err.response) {
    const apiErr = new Error(err.response.data?.detail ?? `AI service error during ${operation}`)
    apiErr.status = err.response.status
    throw apiErr
  }
  throw err
}

async function getGapAnalysis(payload) {
  try {
    const { data } = await _client.post('/gap-analysis', payload)
    return data
  } catch (err) {
    _handleError(err, 'gap-analysis')
  }
}

async function getRecommendations(payload) {
  try {
    const { data } = await _client.post('/recommendations', payload)
    return data
  } catch (err) {
    _handleError(err, 'recommendations')
  }
}

/**
 * Forward a multer file buffer to ai-service as a multipart/form-data POST.
 * @param {Buffer} fileBuffer - The file bytes from multer memoryStorage
 * @param {string} originalname - Original filename (used for extension detection)
 * @param {Object} fields - Additional form fields (num_questions, easy_pct, etc.)
 */
async function generateMCQs(fileBuffer, originalname, fields = {}) {
  const form = new FormData()
  form.append('file', fileBuffer, {
    filename: originalname,
    contentType: fields.contentType || 'application/octet-stream',
  })

  // Append optional generation parameters
  const allowed = ['num_questions', 'easy_pct', 'medium_pct', 'hard_pct', 'topic_hint']
  for (const key of allowed) {
    if (fields[key] != null) form.append(key, String(fields[key]))
  }

  try {
    const { data } = await axios.post(
      `${AI_SERVICE_URL}/internal/mcq/generate`,
      form,
      {
        headers: { ...form.getHeaders() },
        timeout: 120000, // LLM generation can take up to 2 minutes
        maxBodyLength: 25 * 1024 * 1024,
      }
    )
    return data
  } catch (err) {
    _handleError(err, 'mcq/generate')
  }
}

module.exports = { getGapAnalysis, getRecommendations, generateMCQs }
