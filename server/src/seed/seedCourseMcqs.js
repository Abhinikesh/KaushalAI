'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { parse } = require('csv-parse/sync')
const mongoose = require('mongoose')

const Quiz = require('../models/Quiz')
const Question = require('../models/Question')
const Competency = require('../models/Competency')
const User = require('../models/User')

const CSV_PATH = path.join(__dirname, 'data', 'course_mcq_dataset.csv')

async function seedCourseMcqs() {
  if (!fs.existsSync(CSV_PATH)) {
    console.warn(`[seedCourseMcqs] CSV file not found at: ${CSV_PATH}`)
    return
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf-8')
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  console.log(`[seedCourseMcqs] Loaded ${records.length} question rows from course_mcq_dataset.csv`)

  // Find admin user or first user for createdBy
  let admin = await User.findOne({ role: { $in: ['admin', 'trainer', 'director'] } })
  if (!admin) {
    admin = await User.findOne({})
  }
  const adminId = admin?._id || new mongoose.Types.ObjectId()

  // Pre-load all competencies into map for quick lookup
  const competencies = await Competency.find({})
  const compMap = new Map()
  for (const c of competencies) {
    compMap.set(c.name.toLowerCase().trim(), c._id)
  }

  // Group records by course_id
  const byCourse = new Map()
  for (const row of records) {
    const cid = row.course_id.trim()
    if (!byCourse.has(cid)) {
      byCourse.set(cid, {
        courseId: cid,
        courseName: row.course_name.trim(),
        rows: [],
      })
    }
    byCourse.get(cid).rows.push(row)
  }

  // Process each course
  for (const [courseId, courseData] of byCourse.entries()) {
    const materialId = `quiz-${courseId.toLowerCase()}-curriculum`
    const title = `${courseData.courseName} - Comprehensive Assessment`

    // Identify unique competencies for this course
    const courseCompIds = new Set()
    for (const r of courseData.rows) {
      const compName = (r.competency || '').toLowerCase().trim()
      if (compMap.has(compName)) {
        courseCompIds.add(compMap.get(compName))
      }
    }

    // Group rows into logical sequential sections
    // Section 1: Initial Assessment (rows with assessment_type = INITIAL)
    // Section 2+: Final Assessment grouped by competency / topic in order
    const sectionMap = new Map()
    const sortedRows = [...courseData.rows].sort((a, b) => {
      const aNum = parseInt(a.question_number, 10) || 0
      const bNum = parseInt(b.question_number, 10) || 0
      return aNum - bNum
    })

    const sectionsSummary = []
    let currentSectionTitle = ''
    let currentSectionQuestions = 0

    for (const r of sortedRows) {
      let secName = ''
      if (r.assessment_type === 'INITIAL') {
        secName = 'Section 1: Baseline & Diagnostic Assessment'
      } else {
        secName = `Section: ${r.competency || 'Core Topics'}`
      }
      r._sectionName = secName

      if (secName !== currentSectionTitle) {
        if (currentSectionTitle) {
          sectionsSummary.push({
            title: currentSectionTitle,
            questionCount: currentSectionQuestions,
          })
        }
        currentSectionTitle = secName
        currentSectionQuestions = 1
      } else {
        currentSectionQuestions++
      }
    }
    if (currentSectionTitle) {
      sectionsSummary.push({
        title: currentSectionTitle,
        questionCount: currentSectionQuestions,
      })
    }

    // Upsert Quiz
    let quiz = await Quiz.findOne({ materialId })
    if (!quiz) {
      quiz = await Quiz.findOne({ title })
    }

    if (!quiz) {
      quiz = new Quiz({
        title,
        materialId,
        courseId,
        domain: getCourseDomain(courseId),
        questionCount: sortedRows.length,
        createdBy: adminId,
        tagCompetencyIds: Array.from(courseCompIds),
        sections: sectionsSummary,
      })
      await quiz.save()
    } else {
      quiz.courseId = courseId
      quiz.domain = getCourseDomain(courseId)
      quiz.sections = sectionsSummary
      quiz.tagCompetencyIds = Array.from(courseCompIds)
      await quiz.save()
    }

    // Delete existing questions for this quiz to keep it cleanly in sync
    await Question.deleteMany({ quizId: quiz._id })

    const questionDocs = sortedRows.map((r, idx) => {
      const correctChar = (r.correct_answer || 'A').trim().toUpperCase()
      const correctIdx = ['A', 'B', 'C', 'D'].indexOf(correctChar)
      const options = [
        { id: 'A', text: r.option_a },
        { id: 'B', text: r.option_b },
        { id: 'C', text: r.option_c },
        { id: 'D', text: r.option_d },
      ]

      const compName = (r.competency || '').toLowerCase().trim()
      const compId = compMap.get(compName) || null

      const diff = (r.difficulty || 'medium').toLowerCase()
      const validDiff = ['easy', 'medium', 'hard'].includes(diff) ? diff : 'medium'

      return {
        quizId: quiz._id,
        courseId,
        text: r.question,
        options,
        correct_option_id: correctChar,
        correctOptionIndex: correctIdx >= 0 ? correctIdx : 0,
        explanation: r.explanation || '',
        difficulty: validDiff,
        competency_id: compId,
        topic: r.topic || '',
        section: r._sectionName || 'Core Curriculum',
        learningObjective: r.learning_objective || '',
        assessmentType: r.assessment_type || 'FINAL',
        questionNumber: parseInt(r.question_number, 10) || idx + 1,
        level: validDiff === 'easy' ? 1 : validDiff === 'medium' ? 2 : 3,
      }
    })

    const createdQuestions = await Question.insertMany(questionDocs)

    quiz.questionIds = createdQuestions.map((q) => q._id)
    quiz.questionCount = createdQuestions.length
    await quiz.save()

    console.log(
      `  ✓ [${courseId}] Seeded "${courseData.courseName}": ${createdQuestions.length} questions across ${sectionsSummary.length} sections.`
    )
  }

  console.log('[seedCourseMcqs] All 6 curriculum course quizzes successfully seeded!')
}

function getCourseDomain(courseId) {
  switch (courseId) {
    case 'C01':
      return 'Data Management & Programming'
    case 'C02':
      return 'Survey Sampling & Methodology'
    case 'C03':
      return 'Macroeconomic Statistics & SNA'
    case 'C04':
      return 'Sustainable Development & Public Policy'
    case 'C05':
      return 'Official Statistical Quality Assurance'
    case 'C06':
      return 'Data Analytics & Executive Dashboards'
    default:
      return 'Official Statistics'
  }
}

// Standalone execution support
if (require.main === module) {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/kaushalai'
  mongoose
    .connect(mongoUri)
    .then(async () => {
      await seedCourseMcqs()
      await mongoose.disconnect()
      process.exit(0)
    })
    .catch((err) => {
      console.error('[seedCourseMcqs] Error:', err)
      process.exit(1)
    })
}

module.exports = seedCourseMcqs
