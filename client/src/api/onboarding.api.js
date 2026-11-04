import apiClient from './client'

/**
 * Fetch dynamic dropdown options for the onboarding questionnaire:
 * departments, roles (with levels), functional areas, education levels,
 * common certifications, responsibilities, available interests, and competencies.
 */
export async function getOnboardingOptions() {
  const { data } = await apiClient.get('/onboarding/options')
  return data
}

/**
 * Authoritative endpoint: fetch learner's current onboarding state,
 * allowed step number, saved preferences, profile, and assessment status.
 */
export async function getOnboardingState() {
  const { data } = await apiClient.get('/onboarding/state')
  return data
}

/**
 * Save incremental onboarding step data with order validation.
 * @param {number} stepNumber - Step number (1 to 6)
 * @param {object} payload - Step-specific data
 */
export async function saveOnboardingStep(stepNumber, payload) {
  const { data } = await apiClient.put(`/onboarding/step/${stepNumber}`, payload)
  return data
}

/**
 * Final graduation action triggered from Step 6 results screen.
 * Marks onboarding_completed = true in MongoDB.
 */
export async function completeOnboarding() {
  const { data } = await apiClient.post('/onboarding/complete')
  return data
}

/**
 * Retrieve consolidated authoritative assessment results and recommendations
 * for Step 6 of onboarding wizard.
 */
export async function getOnboardingResults() {
  const { data } = await apiClient.get('/onboarding/results')
  return data
}

/**
 * Save onboarding profile data (Backward compatible for Step 3).
 * Auto-derives level (1-5) based on selected role.
 */
export async function saveOnboardingProfile(payload) {
  const { data } = await apiClient.post('/onboarding/profile', payload)
  return data
}
