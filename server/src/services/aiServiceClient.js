const axios = require('axios')
const FormData = require('form-data')

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? ''

const _client = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 3500, // Fail fast (3.5s) to guarantee dashboard never hangs
  headers: {
    'Content-Type': 'application/json',
    ...(INTERNAL_TOKEN ? { 'X-Internal-Token': INTERNAL_TOKEN } : {}),
  },
})

function _handleError(err, operation) {
  if (
    err.code === 'ECONNREFUSED' ||
    err.code === 'ENOTFOUND' ||
    err.code === 'ETIMEDOUT' ||
    err.code === 'ECONNABORTED' ||
    err.message?.includes('timeout')
  ) {
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
async function generateMCQs({ fileBuffer, filename, mimetype, numQuestions, easyPct, mediumPct, hardPct, topicHint } = {}) {
  const form = new FormData()
  form.append('file', fileBuffer, {
    filename: filename ?? 'upload',
    contentType: mimetype || 'application/octet-stream',
  })

  if (numQuestions != null) form.append('num_questions', String(numQuestions))
  if (easyPct   != null) form.append('easy_pct',      String(easyPct))
  if (mediumPct != null) form.append('medium_pct',    String(mediumPct))
  if (hardPct   != null) form.append('hard_pct',      String(hardPct))
  if (topicHint)         form.append('topic_hint',    topicHint)

  try {
    const { data } = await axios.post(
      `${AI_SERVICE_URL}/internal/mcq/generate`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          ...(INTERNAL_TOKEN ? { 'X-Internal-Token': INTERNAL_TOKEN } : {}),
        },
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
