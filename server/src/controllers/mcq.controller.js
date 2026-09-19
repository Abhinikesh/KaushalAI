'use strict'

// file-type v16 is CJS-compatible (v17+ is ESM-only)
const { fromBuffer } = require('file-type')
const multer         = require('multer')
const path           = require('path')
const mongoose       = require('mongoose')
const UploadedMaterial = require('../models/UploadedMaterial')
const Quiz           = require('../models/Quiz')
const Question       = require('../models/Question')
const Notification   = require('../models/Notification')
const { generateMCQs }  = require('../services/aiServiceClient')
const { generateMCQs: generateLiveService } = require('../services/aiMcqGenerator.service')
const { audit }         = require('../services/auditLog.service')

const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/octet-stream',
])

// Magic-byte signatures we accept (from file-type detection, not client header)
const ALLOWED_MAGIC_TYPES = new Set(['pdf', 'pptx', 'docx', 'txt'])

const EXT_MAP = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/csv': 'csv',
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ALLOWED_MIMETYPES.has(file.mimetype) || ['.pdf', '.pptx', '.docx', '.txt', '.csv'].includes(ext)) {
      cb(null, true)
    } else {
      cb(null, true) // Be permissive with document files
    }
  },
}).any()

function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const e = new Error(err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds 20MB limit.' : err.message)
        e.status = 400
        reject(e)
      } else if (err) {
        const e = new Error(err.message)
        e.status = 400
        reject(e)
      } else {
        resolve()
      }
    })
  })
}

/**
 * Sanitise the uploaded filename:
 * - Strip directory traversal characters (/ \ .. etc.)
 * - Replace spaces and special chars with underscores
 * - Limit to 80 chars + extension
 * We never use the original filename for storage — only for logging/display.
 */
function sanitiseFilename(original) {
  const ext  = path.extname(original).toLowerCase().replace(/[^a-z0-9.]/g, '')
  const base = path.basename(original, path.extname(original))
    .replace(/\.\./g, '')          // path traversal
    .replace(/[/\\]/g, '')         // directory separators
    .replace(/[^a-zA-Z0-9_\-]/g, '_') // only safe chars
    .slice(0, 80)
  return `${base || 'upload'}${ext}`
}

async function uploadMaterial(req, res, next) {
  try {
    await runMulter(req, res)

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' })
    }

    // ── Magic-byte verification (defense-in-depth against MIME spoofing) ──────
    const detected = await fromBuffer(req.file.buffer)
    // PPTX/DOCX are ZIP-based; file-type returns 'zip' for them — allow it
    const detectedExt = detected?.ext ?? 'unknown'
    if (!ALLOWED_MAGIC_TYPES.has(detectedExt) && detectedExt !== 'zip') {
      await audit({ action: 'UPLOAD_MIME_SPOOF_ATTEMPT', req, meta: { claimed: req.file.mimetype, detected: detectedExt } })
      return res.status(400).json({ message: 'File content does not match its declared type. Upload a real PDF, PPTX, or DOCX.' })
    }

    const safeFilename = sanitiseFilename(req.file.originalname)

    const {
      num_questions = 10,
      easy_pct = 0.3,
      medium_pct = 0.5,
      hard_pct = 0.2,
      tagCompetencyIds: rawTagIds,
    } = req.body

    let tagCompetencyIds = []
    if (rawTagIds) {
      try {
        tagCompetencyIds = typeof rawTagIds === 'string' ? JSON.parse(rawTagIds) : rawTagIds
      } catch {
        tagCompetencyIds = []
      }
    }

    // ── Call ai-service ───────────────────────────────────────────────────────
    const aiResult = await generateMCQs({
      fileBuffer:   req.file.buffer,
      filename:     safeFilename,
      mimetype:     req.file.mimetype,
      numQuestions: parseInt(num_questions, 10),
      easyPct:      parseFloat(easy_pct),
      mediumPct:    parseFloat(medium_pct),
      hardPct:      parseFloat(hard_pct),
    })

    // ── Persist material record ───────────────────────────────────────────────
    const material = await UploadedMaterial.create({
      filename:   safeFilename,
      uploadedBy: req.user.id,
      sizeByes:   req.file.size,
    })

    // ── Persist questions + quiz ──────────────────────────────────────────────
    const questions = await Question.insertMany(
      aiResult.questions.map((q) => ({
        questionText:       q.question,
        options:            q.options,
        correctOptionIndex: q.correct_option_index,
        explanation:        q.explanation,
        difficulty:         q.difficulty,
        sourceType:         'ai_generated',
        sourceMaterialId:   material._id,
      }))
    )

    const quiz = await Quiz.create({
      title:           `Quiz: ${safeFilename}`,
      questionIds:     questions.map((q) => q._id),
      questionCount:   questions.length,
      createdBy:       req.user.id,
      sourceMaterialId: material._id,
      tagCompetencyIds,
    })

    // ── Audit log ─────────────────────────────────────────────────────────────
    await audit({
      action: 'MATERIAL_UPLOADED',
      req,
      targetType: 'Quiz',
      targetId:   quiz._id,
      meta: { filename: safeFilename, questionCount: questions.length },
    })

    // ── Create real Notification ──────────────────────────────────────────────
    Notification.create({
      userId: req.user.id,
      type: 'material_reviewed',
      message: `AI MCQ Generation complete for "${safeFilename}" (${questions.length} questions ready).`,
      relatedId: quiz._id.toString(),
    }).catch(() => {})

    res.status(201).json({
      quiz_id:    quiz._id,
      materialId: material._id,
      questions:  aiResult.questions,
    })
  } catch (err) {
    next(err)
  }
}

async function generateLiveMCQs(req, res, next) {
  try {
    // Check if multipart form with file
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      await runMulter(req, res).catch(() => {})
    }

    const topic = req.body.topic || req.body.subject || 'Data Analysis with Python'
    const numQuestions = parseInt(req.body.num_questions || req.body.numQuestions || 15, 10)
    const difficulty = req.body.difficulty || 'Mix (Easy, Medium, Hard)'

    let questionTypes = { single: true, multiple: true, boolean: false }
    if (req.body.question_types || req.body.questionTypes) {
      const rawTypes = req.body.question_types || req.body.questionTypes
      questionTypes = typeof rawTypes === 'string' ? JSON.parse(rawTypes) : rawTypes
    }

    const uploadedFiles = req.files && req.files.length > 0 
      ? req.files 
      : (req.file ? [req.file] : [])

    const primaryFile = uploadedFiles[0] || null
    const fileBuffer = primaryFile?.buffer || null
    const filename = primaryFile?.originalname || req.body.filename || ''
    const mimetype = primaryFile?.mimetype || ''

    const questions = await generateLiveService({
      topic,
      numQuestions,
      difficulty,
      questionTypes,
      fileBuffer,
      filename,
      mimetype,
      files: uploadedFiles,
    })

    // Extract unique sections in sequential appearance order
    const sectionSet = new Set()
    for (const q of questions) {
      if (q.section) sectionSet.add(q.section)
    }
    const sections = Array.from(sectionSet)

    return res.status(200).json({
      status: 'ok',
      topic,
      total: questions.length,
      sections,
      questions,
    })
  } catch (err) {
    next(err)
  }
}

async function getQuiz(req, res, next) {
  try {
    const id = req.params.id
    let query = {}

    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { _id: id }
    } else {
      query = { $or: [{ materialId: id }, { customId: id }, { slug: id }] }
    }

    let quiz = await Quiz.findOne(query)
      .populate({ path: 'questionIds', model: 'Question' })
      .populate('createdBy', 'name email')
      .lean()

    // If not in DB, search if it is a seeded official curriculum quiz
    if (!quiz) {
      const seeded = await Quiz.findOne({ $or: [{ materialId: id }, { title: new RegExp(id.replace(/-/g, ' '), 'i') }] })
        .populate({ path: 'questionIds', model: 'Question' })
        .populate('createdBy', 'name email')
        .lean()
      if (seeded) quiz = seeded
    }

    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' })

    res.json({ quiz })
  } catch (err) {
    next(err)
  }
}

async function listQuizzes(req, res, next) {
  try {
    const quizzes = await Quiz.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean()

    res.json({ quizzes })
  } catch (err) {
    next(err)
  }
}

async function createQuiz(req, res, next) {
  try {
    const { title, questions: questionsData = [], tagCompetencyIds = [], materialId, domain, difficulty } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Quiz title is required.' })
    }

    const quiz = await Quiz.create({
      title:           title.trim(),
      materialId:      materialId || `ai-gen-${Date.now()}`,
      questionCount:   questionsData.length,
      createdBy:       req.user.id,
      tagCompetencyIds,
    })

    // Insert questions into database with quizId
    let questionIds = []
    if (questionsData.length > 0) {
      const createdQuestions = await Question.insertMany(
        questionsData.map((q) => {
          let opts = ['Option A', 'Option B', 'Option C', 'Option D']
          if (Array.isArray(q.options) && q.options.length > 0) {
            opts = q.options.map((opt) => (typeof opt === 'object' && opt !== null ? opt.text : String(opt)))
            while (opts.length < 4) {
              opts.push(`Option ${String.fromCharCode(65 + opts.length)}`)
            }
            if (opts.length > 4) {
              opts = opts.slice(0, 4)
            }
          }

          let correctIdx = 0
          if (typeof q.correctOptionIndex === 'number' && q.correctOptionIndex >= 0 && q.correctOptionIndex < 4) {
            correctIdx = q.correctOptionIndex
          } else if (typeof q.correctOption === 'string') {
            const letterIdx = ['A', 'B', 'C', 'D'].indexOf(q.correctOption.trim().toUpperCase())
            if (letterIdx >= 0) correctIdx = letterIdx
          }

          let diff = (q.difficulty || 'medium').toLowerCase()
          if (!['easy', 'medium', 'hard'].includes(diff)) {
            diff = 'medium'
          }

          return {
            quizId:             quiz._id,
            questionText:       q.questionText || q.question || 'Assessment question',
            options:            opts,
            correctOptionIndex: correctIdx,
            explanation:        q.explanation || 'Calibrated assessment item.',
            difficulty:         diff,
          }
        })
      )
      questionIds = createdQuestions.map((q) => q._id)
      quiz.questionIds = questionIds
      await quiz.save()
    }

    await audit({
      action: 'QUIZ_CREATED',
      req,
      targetType: 'Quiz',
      targetId:   quiz._id,
      meta: { title: quiz.title, questionCount: questionIds.length },
    })

    const populatedQuiz = await Quiz.findById(quiz._id)
      .populate('questionIds')
      .populate('createdBy', 'name email')
      .lean()

    res.status(201).json({ quiz: populatedQuiz || quiz })
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadMaterial, getQuiz, listQuizzes, createQuiz, generateLiveMCQs }

