/**
 * Course Thumbnail & Media Resolution Utility
 * Provides unified, prioritized thumbnail resolution across learner & admin interfaces:
 * 1. Explicit course.thumbnailUrl or course.thumbnail
 * 2. First slide image from course.slides or module.slides (for slide-based decks)
 * 3. Official Statistics Awareness Programme (NSSTA / NASA) authentic slide fallback
 * 4. Extracted YouTube video thumbnail
 * 5. YOUTUBE_MAP fallback by ID / externalCourseId
 */

export const YOUTUBE_MAP = {
  'igot-crs-01': 'KgCgpCIOkIs',
  'igot-crs-02': 'Vz8zcKawwEo',
  'igot-crs-03': 'hTnnf9AhDLM',
  'igot-crs-04': 'FUQW44EFmQQ',
  'igot-crs-05': 'B_jQ3DlrVs4',
  'igot-crs-06': 'kCthkqPKySw',
}

/**
 * Resolves a high-quality display thumbnail for any course or enrollment object.
 * @param {Object|string} courseOrEnrollment
 * @returns {string} Thumbnail URL or empty string
 */
export function getCourseThumbnail(courseOrEnrollment) {
  if (!courseOrEnrollment) return ''

  // If passed an enrollment object where course is populated inside courseId
  const course = (courseOrEnrollment.courseId && typeof courseOrEnrollment.courseId === 'object')
    ? courseOrEnrollment.courseId
    : courseOrEnrollment

  if (!course || typeof course !== 'object') return ''

  // 1. Explicit thumbnail URL on course
  if (course.thumbnailUrl && typeof course.thumbnailUrl === 'string' && course.thumbnailUrl.trim()) {
    return course.thumbnailUrl.trim()
  }
  if (course.thumbnail && typeof course.thumbnail === 'string' && course.thumbnail.trim()) {
    return course.thumbnail.trim()
  }

  // 2. Slide image from course slides (e.g. Slide 1 image)
  if (Array.isArray(course.slides) && course.slides.length > 0) {
    const firstWithImg = course.slides.find((s) => s && s.imageUrl && typeof s.imageUrl === 'string' && s.imageUrl.trim())
    if (firstWithImg) return firstWithImg.imageUrl.trim()
  }

  // 3. Slide image from module slides
  if (Array.isArray(course.modules) && course.modules.length > 0) {
    for (const mod of course.modules) {
      if (Array.isArray(mod.slides) && mod.slides.length > 0) {
        const slideWithImg = mod.slides.find((s) => s && s.imageUrl && typeof s.imageUrl === 'string' && s.imageUrl.trim())
        if (slideWithImg) return slideWithImg.imageUrl.trim()
      }
    }
  }

  // 4. Official Statistics Awareness Programme (NSSTA / NASA) fallback
  const cId = String(course._id || course.id || '')
  const title = String(course.title || '')
  if (
    cId === '6a9c77392153d7505fd447a9' ||
    cId === '6a996d6d266163e0a9606c9c' ||
    /Official Statistics Awareness Programme/i.test(title)
  ) {
    return '/slides/nasa-nssta/slide-01.png'
  }

  // 5. YouTube video thumbnail
  if (course.youtubeUrl && typeof course.youtubeUrl === 'string') {
    try {
      const u = new URL(course.youtubeUrl)
      const ytId = u.searchParams.get('v') || u.pathname.split('/').pop()
      if (ytId && ytId.length === 11) {
        return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
      }
    } catch (_) {
      if (/^[a-zA-Z0-9_-]{11}$/.test(course.youtubeUrl)) {
        return `https://img.youtube.com/vi/${course.youtubeUrl}/mqdefault.jpg`
      }
    }
  }

  // 6. YouTube map by externalCourseId or ID
  const mapId = YOUTUBE_MAP[course.externalCourseId] || YOUTUBE_MAP[course._id] || YOUTUBE_MAP[cId]
  if (mapId) {
    return `https://img.youtube.com/vi/${mapId}/mqdefault.jpg`
  }

  return ''
}

/**
 * Checks whether a course is slide-based (interactive slide presentation instead of video).
 */
export function isSlideBasedCourse(course) {
  if (!course) return false
  if (Array.isArray(course.slides) && course.slides.length > 0) return true
  const title = String(course.title || '')
  const cId = String(course._id || course.id || '')
  if (
    cId === '6a9c77392153d7505fd447a9' ||
    cId === '6a996d6d266163e0a9606c9c' ||
    /Official Statistics Awareness Programme/i.test(title)
  ) {
    return true
  }
  return false
}
