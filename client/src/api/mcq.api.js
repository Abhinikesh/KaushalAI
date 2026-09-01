import apiClient from './client'

export const getQuizList = () =>
  apiClient.get('/quizzes').then((r) => r.data)

export const getQuiz = (quizId) =>
  apiClient.get(`/quizzes/${quizId}`).then((r) => r.data)

export const submitQuizAttempt = (quizId, answers) =>
  apiClient.post(`/quizzes/${quizId}/attempts`, { answers }).then((r) => r.data)

/**
 * Upload a file to generate MCQs via the ai-service.
 * @param {File}   file      - The PDF/PPTX/DOCX file
 * @param {Object} opts      - { numQuestions, easyPct, mediumPct, hardPct, tagCompetencyIds }
 */
export const uploadMaterialForMcq = (file, opts = {}) => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('num_questions', opts.numQuestions ?? 10)
  fd.append('easy_pct',   (opts.easyPct   ?? 0.3).toFixed(2))
  fd.append('medium_pct', (opts.mediumPct ?? 0.5).toFixed(2))
  fd.append('hard_pct',   (opts.hardPct   ?? 0.2).toFixed(2))
  if (opts.tagCompetencyIds?.length) {
    fd.append('tagCompetencyIds', JSON.stringify(opts.tagCompetencyIds))
  }
  return apiClient.post('/materials/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,   // LLM generation can take up to 2 min
  }).then((r) => r.data)
}
