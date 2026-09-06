import apiClient from './client'

/**
 * Fetch dynamic dropdown options for the onboarding questionnaire:
 * departments, roles (with levels), functional areas, education levels,
 * common certifications, and responsibilities options.
 */
export async function getOnboardingOptions() {
  const { data } = await apiClient.get('/onboarding/options')
  return data
}

/**
 * Save onboarding profile data (Step 1/2/3).
 * Auto-derives level (1-5) based on selected role.
 */
export async function saveOnboardingProfile(payload) {
  const { data } = await apiClient.post('/onboarding/profile', payload)
  return data
}
