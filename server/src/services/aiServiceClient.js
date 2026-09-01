const axios = require('axios')

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'

const _client = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

function _handleError(err, operation) {
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
    const serviceErr = new Error(`AI service unavailable — ${operation} failed. Ensure ai-service is running at ${AI_SERVICE_URL}.`)
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

module.exports = { getGapAnalysis, getRecommendations }
