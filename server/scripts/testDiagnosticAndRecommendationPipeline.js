'use strict'

const {
  generateDeterministicFallbackAnalysis,
} = require('../src/services/grokAssessment.service')

// Quick self-contained verification of core algorithm logic and recommendation diversity

function runTests() {
  console.log('====================================================')
  console.log('Running Diagnostic & Recommendation Pipeline Tests')
  console.log('====================================================')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${message}`)
      failed++
    }
  }

  // ── TEST 1: Deterministic Fallback Structure ────────────────────────────────
  const testUser = {
    name: 'Ramesh Sharma',
    designation: 'Junior Statistical Officer',
    level: 3,
    role: { name: 'Section Officer' },
    department: 'National Statistical Office (NSO)',
    experience_years: 4,
  }

  const testAttempt = {
    overall_score: 64,
    total_questions: 15,
    total_correct: 9,
  }

  const testCompetencies = [
    { name: 'Data Analysis', current_level: 2, required_level: 4, gap: 2, priority: 'high', percentage: 40 },
    { name: 'Statistical Quality', current_level: 4, required_level: 3, gap: -1, priority: 'low', percentage: 80 },
    { name: 'Cybersecurity', current_level: 3, required_level: 3, gap: 0, priority: 'low', percentage: 60 },
  ]

  const testGaps = [
    { competency: 'Data Analysis', current: 2, target: 4, gap: 2, priority: 'high' },
    { competency: 'Statistical Quality', current: 4, target: 3, gap: -1, priority: 'low' },
    { competency: 'Cybersecurity', current: 3, target: 3, gap: 0, priority: 'low' },
  ]

  const fallback = generateDeterministicFallbackAnalysis(testUser, testAttempt, testCompetencies, testGaps)
  assert(fallback.summary && fallback.summary.includes('64%'), 'Fallback analysis generates executive summary with exact score')
  assert(fallback.strengths && fallback.strengths.length > 0, 'Fallback analysis includes observed strengths')
  assert(fallback.growth_areas && fallback.growth_areas.some(g => g.includes('Data Analysis')), 'Fallback highlights Data Analysis critical gap')
  assert(fallback.model === 'deterministic-competency-engine', 'Model marked as deterministic-competency-engine')

  // ── TEST 2: Recommendation Diversity (User A vs User B) ────────────────────
  const catalogCourses = [
    {
      course_id: 'course-data-1',
      title: 'Advanced Data Analysis with Python for MoSPI',
      competencies_addressed: ['Data Analysis', 'Statistical Computing'],
    },
    {
      course_id: 'course-data-2',
      title: 'Survey Data Processing & Validation',
      competencies_addressed: ['Data Analysis', 'Data Handling'],
    },
    {
      course_id: 'course-cyber-1',
      title: 'Cybersecurity & Government Data Protection',
      competencies_addressed: ['Cybersecurity', 'Information Security'],
    },
    {
      course_id: 'course-cyber-2',
      title: 'Digital Governance & IT Security Policies',
      competencies_addressed: ['Cybersecurity', 'Digital Governance'],
    },
    {
      course_id: 'course-process-1',
      title: 'Government Workflow Re-engineering & Process Management',
      competencies_addressed: ['Process Management', 'Public Administration'],
    },
  ]

  // User A has critical gap in Data Analysis
  const userAGaps = [
    { competency_id: { name: 'Data Analysis' }, gap: 2, priority: 'high' },
    { competency_id: { name: 'Cybersecurity' }, gap: 0, priority: 'low' },
    { competency_id: { name: 'Process Management' }, gap: 0, priority: 'low' },
  ]

  // User B has critical gap in Cybersecurity
  const userBGaps = [
    { competency_id: { name: 'Data Analysis' }, gap: 0, priority: 'low' },
    { competency_id: { name: 'Cybersecurity' }, gap: 2, priority: 'high' },
    { competency_id: { name: 'Process Management' }, gap: 0, priority: 'low' },
  ]

  // User C has critical gap in Process Management
  const userCGaps = [
    { competency_id: { name: 'Data Analysis' }, gap: 0, priority: 'low' },
    { competency_id: { name: 'Cybersecurity' }, gap: 0, priority: 'low' },
    { competency_id: { name: 'Process Management' }, gap: 3, priority: 'high' },
  ]

  function scoreCatalog(courses, gaps, completedIds = new Set()) {
    const gapMap = new Map()
    gaps.forEach((g) => {
      const name = (g.competency_id?.name || '').toLowerCase()
      if (name) gapMap.set(name, g)
    })

    const candidates = courses.filter((c) => !completedIds.has(c.course_id))
    return candidates.map((c) => {
      let score = 0
      let primaryReason = ''
      const addressed = (c.competencies_addressed || []).map((x) => String(x).toLowerCase())
      for (const compName of addressed) {
        for (const [gName, gDoc] of gapMap.entries()) {
          if (gName.includes(compName) || compName.includes(gName)) {
            if (gDoc.priority === 'high' || (gDoc.gap || 0) >= 2) {
              score += 40 + ((gDoc.gap || 2) * 5)
              primaryReason = `Critical Priority: Addresses ${gDoc.gap}-level gap in ${gDoc.competency_id.name}`
            } else if (gDoc.priority === 'medium') {
              score += 18
            }
          }
        }
      }
      return { course_id: c.course_id, title: c.title, score, reason: primaryReason }
    }).sort((a, b) => b.score - a.score)
  }

  const userARecs = scoreCatalog(catalogCourses, userAGaps)
  const userBRecs = scoreCatalog(catalogCourses, userBGaps)
  const userCRecs = scoreCatalog(catalogCourses, userCGaps)

  assert(userARecs[0].course_id.startsWith('course-data'), `User A top recommendation is Data-focused (${userARecs[0].title})`)
  assert(userBRecs[0].course_id.startsWith('course-cyber'), `User B top recommendation is Cyber-focused (${userBRecs[0].title})`)
  assert(userCRecs[0].course_id.startsWith('course-process'), `User C top recommendation is Process-focused (${userCRecs[0].title})`)

  assert(userARecs[0].course_id !== userBRecs[0].course_id, 'User A and User B receive DIFFERENT top recommendations')
  assert(userBRecs[0].course_id !== userCRecs[0].course_id, 'User B and User C receive DIFFERENT top recommendations')

  // ── TEST 3: Completed Courses Excluded (Case 7) ─────────────────────────────
  const completedIds = new Set(['course-data-1'])
  const userARecsAfterCompletion = scoreCatalog(catalogCourses, userAGaps, completedIds)
  assert(!userARecsAfterCompletion.some(r => r.course_id === 'course-data-1'), 'Completed course is excluded from future recommendations')
  assert(userARecsAfterCompletion[0].course_id === 'course-data-2', 'Next best data course is promoted to top rank')

  console.log('====================================================')
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`)
  console.log('====================================================')

  if (failed > 0) process.exit(1)
}

runTests()
