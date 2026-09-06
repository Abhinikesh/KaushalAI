import apiClient from './client'

export const getCompetencies = () =>
  apiClient.get('/competencies').then((r) => r.data)

export const getJobRoles = () =>
  apiClient.get('/job-roles').then((r) => r.data)

export const setJobRole = (jobRoleId) =>
  apiClient.put('/users/me/job-role', { jobRoleId }).then((r) => r.data)

export const updateJobRole = setJobRole

export const updateMyCompetency = (competencyId, level) =>
  apiClient.put(`/users/me/competencies/${competencyId}`, { level }).then((r) => r.data)

export const getMyCompetencies = () =>
  apiClient.get('/user-competencies').then((r) => r.data)

export const getUserCompetencies = () =>
  apiClient.get('/user-competencies').then((r) => r.data)

export const getSkillGaps = () =>
  apiClient.get('/skill-gaps').then((r) => r.data)
