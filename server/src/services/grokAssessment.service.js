'use strict'

const axios = require('axios')

/**
 * Generates an authoritative, professional fallback interpretation
 * when Grok API is unavailable, not configured, or returns an error.
 * Strictly uses the learner's actual role, scores, and computed gaps.
 */
function generateDeterministicFallbackAnalysis(user, assessmentAttempt, competencies, gaps) {
  const roleName = user.role?.name || user.designation || 'Officer'
  const overallScore = assessmentAttempt.overall_score || 0
  const highGaps = gaps.filter((g) => g.priority === 'high' || g.gap >= 2)
  const medGaps = gaps.filter((g) => g.priority === 'medium' || g.gap === 1)
  const strengths = competencies.filter((c) => c.gap <= 0 || c.current_level >= c.required_level)

  // Executive summary
  let executiveSummary = ''
  if (overallScore >= 75) {
    executiveSummary = `Officer demonstrated strong foundational competence with an overall diagnostic score of ${overallScore}%, meeting or nearing required proficiency across core competencies for ${roleName}.`
  } else if (overallScore >= 50) {
    executiveSummary = `Officer demonstrated developing capability with an overall score of ${overallScore}%. While foundational competencies are established, targeted capacity building is required in ${highGaps.length} critical competency areas to satisfy ${roleName} standards.`
  } else {
    executiveSummary = `Officer's diagnostic assessment indicates an urgent need for focused competency development (score: ${overallScore}%). Priority skill interventions are necessary to close gaps in core functional responsibilities for ${roleName}.`
  }

  // Observed strengths
  const strengthList = strengths.length > 0
    ? strengths.map((s) => `Solid baseline established in ${s.name} (Assessed at Level ${s.current_level} of required Level ${s.required_level}).`)
    : [
        `Active participation in diagnostic evaluation demonstrating awareness of core ${roleName} domains.`,
        `Baseline familiarity with standard departmental processes and operational procedures.`,
      ]

  // Growth areas
  const growthList = highGaps.length > 0
    ? highGaps.map((g) => `Critical competency gap in ${g.competency}: Current Level ${g.current} vs Required Level ${g.target} (${g.gap} level gap).`)
    : medGaps.length > 0
    ? medGaps.map((g) => `Opportunity to reinforce ${g.competency} to achieve full mastery for ${roleName}.`)
    : [`Maintain competency levels through continuous professional development.`]

  // Role readiness verdict
  let roleVerdict = ''
  if (highGaps.length === 0 && overallScore >= 70) {
    roleVerdict = `High readiness for ${roleName} responsibilities. Recommend advanced specialized electives.`
  } else if (highGaps.length <= 2) {
    roleVerdict = `Substantial readiness with targeted gaps. Recommended for immediate bridging courses in ${highGaps.map(g => g.competency).join(', ') || 'priority areas'}.`
  } else {
    roleVerdict = `Foundational phase. Prioritized remedial learning path advised before undertaking high-cadre duties.`
  }

  // Learning focus
  const focusCompNames = highGaps.map((g) => g.competency).slice(0, 2).join(' and ') ||
    medGaps.map((g) => g.competency).slice(0, 2).join(' and ') || 'Advanced MoSPI Frameworks'
  const learningFocus = `Focus immediate learning cycles on ${focusCompNames} before progressing to cross-functional skills.`

  return {
    summary: executiveSummary,
    strengths: strengthList.slice(0, 4),
    growth_areas: growthList.slice(0, 4),
    role_verdict: roleVerdict,
    learning_focus: learningFocus,
    model: 'deterministic-competency-engine',
    generated_at: new Date(),
  }
}

/**
 * Analyzes diagnostic assessment performance via Grok (xAI API).
 * Supplies verified deterministic scores and requests structured insights.
 * Falls back safely to deterministic rule-based analysis on any error.
 */
async function generateAssessmentGrokAnalysis({ user, assessmentAttempt, competencies, gaps }) {
  const roleName = user.role?.name || user.designation || 'Officer'
  const deptName = user.department || 'Ministry of Statistics & Programme Implementation'
  const overallScore = assessmentAttempt.overall_score || 0
  const rawKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY
  if (!rawKey || rawKey.trim() === '') {
    console.log('[GrokAssessmentService] No Groq/Grok API key configured. Generating deterministic competency analysis.')
    return generateDeterministicFallbackAnalysis(user, assessmentAttempt, competencies, gaps)
  }

  const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '')
  const isGroq = cleanKey.startsWith('gsk_') || !!process.env.GROQ_API_KEY
  const endpoint = isGroq
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://api.x.ai/v1/chat/completions'
  const model = isGroq
    ? (process.env.GROQ_MODEL || 'openai/gpt-oss-120b')
    : (process.env.GROK_MODEL || 'grok-2-latest')

  const prompt = `You are KaushalAI Competency Diagnostics AI, evaluating an Indian government officer's diagnostic skill assessment on the MoSPI learning platform.

OFFICER PROFILE:
- Role / Designation: ${roleName}
- Cadre Level: Level ${user.level || 3}
- Department: ${deptName}
- Functional Area: ${user.functional_area?.name || 'Statistical Operations'}
- Experience: ${user.experience_years || 2} years

VERIFIED ASSESSMENT METRICS (DETERMINISTIC - DO NOT CHANGE OR INVENT NUMBERS):
- Overall Assessment Score: ${overallScore}% (${assessmentAttempt.total_correct || 0} / ${assessmentAttempt.total_questions || 15} correct)
- Tested Competency Breakdown:
${competencies.map((c) => `  * ${c.name}: Assessed Level ${c.current_level}/5 (${c.percentage}%), Required Level ${c.required_level}/5 -> Gap: ${c.gap} (${c.priority.toUpperCase()} priority)`).join('\n')}

IDENTIFIED GAPS:
${gaps.map((g) => `  * ${g.competency}: Current Level ${g.current} vs Required Level ${g.target} (Gap: ${g.gap}, Priority: ${g.priority})`).join('\n')}

INSTRUCTIONS:
1. Do NOT invent new scores, course names, or numbers.
2. The provided scores and levels are final and authoritative.
3. Provide an insightful, professional assessment summary tailored to the officer's role.
4. Output MUST be strictly valid JSON without markdown fences (or valid json inside markdown) conforming to this exact structure:
{
  "summary": "2-3 concise sentences professionally interpreting their diagnostic result for their role",
  "strengths": ["Specific strength 1 based on tested areas", "Specific strength 2"],
  "growth_areas": ["Specific critical growth area 1 based on gaps", "Specific critical growth area 2"],
  "role_verdict": "Clear 1-sentence verdict on their role readiness",
  "learning_focus": "Clear recommendation on which skill area to prioritize first"
}

Respond ONLY with valid JSON.`

  try {
    console.log(`[GrokAssessmentService] Calling ${isGroq ? 'Groq' : 'xAI'} (${model}) for assessment interpretation...`)
    const res = await axios.post(
      endpoint,
      {
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert civil service competency assessment evaluator. Respond ONLY with valid JSON conforming to the requested schema.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000, // 20s fail-safe timeout
      }
    )

    const rawContent = res.data?.choices?.[0]?.message?.content
    if (!rawContent) {
      throw new Error('Empty response from Grok API')
    }

    // Clean JSON response (strip markdown fences if present)
    const jsonStr = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(jsonStr)

    // Normalize and validate
    if (!parsed.summary) {
      throw new Error('Malformed JSON: missing summary')
    }

    return {
      summary: String(parsed.summary).trim(),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
      growth_areas: Array.isArray(parsed.growth_areas) ? parsed.growth_areas.map(String) : [],
      role_verdict: String(parsed.role_verdict || '').trim(),
      learning_focus: String(parsed.learning_focus || '').trim(),
      model: model,
      generated_at: new Date(),
    }
  } catch (err) {
    console.warn(`[GrokAssessmentService] Grok API call failed (${err.message}). Using deterministic fallback.`)
    return generateDeterministicFallbackAnalysis(user, assessmentAttempt, competencies, gaps)
  }
}

module.exports = {
  generateAssessmentGrokAnalysis,
  generateDeterministicFallbackAnalysis,
}
