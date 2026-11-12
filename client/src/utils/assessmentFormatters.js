/**
 * Shared truthful formatters for learner assessment history, widgets, and attempt results.
 * Never fabricates fallback dates, durations, or pass statuses.
 */

export function extractIdString(value) {
  if (!value) return null
  if (typeof value === 'object') {
    return value._id ? String(value._id) : null
  }
  const str = String(value).trim()
  return str.length > 0 ? str : null
}

export function formatAttemptDate(dateValue, { includeTime = true } = {}) {
  if (!dateValue) return 'Date unavailable'
  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable'

  const opts = includeTime
    ? {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    : {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }

  try {
    return parsed.toLocaleDateString('en-IN', opts)
  } catch {
    return 'Date unavailable'
  }
}

export function formatDurationSeconds(durationSeconds) {
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds < 0) {
    return null
  }
  const totalSec = Math.round(durationSeconds)
  const hours = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60

  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, '0')}m`
  }
  if (mins > 0) {
    return `${mins}m ${String(secs).padStart(2, '0')}s`
  }
  return `${secs}s`
}

export function getAttemptStatusMeta(item = {}) {
  const status = item.status || 'completed'
  const kind = item.kind || (item.assessmentType === 'diagnostic' ? 'diagnostic' : 'quiz')

  if (status === 'in_progress') {
    return { status: 'in_progress', label: 'In Progress', tone: 'info' }
  }
  if (status === 'expired') {
    return { status: 'expired', label: 'Expired', tone: 'danger' }
  }
  if (kind === 'diagnostic') {
    return { status: 'completed', label: 'Evaluated', tone: 'diagnostic' }
  }

  const scoreVal = typeof item.score === 'number' && Number.isFinite(item.score) ? item.score : null
  const isPassed =
    typeof item.passed === 'boolean'
      ? item.passed
      : scoreVal !== null
        ? scoreVal >= 70
        : null

  if (isPassed === true) {
    return { status: 'completed', label: 'Passed', tone: 'success' }
  }
  if (isPassed === false) {
    return { status: 'completed', label: 'Needs Retake', tone: 'danger' }
  }
  return { status: 'completed', label: 'Completed', tone: 'neutral' }
}

