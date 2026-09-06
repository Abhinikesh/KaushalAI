'use strict'

const mongoose = require('mongoose')
const Course = require('../models/Course')
const Competency = require('../models/Competency')
const CourseCompetency = require('../models/CourseCompetency')

/**
 * Ensures CourseCompetency collection is populated and synchronized with courses.
 */
async function syncCourseCompetencies() {
  try {
    const existingCount = await CourseCompetency.countDocuments()
    if (existingCount > 20) {
      return existingCount
    }

    console.log('[CourseCompetencySync] Synchronizing course competency mappings...')

    const allCourses = await Course.find({}).populate('skillTags')
    const allCompetencies = await Competency.find({})
    const compByName = new Map()
    allCompetencies.forEach((c) => compByName.set(c.name.toLowerCase().trim(), c._id))

    // Keyword mapping rules to augment course competency mappings
    const keywordMap = [
      { keywords: ['python', 'programming', 'code'], comp: 'Python' },
      { keywords: ['sql', 'database', 'query'], comp: 'SQL' },
      { keywords: ['visualization', 'charts', 'dashboard'], comp: 'Data Visualization' },
      { keywords: ['visualization', 'interpretation', 'statistics'], comp: 'Data Interpretation' },
      { keywords: ['machine learning', 'ai', 'artificial intelligence'], comp: 'AI/ML' },
      { keywords: ['ai', 'technology', 'emerging'], comp: 'AI/Technology Awareness' },
      { keywords: ['cloud', 'aws', 'meghraj'], comp: 'Cloud Computing' },
      { keywords: ['cybersecurity', 'security awareness'], comp: 'Cybersecurity' },
      { keywords: ['cybersecurity', 'threat', 'incident'], comp: 'Cybersecurity Awareness' },
      { keywords: ['cybersecurity', 'governance', 'ciso', 'iso 27001'], comp: 'Cybersecurity Governance' },
      { keywords: ['privacy', 'dpdp', 'protection', 'confidentiality'], comp: 'Data Privacy' },
      { keywords: ['privacy', 'security', 'information'], comp: 'Information Security' },
      { keywords: ['digital signature', 'electronic record', 'document'], comp: 'Digital Signatures' },
      { keywords: ['document', 'filing', 'scanning', 'records'], comp: 'Digital Documentation' },
      { keywords: ['document', 'handling', 'paper', 'office'], comp: 'Basic Document Handling' },
      { keywords: ['e-governance', 'cpgrams', 'gem', 'pfms', 'portal'], comp: 'Basic e-Governance' },
      { keywords: ['governance', 'digital public infrastructure', 'dpi'], comp: 'Digital Governance' },
      { keywords: ['platform', 'digital platform', 'e-office', 'igot'], comp: 'Government Digital Platforms' },
      { keywords: ['transformation', 'modernization', 're-engineering'], comp: 'Digital Transformation' },
      { keywords: ['transformation strategy', 'enterprise vision'], comp: 'Digital Transformation Strategy' },
      { keywords: ['office', 'excel', 'word', 'spreadsheet', 'productivity'], comp: 'MS Office/Productivity' },
      { keywords: ['data entry', 'validation', 'cleaning', 'auditing'], comp: 'Data Entry & Validation' },
      { keywords: ['project management', 'agile', 'scrum', 'pmp'], comp: 'Project Management' },
      { keywords: ['process management', 'workflow', 'sop', 'bottleneck'], comp: 'Process Management' },
      { keywords: ['process', 'project', 'operations'], comp: 'Project/Process Management' },
      { keywords: ['decision making', 'evidence-based', 'metrics'], comp: 'Data-driven Decision Making' },
      { keywords: ['governance', 'data-driven', 'registry'], comp: 'Data-driven Governance' },
      { keywords: ['policy', 'statutory', 'cag', 'implementation'], comp: 'Policy Implementation' },
      { keywords: ['risk', 'erm', 'disaster recovery', 'continuity'], comp: 'Risk Management' },
      { keywords: ['leadership', 'executive', 'team leading'], comp: 'Leadership' },
      { keywords: ['communication', 'drafting', 'note', 'briefing'], comp: 'Communication' },
      { keywords: ['email', 'correspondence', 'memo'], comp: 'Email & Communication' },
      { keywords: ['email', 'ticketing'], comp: 'Email/Communication' },
      { keywords: ['problem solving', 'root cause', 'troubleshooting'], comp: 'Problem Solving' },
      { keywords: ['analytical reasoning', 'bias', 'statistical reasoning'], comp: 'Analytical Reasoning' },
      { keywords: ['stakeholder', 'inter-ministerial', 'consultation'], comp: 'Stakeholder Management' },
      { keywords: ['change management', 'adkar', 'adoption', 'culture'], comp: 'Change Management' },
      { keywords: ['literacy', 'computer fundamentals', 'browser'], comp: 'Digital Literacy' },
    ]

    let syncCount = 0

    for (const course of allCourses) {
      const addedCompIds = new Set()

      // 1. Existing skillTags on course
      if (Array.isArray(course.skillTags)) {
        for (const tag of course.skillTags) {
          const tId = tag._id || tag
          if (tId && !addedCompIds.has(tId.toString())) {
            addedCompIds.add(tId.toString())
            await CourseCompetency.findOneAndUpdate(
              { course_id: course._id, competency_id: tId },
              { relevance_weight: 1.0 },
              { upsert: true }
            )
            syncCount++
          }
        }
      }

      // 2. Keyword heuristic on title & description
      const fullText = `${course.title} ${course.description || ''}`.toLowerCase()
      for (const rule of keywordMap) {
        const matches = rule.keywords.some((kw) => fullText.includes(kw))
        if (matches) {
          const compId = compByName.get(rule.comp.toLowerCase().trim())
          if (compId && !addedCompIds.has(compId.toString())) {
            addedCompIds.add(compId.toString())
            await CourseCompetency.findOneAndUpdate(
              { course_id: course._id, competency_id: compId },
              { relevance_weight: 0.9 },
              { upsert: true }
            )
            syncCount++

            // Also keep course.skillTags in sync
            if (!course.skillTags.some((st) => (st._id || st).toString() === compId.toString())) {
              course.skillTags.push(compId)
            }
          }
        }
      }

      await course.save()
    }

    console.log(`[CourseCompetencySync] Finished! Synced ${syncCount} course-competency relationships.`)
    return syncCount
  } catch (err) {
    console.error('[CourseCompetencySync] Sync error:', err.message)
    return 0
  }
}

module.exports = {
  syncCourseCompetencies,
}
