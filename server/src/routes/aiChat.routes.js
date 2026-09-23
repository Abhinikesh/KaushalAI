'use strict'

const express    = require('express')
const rateLimit  = require('express-rate-limit')
const { authenticate } = require('../middleware/auth.middleware')
const { chat }   = require('../services/aiChat.service')

const router = express.Router()

// Rate-limit chat: 60 messages per user per minute (prevents abuse of API quota)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many messages. Please slow down.' },
})

/**
 * POST /api/ai/chat
 * Body: { messages: [{role: 'user'|'assistant', content: string}] }
 * Returns: { reply: string, provider: string }
 */
router.post('/ai/chat', authenticate, chatLimiter, async (req, res, next) => {
  try {
    const { messages } = req.body

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'messages array is required' })
    }

    // Validate message structure and cap history at 20 messages to control token usage
    const validMessages = messages
      .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0 && ['user', 'assistant'].includes(m.role))
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 4000) })) // cap per-message length

    if (validMessages.length === 0) {
      return res.status(400).json({ message: 'No valid messages provided' })
    }

    const { reply, provider } = await chat(validMessages)
    res.json({ reply, provider })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/ai/status
 * Returns which AI providers are configured (no keys exposed).
 */
router.get('/ai/status', authenticate, (req, res) => {
  const grokKey = process.env.GROK_API_KEY?.trim() || ''
  const groqKey = process.env.GROQ_API_KEY?.trim() || ''
  const isGroq = !!groqKey || grokKey.startsWith('gsk_')
  const isGrok = !!grokKey && !grokKey.startsWith('gsk_')

  let activeModel = 'fallback (no API key set)'
  if (isGroq) {
    activeModel = `groq (${process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'})`
  } else if (isGrok) {
    activeModel = `grok (${process.env.GROK_MODEL || 'grok-2-latest'})`
  } else if (process.env.GEMINI_API_KEY?.trim()) {
    activeModel = `gemini (${process.env.GEMINI_MODEL || 'gemini-1.5-flash'})`
  } else if (process.env.OPENAI_API_KEY?.trim()) {
    activeModel = `openai (${process.env.OPENAI_MODEL || 'gpt-4o-mini'})`
  }

  res.json({
    providers: {
      groq: isGroq,
      grok: isGrok,
      gemini: !!(process.env.GEMINI_API_KEY?.trim()),
      openai: !!(process.env.OPENAI_API_KEY?.trim()),
      anthropic: !!(process.env.ANTHROPIC_API_KEY?.trim()),
    },
    activeModel,
  })
})

module.exports = router
