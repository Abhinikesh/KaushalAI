import apiClient from './client'

/**
 * Fetch authenticated learner's genuine database-backed achievements and metrics.
 * @returns {Promise<{ summary: Object, achievements: Array }>}
 */
export const getMyAchievements = () =>
  apiClient.get('/achievements/my').then((r) => r.data)

export const getAchievements = getMyAchievements

