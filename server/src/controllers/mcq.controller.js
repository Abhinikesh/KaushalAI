'use strict'

// file-type v16 is CJS-compatible (v17+ is ESM-only)
const { fromBuffer } = require('file-type')
const multer         = require('multer')
const path           = require('path')
const UploadedMaterial = require('../models/UploadedMaterial')
const Quiz           = require('../models/Quiz')
const Question       = require('../models/Question')
const Notification   = require('../models/Notification')
const { generateMCQs }  = require('../services/aiServiceClient')
const { audit }         = require('../services/auditLog.service')

const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

// Magic-byte signatures we accept (from file-type detection, not client header)
const ALLOWED_MAGIC_TYPES = new Set(['pdf', 'pptx', 'docx'])

const EXT_MAP = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Upload a PDF, PPTX, or DOCX.`))
    }
  },
}).single('file')

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

async function getQuiz(req, res, next) {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate({ path: 'questionIds', model: 'Question' })
      .populate('createdBy', 'name email')
      .lean()

    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' })

    res.json({ quiz })
  } catch (err) {
    next(err)
  }
}

async function createQuiz(req, res, next) {
  try {
    const { title, questions: questionsData = [], tagCompetencyIds = [] } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Quiz title is required.' })
    }

    // Insert questions into database
    let questionIds = []
    if (questionsData.length > 0) {
      const createdQuestions = await Question.insertMany(
        questionsData.map((q) => ({
          questionText:       q.questionText || q.question,
          options:            q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
          correctOptionIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
          explanation:        q.explanation || 'Calibrated assessment item.',
          difficulty:         q.difficulty || 'medium',
          sourceType:         'trainer_created',
        }))
      )
      questionIds = createdQuestions.map((q) => q._id)
    }

    const quiz = await Quiz.create({
      title:           title.trim(),
      questionIds,
      questionCount:   questionIds.length,
      createdBy:       req.user.id,
      tagCompetencyIds,
    })

    await audit({
      action: 'QUIZ_CREATED',
      req,
      targetType: 'Quiz',
      targetId:   quiz._id,
      meta: { title: quiz.title, questionCount: questionIds.length },
    })

    res.status(201).json({ quiz })
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadMaterial, getQuiz, listQuizzes, createQuiz }

