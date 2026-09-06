import apiClient from './client'

/**
 * Initiates the 15-question diagnostic assessment for the authenticated user.
 */
export const startDiagnosticTest = async () => {
  const response = await apiClient.post('/assessments/diagnostic/start')
  return response.data
}

/**
 * Submits answers for deterministic server-side grading and competency rating computation.
 * @param {string} attemptId
 * @param {Array<{ question_id: string, selected_option_id: string, time_taken_seconds: number }>} responses
 */
export const submitDiagnosticTest = async (attemptId, responses) => {
  const response = await apiClient.post(`/assessments/diagnostic/${attemptId}/submit`, { responses })
  return response.data
}
