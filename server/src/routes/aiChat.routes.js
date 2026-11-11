'use strict'

const express = require('express')
const rateLimit = require('express-rate-limit')
const mongoose = require('mongoose')
const { authenticate } = require('../middleware/auth.middleware')
const aiChatService = require('../services/aiChat.service')
const Conversation = require('../models/Conversation')
const Message = require('../models/Message')
const User = require('../models/User')
const LearningPath = require('../models/LearningPath')
const LearningPathItem = require('../models/LearningPathItem')

const router = express.Router()

const { ipKeyGenerator } = require('express-rate-limit')

// Rate-limit chat: 60 messages per user per minute (prevents abuse of API quota)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip || req.socket?.remoteAddress || '127.0.0.1'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many messages. Please slow down.' },
})

/**
 * Helper: Validate ObjectId format
 */
function isValidObjectId(id) {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
}

/**
 * Helper: Safely load lightweight non-sensitive learner context for AI Tutor prompt enrichment.
 * Missing profile or learning path data never blocks chat.
 */
async function loadLearnerContext(userId) {
  try {
    const user = await User.findById(userId)
      .select('department designation jobRoleId')
      .populate('jobRoleId', 'title')
      .lean()

    if (!user) return null

    const context = {}
    if (user.designation) context.designation = user.designation
    if (user.department) context.department = user.department
    if (user.jobRoleId?.title) context.jobRole = user.jobRoleId.title

    const activePath = await LearningPath.findOne({
      user_id: userId,
      status: { $in: ['active', 'in_progress'] },
    })
      .sort({ updatedAt: -1 })
      .select('target_role')
      .lean()

    if (activePath?.target_role) {
      context.targetRole = activePath.target_role
    }

    if (activePath?._id) {
      const items = await LearningPathItem.find({
        learning_path_id: activePath._id,
        status: { $in: ['not_started', 'in_progress'] },
      })
        .sort({ sequence_order: 1 })
        .limit(5)
        .populate('course_id', 'title')
        .lean()

      const titles = items
        .map((it) => it.course_id?.title)
        .filter((t) => typeof t === 'string' && t.trim().length > 0)
      if (titles.length > 0) {
        context.activeCourses = titles
      }
    }

    return Object.keys(context).length > 0 ? context : null
  } catch (err) {
    console.warn('[AI Chat] Non-fatal learner context load issue:', err.message)
    return null
  }
}

/**
 * POST /api/ai/chat
 * Body:
 *   - message: string (the user prompt)
 *   - conversationId?: string (optional, to continue an existing conversation)
 *   - clientMessageId?: string (optional, for client-side idempotency)
 *   - messages?: Array<{role, content}> (legacy compatibility support)
 * Returns: { reply, provider, conversationId, message, assistantMessage }
 */
router.post('/ai/chat', authenticate, chatLimiter, async (req, res, next) => {
  try {
    const { message, conversationId, clientMessageId, messages } = req.body || {}
    const userId = req.user?.id

    // Legacy compatibility path: if caller sends array of messages directly
    if ((!message || typeof message !== 'string' || message.trim() === '') && Array.isArray(messages)) {
      if (messages.length === 0) {
        return res.status(400).json({ message: 'messages array is required' })
      }

      const validMessages = messages
        .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0 && ['user', 'assistant'].includes(m.role))
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 4000) }))

      if (validMessages.length === 0) {
        return res.status(400).json({ message: 'No valid messages provided' })
      }

      const { reply, provider } = await aiChatService.chat(validMessages)
      return res.json({ reply, provider })
    }

    // New persistent chat flow
    const trimmedContent = (typeof message === 'string' ? message : '').trim()
    if (!trimmedContent) {
      return res.status(400).json({ message: 'Message content is required.' })
    }

    if (trimmedContent.length > 8000) {
      return res.status(400).json({ message: 'Message exceeds maximum length of 8000 characters.' })
    }

    let conversation = null

    if (conversationId) {
      if (!isValidObjectId(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation ID format.' })
      }

      // Enforce strict ownership: must match authenticated user
      conversation = await Conversation.findOne({ _id: conversationId, userId })
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found or access denied.' })
      }
    } else {
      // Create new conversation
      const generatedTitle = trimmedContent.length > 60
        ? `${trimmedContent.slice(0, 57)}...`
        : trimmedContent

      conversation = await Conversation.create({
        userId,
        title: generatedTitle,
        status: 'active',
        lastMessageAt: new Date(),
        messageCount: 0,
      })
    }

    const normalizedClientMsgId =
      clientMessageId && typeof clientMessageId === 'string' && clientMessageId.trim()
        ? clientMessageId.trim().slice(0, 128)
        : null

    let userMsgDoc = null
    let addedMessagesCount = 0

    // Idempotency check: if clientMessageId is provided, check if user message already exists
    if (normalizedClientMsgId) {
      const existingUserMsg = await Message.findOne({
        userId,
        conversationId: conversation._id,
        clientMessageId: normalizedClientMsgId,
      })

      if (existingUserMsg) {
        // Find corresponding assistant response
        const existingAssistantMsg = await Message.findOne({
          conversationId: conversation._id,
          createdAt: { $gte: existingUserMsg.createdAt },
          role: 'assistant',
        }).sort({ createdAt: 1 })

        if (existingAssistantMsg) {
          return res.json({
            reply: existingAssistantMsg.content,
            provider: existingAssistantMsg.provider,
            conversationId: conversation._id.toString(),
            message: existingUserMsg,
            assistantMessage: existingAssistantMsg,
            isDuplicate: true,
          })
        }

        // Reuse existing user message if previous attempt stopped before assistant write
        userMsgDoc = existingUserMsg
      }
    }

    // Persist the user message first so queries are never silently lost
    if (!userMsgDoc) {
      userMsgDoc = await Message.create({
        conversationId: conversation._id,
        userId,
        role: 'user',
        content: trimmedContent,
        clientMessageId: normalizedClientMsgId,
      })
      addedMessagesCount += 1
    }

    // Fetch conversation context history (up to last 20 messages for LLM context)
    const [recentHistory, learnerContext] = await Promise.all([
      Message.find({ conversationId: conversation._id })
        .sort({ createdAt: -1, _id: -1 })
        .limit(20)
        .lean(),
      loadLearnerContext(userId),
    ])

    const historyForAi = recentHistory
      .reverse()
      .map((m) => ({
        role: m.role,
        content: m.content.slice(0, 4000),
      }))

    // Call AI provider with fallback
    let aiResult
    try {
      aiResult = await aiChatService.chat(historyForAi, learnerContext)
    } catch (err) {
      console.warn('[AI Chat] Provider generation failure, applying fallback:', err.message)
      aiResult = {
        reply: 'Thank you for your question. I encountered an issue reaching the live language model, but our offline civil service statistical knowledge base is available.',
        provider: 'fallback',
        model: null,
        tokensUsed: null,
      }
    }

    // Validate that reply is non-empty string
    const rawReply = typeof aiResult?.reply === 'string' ? aiResult.reply.trim() : ''
    const replyText = rawReply || 'No response generated. Please ask another question.'
    const providerName = typeof aiResult?.provider === 'string' && aiResult.provider ? aiResult.provider : 'fallback'
    const modelName = typeof aiResult?.model === 'string' && aiResult.model ? aiResult.model : null
    const tokensUsed = typeof aiResult?.tokensUsed === 'number' && !Number.isNaN(aiResult.tokensUsed)
      ? aiResult.tokensUsed
      : null

    // Persist the assistant message
    const assistantMsgDoc = await Message.create({
      conversationId: conversation._id,
      userId,
      role: 'assistant',
      content: replyText,
      provider: providerName,
      model: modelName,
      tokensUsed,
    })
    addedMessagesCount += 1

    // Update conversation metadata atomically
    await Conversation.updateOne(
      { _id: conversation._id },
      {
        $set: { lastMessageAt: new Date() },
        $inc: { messageCount: addedMessagesCount },
      }
    )

    return res.json({
      reply: replyText,
      provider: providerName,
      conversationId: conversation._id.toString(),
      message: userMsgDoc,
      assistantMessage: assistantMsgDoc,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/ai/conversations
 * Returns authenticated user's conversations (paginated, sorted by latest activity)
 */
router.get('/ai/conversations', authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.id
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
    const skip = (page - 1) * limit

    const filter = { userId, status: 'active' }

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(filter),
    ])

    res.json({
      success: true,
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/ai/conversations
 * Explicitly create a new conversation
 */
router.post('/ai/conversations', authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.id
    const rawTitle = (req.body?.title || '').trim()
    const title = rawTitle ? rawTitle.slice(0, 120) : 'New Conversation'

    // Prevent abuse: max 100 active conversations per user
    const count = await Conversation.countDocuments({ userId, status: 'active' })
    if (count >= 100) {
      return res.status(400).json({
        message: 'Maximum conversation limit (100) reached. Please delete old conversations to start new ones.',
      })
    }

    const conversation = await Conversation.create({
      userId,
      title,
      status: 'active',
      lastMessageAt: new Date(),
      messageCount: 0,
    })

    res.status(201).json({
      success: true,
      conversation,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/ai/conversations/:id
 * Retrieve a single conversation
 */
router.get('/ai/conversations/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid conversation ID format.' })
    }

    const conversation = await Conversation.findOne({ _id: id, userId }).lean()
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found or access denied.' })
    }

    res.json({
      success: true,
      conversation,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/ai/conversations/:id/messages
 * Retrieve messages for a conversation (chronological ordering, paginated)
 */
router.get('/ai/conversations/:id/messages', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid conversation ID format.' })
    }

    const conversation = await Conversation.findOne({ _id: id, userId }).lean()
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found or access denied.' })
    }

    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50))
    const before = req.query.before // Optional cursor: message ID or ISO date

    const query = { conversationId: id, userId }
    if (before) {
      if (isValidObjectId(before)) {
        query._id = { $lt: new mongoose.Types.ObjectId(before) }
      } else {
        const beforeDate = new Date(before)
        if (!isNaN(beforeDate.getTime())) {
          query.createdAt = { $lt: beforeDate }
        }
      }
    }

    // Retrieve newest N matching messages, then reverse into chronological order
    const rawRows = await Message.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean()

    const hasMore = rawRows.length > limit
    const messages = (hasMore ? rawRows.slice(0, limit) : rawRows).reverse()

    res.json({
      success: true,
      conversation,
      messages,
      hasMore,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/ai/conversations/:id
 * Update conversation title or metadata
 */
router.patch('/ai/conversations/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid conversation ID format.' })
    }

    const conversation = await Conversation.findOne({ _id: id, userId })
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found or access denied.' })
    }

    if (typeof req.body.title === 'string' && req.body.title.trim()) {
      conversation.title = req.body.title.trim().slice(0, 120)
    }

    if (typeof req.body.pinned === 'boolean') {
      conversation.pinned = req.body.pinned
    }

    await conversation.save()

    res.json({
      success: true,
      conversation,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/ai/conversations/:id
 * Delete a specific conversation and all associated messages
 */
router.delete('/ai/conversations/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid conversation ID format.' })
    }

    const conversation = await Conversation.findOne({ _id: id, userId })
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found or access denied.' })
    }

    // Delete all messages in the conversation belonging to this user
    await Message.deleteMany({ conversationId: id, userId })
    await Conversation.deleteOne({ _id: id, userId })

    res.json({
      success: true,
      message: 'Conversation and messages deleted successfully.',
    })
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/ai/history
 * Explicitly clear all chat conversations and messages for authenticated learner
 */
router.delete('/ai/history', authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.id

    const [msgResult, convResult] = await Promise.all([
      Message.deleteMany({ userId }),
      Conversation.deleteMany({ userId }),
    ])

    res.json({
      success: true,
      message: 'All conversations and chat history deleted successfully.',
      deletedConversations: convResult.deletedCount,
      deletedMessages: msgResult.deletedCount,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/ai/messages/:id
 * Update feedback ('helpful' | 'not-helpful') or bookmark status
 */
router.patch('/ai/messages/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid message ID format.' })
    }

    const message = await Message.findOne({ _id: id, userId })
    if (!message) {
      return res.status(404).json({ message: 'Message not found or access denied.' })
    }

    const { feedback, isSaved } = req.body

    if (feedback !== undefined) {
      if (['helpful', 'not-helpful', null].includes(feedback)) {
        message.feedback = feedback
      }
    }

    if (typeof isSaved === 'boolean') {
      message.isSaved = isSaved
    }

    await message.save()

    res.json({
      success: true,
      message,
    })
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
