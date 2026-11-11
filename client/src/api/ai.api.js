import apiClient from './client'

/**
 * Send a chat message to the KaushalAI AI assistant.
 * Supports both persistent object payload:
 *   { conversationId, message, clientMessageId }
 * and legacy array payload:
 *   [{ role: 'user'|'assistant', content: string }]
 *
 * @param {object|Array} payload
 * @returns {Promise<{reply: string, provider: string, conversationId?: string, message?: object, assistantMessage?: object}>}
 */
export async function sendChatMessage(payload) {
  let body
  if (Array.isArray(payload)) {
    body = { messages: payload }
  } else if (payload && typeof payload === 'object') {
    body = payload
  } else {
    body = { message: String(payload) }
  }

  const { data } = await apiClient.post('/ai/chat', body)
  return data
}

/**
 * Retrieve paginated list of conversations for the authenticated user.
 * @param {{page?: number, limit?: number}} params
 * @returns {Promise<{success: boolean, conversations: Array, pagination: object}>}
 */
export async function listConversations(params = {}) {
  const { data } = await apiClient.get('/ai/conversations', { params })
  return data
}

/**
 * Explicitly create a new conversation.
 * @param {{title?: string}} payload
 * @returns {Promise<{success: boolean, conversation: object}>}
 */
export async function createConversation(payload = {}) {
  const { data } = await apiClient.post('/ai/conversations', payload)
  return data
}

/**
 * Retrieve a specific conversation by ID.
 * @param {string} id
 * @returns {Promise<{success: boolean, conversation: object}>}
 */
export async function getConversation(id) {
  const { data } = await apiClient.get(`/ai/conversations/${id}`)
  return data
}

/**
 * Retrieve messages for a specific conversation.
 * @param {string} id
 * @param {{limit?: number, before?: string}} params
 * @returns {Promise<{success: boolean, conversation: object, messages: Array}>}
 */
export async function getConversationMessages(id, params = {}) {
  const { data } = await apiClient.get(`/ai/conversations/${id}/messages`, { params })
  return data
}

/**
 * Rename or update conversation metadata.
 * @param {string} id
 * @param {{title?: string, pinned?: boolean}} payload
 * @returns {Promise<{success: boolean, conversation: object}>}
 */
export async function updateConversation(id, payload = {}) {
  const { data } = await apiClient.patch(`/ai/conversations/${id}`, payload)
  return data
}

/**
 * Delete an individual conversation and its messages.
 * @param {string} id
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function deleteConversation(id) {
  const { data } = await apiClient.delete(`/ai/conversations/${id}`)
  return data
}

/**
 * Clear all conversation history for the current user.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function clearAllChatHistory() {
  const { data } = await apiClient.delete('/ai/history')
  return data
}

/**
 * Update message feedback (helpful/not-helpful) or bookmark status.
 * @param {string} id
 * @param {{feedback?: string, isSaved?: boolean}} payload
 * @returns {Promise<{success: boolean, message: object}>}
 */
export async function updateMessageFeedback(id, payload = {}) {
  const { data } = await apiClient.patch(`/ai/messages/${id}`, payload)
  return data
}

/**
 * Get the current AI provider status (which keys are configured).
 * @returns {Promise<{providers: object, activeModel: string}>}
 */
export async function getAiStatus() {
  const { data } = await apiClient.get('/ai/status')
  return data
}
