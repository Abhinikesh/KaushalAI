import apiClient from './client'

/**
 * Send a chat message to the KaushalAI AI assistant.
 * @param {Array<{role: 'user'|'assistant', content: string}>} messages - full conversation history
 * @returns {Promise<{reply: string, provider: string}>}
 */
export async function sendChatMessage(messages) {
  const { data } = await apiClient.post('/ai/chat', { messages })
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
