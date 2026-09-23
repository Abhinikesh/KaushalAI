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

async function callGrok(messages) {
  const key = process.env.GROK_API_KEY
  if (!key || key.trim() === '') throw new Error('GROK_API_KEY not set')

  const model = process.env.GROK_MODEL || 'grok-2-latest'

  const res = await axios.post(
    'https://api.x.ai/v1/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.5,
      max_tokens: 1024,
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  )

  const text = res.data?.choices?.[0]?.message?.content
  if (!text) throw new Error('Empty response from Grok')
  return text
}

async function callGemini(messages) {
  const key = process.env.GEMINI_API_KEY
  if (!key || key.trim() === '') throw new Error('GEMINI_API_KEY not set')

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`

  // Combine history as a single user prompt for Gemini
  const combinedPrompt = messages.map((m) => `${m.role === 'user' ? 'Officer' : 'Assistant'}: ${m.content}`).join('\n\n')

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

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.5,
      max_tokens: 1024,
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
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
  const providers = [
    { name: 'grok',   fn: callGrok },
    { name: 'gemini', fn: callGemini },
    { name: 'openai', fn: callOpenAI },
  ]

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
    }
  }

  // Rule-based fallback when no AI keys are set
  const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || ''
  return { reply: getRuleBasedResponse(lastMsg), provider: 'fallback' }
}

function getRuleBasedResponse(q) {
  // Greetings
  if (/^(hi|hello|hey|namaste|good morning|good afternoon|good evening)\b/i.test(q.trim())) {
    return `**Namaste Officer!**\n\nI am your **KaushalAI Learning Assistant**, dedicated to supporting officers across the Ministry of Statistics and Programme Implementation (MoSPI).\n\nI can assist you with:\n- **Official Statistics**: GDP, CPI, IIP, National Accounts, Sampling Design\n- **Survey Methodologies**: PLFS, ASI, Household Surveys, Census procedures\n- **Quality Frameworks**: NQAF, UN Fundamental Principles\n- **Civil Service Competencies**: Data analysis, e-Governance, workflow optimization\n\nHow may I help with your training or daily operational queries today?`
  }

  // Identity / Status
  if (q.includes('what are you doing') || q.includes('who are you') || q.includes('what can you do') || q.includes('help')) {
    return `I am currently operating as your **KaushalAI Civil Service Tutor**.\n\nMy primary duty is to help you build cadre competencies, prepare for assessments, and resolve technical statistical questions aligned with **iGOT Karmayogi** and **MoSPI** guidelines.\n\n*Note: To unlock live generative responses with Grok-2, ensure ` + '`GROK_API_KEY`' + ` is configured in your backend environment variables.*`
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
  return `Thank you for your inquiry, Officer.\n\nI am currently using the offline knowledge base because the **Grok AI API key** has not been configured in the backend service.\n\n**To enable full live Grok AI capabilities:**\n1. Add \`GROK_API_KEY\` to your backend service environment variables on **Render** (and in \`server/.env\` for local development).\n2. Redeploy or restart the backend server.\n\nIn the meantime, feel free to ask about official statistical concepts (CPI, GDP, NQAF, Sampling, PLFS) or review your **Recommended Learning** section.`
}

module.exports = { chat }
