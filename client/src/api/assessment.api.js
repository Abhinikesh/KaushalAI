import apiClient from './client'

/**
 * Initiates or resumes the 15-question diagnostic assessment for the authenticated user.
 */
export const startDiagnosticTest = async () => {
  const response = await apiClient.post('/assessments/diagnostic/start')
  return response.data
}

/**
 * Progressively autosaves a single answer choice on the server.
 */
export const saveDiagnosticAnswer = async (attemptId, questionId, selectedOptionId, timeTakenSeconds = 0) => {
  const response = await apiClient.post(`/assessments/diagnostic/${attemptId}/save-answer`, {
    question_id: questionId,
    selected_option_id: selectedOptionId,
    time_taken_seconds: timeTakenSeconds,
  })
  return response.data
}

/**
 * Submits answers for deterministic server-side grading and competency rating computation.
 * @param {string} attemptId
 * @param {Array<{ question_id: string, selected_option_id: string, time_taken_seconds: number }>} [responses]
 */
export const submitDiagnosticTest = async (attemptId, responses) => {
  const response = await apiClient.post(`/assessments/diagnostic/${attemptId}/submit`, { responses })
  return response.data
}

/**
 * Retrieves results and AI analysis for a completed diagnostic attempt.
 */
export const getDiagnosticAttemptResults = async (attemptId) => {
  const response = await apiClient.get(`/assessments/attempts/${encodeURIComponent(attemptId)}/results`)
  return response.data
}

