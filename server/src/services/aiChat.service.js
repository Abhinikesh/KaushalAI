'use strict'

const axios = require('axios')

/**
 * KaushalAI — AI Chat Service
 * Calls Grok → Gemini → OpenAI in priority order (whichever key is set).
 * Falls back to a rule-based stats answer if no key is configured.
 */

const SYSTEM_PROMPT = `You are KaushalAI Assistant — an expert AI tutor for Indian government officers on the KaushalAI MoSPI learning platform.

Your expertise covers:
- Official statistics and data governance (NSO, MoSPI, iGOT Karmayogi)
- Survey methodology: CPI, IIP, GDP, NSS, PLFS, Census, ASI
- Statistical quality standards: NQAF, NSDS, UN Fundamental Principles
- Data analysis: Python, R, SQL, Power BI for official statistics
- Government HR, competency frameworks, civil services training

Guidelines:
- Always respond in clear, professional English (or Hindi if the user writes in Hindi)
- Use markdown formatting (bold, bullet points) for clarity
- Be concise but thorough — officers are busy professionals
- If asked about something outside official statistics/government learning, gently redirect
- Address the user as "Officer" when appropriate`

async function callGroq(messages) {
  const rawKey = process.env.GROQ_API_KEY || (process.env.GROK_API_KEY?.trim().startsWith('gsk_') ? process.env.GROK_API_KEY : null)
  if (!rawKey || rawKey.trim() === '') throw new Error('GROQ_API_KEY not set')
  const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '')

  const cleanedMessages = (messages || [])
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content.trim(),
    }))

  if (cleanedMessages.length === 0) {
    throw new Error('No non-empty messages provided to Groq')
  }

  const candidateModels = [
    process.env.GROQ_MODEL,
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
  ].filter(Boolean)
  const uniqueModels = [...new Set(candidateModels)]

  let lastError = null

  for (const model of uniqueModels) {
    try {
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...cleanedMessages,
          ],
          temperature: 0.5,
          max_tokens: 1024,
        },
        {
          headers: {
            Authorization: `Bearer ${cleanKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      )

      const text = res.data?.choices?.[0]?.message?.content
      if (text) return text
    } catch (err) {
      lastError = err
      const errDetails = err.response?.data ? JSON.stringify(err.response.data) : err.message
      console.warn(`[AI Chat] groq (${model}) error:`, errDetails)

      if (err.response?.status === 401 || err.response?.status === 403) {
        break
      }
    }
  }

  const detailedMsg = lastError?.response?.data
    ? JSON.stringify(lastError.response.data)
    : lastError?.message || 'Groq call failed'
  throw new Error(`Groq failed: ${detailedMsg}`)
}

async function callGrok(messages) {
  const key = process.env.GROK_API_KEY
  if (!key || key.trim() === '') throw new Error('GROK_API_KEY not set')
  const cleanKey = key.trim().replace(/^["']|["']$/g, '')

  // If this is a Groq key (gsk_...) configured under GROK_API_KEY, pass to Groq handler
  if (cleanKey.startsWith('gsk_')) {
    return callGroq(messages)
  }

  // Filter out empty or whitespace-only messages to prevent 400 Bad Request
  const cleanedMessages = (messages || [])
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content.trim(),
    }))

  if (cleanedMessages.length === 0) {
    throw new Error('No non-empty messages provided to Grok')
  }

  // Supported model candidates for xAI
  const candidateModels = [
    process.env.GROK_MODEL,
    'grok-2-latest',
    'grok-2',
    'grok-2-1212',
    'grok-beta',
  ].filter(Boolean)
  const uniqueModels = [...new Set(candidateModels)]

  let lastError = null

  for (const model of uniqueModels) {
    try {
      const res = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...cleanedMessages,
          ],
          temperature: 0.5,
          max_tokens: 1024,
        },
        {
          headers: {
            Authorization: `Bearer ${cleanKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      )

      const text = res.data?.choices?.[0]?.message?.content
      if (text) return text
    } catch (err) {
      lastError = err
      const errDetails = err.response?.data ? JSON.stringify(err.response.data) : err.message
      console.warn(`[AI Chat] grok (${model}) error:`, errDetails)

      // If invalid API key (401/403), stop trying other models
      if (err.response?.status === 401 || err.response?.status === 403) {
        break
      }
    }
  }

  const detailedMsg = lastError?.response?.data
    ? JSON.stringify(lastError.response.data)
    : lastError?.message || 'Grok call failed'
  throw new Error(`Grok failed: ${detailedMsg}`)
}

async function callGemini(messages) {
  const key = process.env.GEMINI_API_KEY
  if (!key || key.trim() === '') throw new Error('GEMINI_API_KEY not set')
  const cleanKey = key.trim().replace(/^["']|["']$/g, '')

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`

  // Filter out empty messages
  const cleaned = (messages || []).filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
  const combinedPrompt = cleaned.map((m) => `${m.role === 'user' ? 'Officer' : 'Assistant'}: ${m.content}`).join('\n\n')

  const res = await axios.post(
    url,
    {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: combinedPrompt }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
    },
    { timeout: 30000 }
  )

  const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response from Gemini')
  return text
}

async function callOpenAI(messages) {
  const key = process.env.OPENAI_API_KEY
  if (!key || key.trim() === '') throw new Error('OPENAI_API_KEY not set')
  const cleanKey = key.trim().replace(/^["']|["']$/g, '')

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  const cleaned = (messages || []).filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)

  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...cleaned,
      ],
      temperature: 0.5,
      max_tokens: 1024,
    },
    {
      headers: {
        Authorization: `Bearer ${cleanKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  )

  const text = res.data?.choices?.[0]?.message?.content
  if (!text) throw new Error('Empty response from OpenAI')
  return text
}

/**
 * Main chat function — tries providers in order, falls back to rule-based response.
 * @param {Array<{role: 'user'|'assistant', content: string}>} messages - Conversation history
 * @returns {Promise<{reply: string, provider: string}>}
 */
async function chat(messages) {
  const grokKey = process.env.GROK_API_KEY?.trim()
  const groqKey = process.env.GROQ_API_KEY?.trim()
  const isGroqPrimary = !!(groqKey || (grokKey && grokKey.startsWith('gsk_')))

  const providers = isGroqPrimary
    ? [
        { name: 'groq',   fn: callGroq },
        { name: 'grok',   fn: callGrok },
        { name: 'gemini', fn: callGemini },
        { name: 'openai', fn: callOpenAI },
      ]
    : [
        { name: 'grok',   fn: callGrok },
        { name: 'groq',   fn: callGroq },
        { name: 'gemini', fn: callGemini },
        { name: 'openai', fn: callOpenAI },
      ]

  let providerErrorNotice = null

  for (const p of providers) {
    try {
      const reply = await p.fn(messages)
      console.log(`[AI Chat] Responded via ${p.name}`)
      return { reply, provider: p.name }
    } catch (err) {
      if (err.message.includes('not set')) {
        // Key not configured — skip silently
        continue
      }
      console.warn(`[AI Chat] ${p.name} error:`, err.message)
      providerErrorNotice = `${p.name}: ${err.message}`
    }
  }

  // Rule-based fallback when no AI keys are set or API fails
  const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || ''
  return { reply: getRuleBasedResponse(lastMsg, providerErrorNotice), provider: 'fallback' }
}

function getRuleBasedResponse(q, providerErrorNotice = null) {
  // Greetings
  if (/^(hi|hello|hey|namaste|good morning|good afternoon|good evening)\b/i.test(q.trim())) {
    return `**Namaste Officer!**\n\nI am your **KaushalAI Learning Assistant**, dedicated to supporting officers across the Ministry of Statistics and Programme Implementation (MoSPI).\n\nI can assist you with:\n- **Official Statistics**: GDP, CPI, IIP, National Accounts, Sampling Design\n- **Survey Methodologies**: PLFS, ASI, Household Surveys, Census procedures\n- **Quality Frameworks**: NQAF, UN Fundamental Principles\n- **Civil Service Competencies**: Data analysis, e-Governance, workflow optimization\n\nHow may I help with your training or daily operational queries today?`
  }

  // Identity / Status
  if (q.includes('what are you doing') || q.includes('who are you') || q.includes('what can you do') || q.includes('help')) {
    let extraNotice = ''
    if (providerErrorNotice) {
      extraNotice = `\n\n*(Note: Live Grok AI attempted to respond but encountered an issue: ${providerErrorNotice})*`
    }
    return `I am operating as your **KaushalAI Civil Service Tutor**.\n\nMy primary duty is to help you build cadre competencies, prepare for diagnostic assessments, and resolve technical statistical questions aligned with **iGOT Karmayogi** and **MoSPI** guidelines.${extraNotice}`
  }

  if (q.includes('stratified') || q.includes('cluster') || q.includes('sampling')) {
    return `**Stratified vs Cluster Sampling** in Official Statistics:\n\n- **Stratified Sampling** divides the population into non-overlapping homogeneous strata (e.g., rural/urban, enterprise size) and samples independently from each — minimising variance for heterogeneous populations.\n- **Cluster Sampling** groups the population into Primary Sampling Units (PSUs) such as census enumeration blocks. A random subset of clusters is chosen and either fully enumerated or sub-sampled. It reduces field survey costs significantly but introduces a design effect (Deff > 1).\n\nFor more depth, refer to the NSSO sampling manuals available on the MoSPI portal.`
  }
  if (q.includes('nqaf') || q.includes('quality')) {
    return `**National Quality Assurance Framework (NQAF)** — 5 core dimensions:\n\n1. **Prerequisites of Quality** — legal and institutional mandate\n2. **Integrity & Objectivity** — professional independence, transparent revision policies\n3. **Methodological Soundness** — adherence to SNA 2008, ISIC/NIC standards\n4. **Accuracy & Reliability** — sampling frame design, response error controls\n5. **Accessibility & Clarity** — dissemination via public microdata portals\n\nNQAF aligns with UN Fundamental Principles of Official Statistics.`
  }
  if (q.includes('cpi') || q.includes('price') || q.includes('inflation')) {
    return `**Consumer Price Index (CPI)** — MoSPI compiles CPI using the **Modified Laspeyres formula**:\n\nI = Σ (Pₜ/P₀ × W)\n\nwhere Pₜ/P₀ is the price relative for item i, and W is the consumption expenditure weight derived from the **Household Consumer Expenditure Survey (HCES)**.\n\nWeights are compiled separately for Rural, Urban, and Combined series, with the base year currently 2012=100.`
  }
  if (q.includes('gdp') || q.includes('national accounts') || q.includes('sna')) {
    return `**GDP Compilation in India** follows the **UN System of National Accounts (SNA 2008)**:\n\n- **Production Approach**: Gross Value Added (GVA at basic prices) + Product Taxes − Product Subsidies\n- **Expenditure Approach**: PFCE + GFCE + GFCF + Change in Stocks + Net Exports\n- **Income Approach**: Compensation of Employees + Operating Surplus + Mixed Income\n\nNational accounts are compiled by the **National Statistical Office (NSO)**, MoSPI.`
  }

  if (providerErrorNotice) {
    return `Thank you for your inquiry, Officer.\n\nWe attempted to reach the configured AI provider, but received the following response:\n> **${providerErrorNotice}**\n\nPlease verify that your API key has active credits/quota in the **[xAI Console](https://console.x.ai/)** and that the model is accessible.\n\nIn the meantime, feel free to ask about official statistical concepts (CPI, GDP, NQAF, Sampling, PLFS) or review your **Recommended Learning** section.`
  }

  return `Thank you for your inquiry, Officer.\n\nI am currently using the offline knowledge base because the **Grok AI API key** has not been configured in the backend service.\n\n**To enable full live Grok AI capabilities:**\n1. Add \`GROK_API_KEY\` to your backend service environment variables on **Render** (and in \`server/.env\` for local development).\n2. Redeploy or restart the backend server.\n\nIn the meantime, feel free to ask about official statistical concepts (CPI, GDP, NQAF, Sampling, PLFS) or review your **Recommended Learning** section.`
}

module.exports = { chat }
