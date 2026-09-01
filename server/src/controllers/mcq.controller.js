const multer = require('multer')
const UploadedMaterial = require('../models/UploadedMaterial')
const Quiz = require('../models/Quiz')
const Question = require('../models/Question')
const { generateMCQs } = require('../services/aiServiceClient')

const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

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

// Wrap multer in a promise so we can use async/await in the controller
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

async function uploadMaterial(req, res, next) {
  try {
    await runMulter(req, res)

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' })
    }

    const {
      num_questions = 10,
      easy_pct = 0.3,
      medium_pct = 0.5,
      hard_pct = 0.2,
      topic_hint,
      tagCompetencyIds,  // optional JSON string or array of competency ObjectId strings
    } = req.body

    // tagCompetencyIds may arrive as a JSON string when sent as a form field
    let parsedTagIds = []
    if (tagCompetencyIds) {
      try {
        parsedTagIds = typeof tagCompetencyIds === 'string'
          ? JSON.parse(tagCompetencyIds)
          : tagCompetencyIds
      } catch {
        return res.status(400).json({ message: 'tagCompetencyIds must be a JSON array of competency IDs.' })
      }
      if (!Array.isArray(parsedTagIds)) {
        return res.status(400).json({ message: 'tagCompetencyIds must be an array.' })
      }
    }

    // Forward to ai-service
    let aiResult
    try {
      aiResult = await generateMCQs(req.file.buffer, req.file.originalname, {
        contentType: req.file.mimetype,
        num_questions: Number(num_questions),
        easy_pct: Number(easy_pct),
        medium_pct: Number(medium_pct),
        hard_pct: Number(hard_pct),
        topic_hint,
      })
    } catch (err) {
      // Translate ai-service errors to clean user-facing messages
      const status = err.status || 500
      const message =
        status === 503
          ? 'AI generation service is currently unavailable. Please try again shortly.'
          : status === 400
          ? err.message
          : 'Could not generate questions from this document. Please try again or use a different file.'
      return res.status(status).json({ message })
    }

    const fileType = EXT_MAP[req.file.mimetype] || 'pdf'

    // Persist material record
    const material = await UploadedMaterial.create({
      uploadedBy: req.user.id,
      filename: req.file.originalname,
      fileType,
      materialId: aiResult.material_id,
      totalChunks: aiResult.total_chunks,
      questionsGenerated: aiResult.questions_generated,
    })

    // Persist quiz
    const quiz = await Quiz.create({
      title: `Quiz: ${req.file.originalname}`,
      materialId: aiResult.material_id,
      uploadedMaterialRef: material._id,
      createdBy: req.user.id,
      questionCount: aiResult.questions.length,
      tagCompetencyIds: parsedTagIds,
    })

    // Persist questions
    const questionDocs = await Question.insertMany(
      aiResult.questions.map((q) => ({
        quizId: quiz._id,
        questionText: q.question,
        options: q.options,
        correctOptionIndex: q.correct_option_index,
        explanation: q.explanation,
        difficulty: q.difficulty,
      }))
    )

    // Link question IDs back to quiz
    quiz.questionIds = questionDocs.map((q) => q._id)
    await quiz.save()

    res.status(201).json({
      quiz: { id: quiz._id, title: quiz.title, questionCount: quiz.questionCount },
      material: { id: material._id, filename: material.filename },
      stats: {
        total_chunks: aiResult.total_chunks,
        questions_generated: aiResult.questions_generated,
        questions_dropped: aiResult.questions_dropped,
        questions_saved: questionDocs.length,
      },
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

async function listQuizzes(req, res, next) {
  try {
    const quizzes = await Quiz.find({})
      .select('title questionCount createdBy tagCompetencyIds createdAt')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean()
    res.json({ quizzes })
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadMaterial, getQuiz, listQuizzes }
