import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bot,
  Send,
  Sparkles,
  RotateCcw,
  BookOpen,
  User,
  Check,
  Copy,
  Lightbulb
} from 'lucide-react'
import { getLearningPath } from '../../api/learningPath.api'
import styles from './AiTutorPage.module.css'

// Intelligent MoSPI official statistics knowledge base
const DOMAIN_KNOWLEDGE = {
  sampling: `In official statistics, **Stratified Sampling** divides the population into non-overlapping homogeneous strata (e.g., rural/urban sectors, enterprise size classes) and samples independently from each stratum. This minimizes sampling variance for heterogeneous populations.\n\nIn contrast, **Cluster Sampling** groups the population into primary sampling units (PSUs, like census enumeration blocks or villages). A subset of clusters is randomly chosen and then either fully enumerated or sub-sampled. Cluster sampling dramatically reduces travel costs and field survey overhead, though it introduces a design effect ($Deff > 1$).`,
  nqaf: `The **National Quality Assurance Framework (NQAF)** adheres to UN and ISO guidelines and defines 5 critical dimensions for official data:\n1. **Prerequisites of Quality**: Legal and institutional mandate.\n2. **Integrity & Objectivity**: Professional independence and transparent revision policies.\n3. **Methodological Soundness**: Adherence to international standards (e.g., SNA 2008, ISIC/NIC).\n4. **Accuracy & Reliability**: Rigorous sampling frame design and response error controls.\n5. **Accessibility & Clarity**: Dissemination via public microdata portals (like MoSPI Data Archive).`,
  cpi: `The **Consumer Price Index (CPI)** is compiled by MoSPI using the Modified Laspeyres Price Index formula:\n$$I = \\sum \\left( \\frac{P_t}{P_0} \\times W \\right)$$\nwhere $P_t / P_0$ is the price relative for item $i$, and $W$ is the consumption expenditure weight derived from the nationwide **Household Consumer Expenditure Survey (HCES)**. Weights are compiled separately for Rural, Urban, and Combined series.`,
  gdp: `**Gross Domestic Product (GDP)** compilation in India follows the **UN System of National Accounts (SNA 2008)** framework, estimated via:\n1. **Production Approach**: Gross Value Added (GVA at basic prices) + Product Taxes - Product Subsidies.\n2. **Expenditure Approach**: Private Final Consumption Expenditure (PFCE) + Government Final Consumption Expenditure (GFCE) + Gross Fixed Capital Formation (GFCF) + Net Exports.`,
}

export default function AiTutorChatPage() {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello Officer! I am your KaushalAI AI Learning Tutor. How can I assist you with your statistical competencies, NSSTA curriculum, or survey guidelines today?',
      time: 'Just now',
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const { data: lpData } = useQuery({
    queryKey: ['learningPath'],
    queryFn: getLearningPath,
  })

  const topGaps = lpData?.gapAnalysis?.gaps?.slice(0, 4) || []
  const prompts = [
    'What is stratified sampling vs cluster sampling?',
    'Explain data quality dimensions under NQAF',
    'How are consumer price index weights calculated?',
    'Explain GDP compilation under SNA 2008',
  ]

  const handleSend = (textToSend) => {
    const q = textToSend || input
    if (!q.trim()) return

    const userMsg = { sender: 'user', text: q, time: 'Just now' }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Generate intelligent contextual response
    setTimeout(() => {
      const lower = q.toLowerCase()
      let reply = ''

      if (lower.includes('stratified') || lower.includes('cluster') || lower.includes('sampling')) {
        reply = DOMAIN_KNOWLEDGE.sampling
      } else if (lower.includes('nqaf') || lower.includes('quality') || lower.includes('governance')) {
        reply = DOMAIN_KNOWLEDGE.nqaf
      } else if (lower.includes('cpi') || lower.includes('price') || lower.includes('inflation')) {
        reply = DOMAIN_KNOWLEDGE.cpi
      } else if (lower.includes('gdp') || lower.includes('national accounts') || lower.includes('sna')) {
        reply = DOMAIN_KNOWLEDGE.gdp
      } else {
        reply = `Regarding **"${q}"**:\n\nIn official statistics, this topic is mapped under our core competency framework. To build practical expertise in this area, we recommend reviewing the corresponding iGOT Karmayogi modules and taking the diagnostic practice evaluation in your Assessments section.\n\nWould you like me to generate a personalized practice MCQ on this topic?`
      }

      setMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: reply, time: 'Just now' },
      ])
      setIsTyping(false)
    }, 700)
  }

  const clearChat = () => {
    setMessages([
      {
        sender: 'assistant',
        text: 'Conversation cleared. How else can I assist your statistical learning journey?',
        time: 'Just now',
      },
    ])
  }

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb & Header ────────────────────────────── */}
      <div className={styles.pageHeader} style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className={styles.headerIconBadge}>
            <Bot size={24} />
          </div>
          <div className={styles.headerText}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B', marginBottom: 2 }}>
              <Link to="/dashboard" style={{ color: '#64748B', textDecoration: 'none' }}>Dashboard</Link>
              <span>›</span>
              <Link to="/ai-tutor" style={{ color: '#64748B', textDecoration: 'none' }}>AI Tutor</Link>
              <span>›</span>
              <span style={{ color: '#1E293B', fontWeight: 600 }}>Chat Interface</span>
            </div>
            <h1 className={styles.title}>AI Tutor Conversation</h1>
            <p className={styles.subtitle}>
              Interactive query assistant for official statistical manuals, sampling designs, and competency guidelines.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={clearChat}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            background: '#ffffff',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 600,
            color: '#475569',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={14} />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* ── Chat Window ────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #E2E8F0',
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          height: 600,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Messages Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '78%',
              }}
            >
              {m.sender === 'assistant' && (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: '#EEF2FF',
                    color: '#4F46E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Bot size={18} />
                </div>
              )}

              <div
                style={{
                  background: m.sender === 'user' ? '#4F46E5' : '#F8FAFC',
                  color: m.sender === 'user' ? '#ffffff' : '#1E293B',
                  border: m.sender === 'user' ? 'none' : '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-line',
                }}
              >
                {m.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748B', fontSize: 12.5 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#EEF2FF',
                  color: '#4F46E5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={16} />
              </div>
              <span>KaushalAI Tutor is reviewing MoSPI manuals...</span>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        <div
          style={{
            padding: '10px 20px',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
          }}
        >
          <Lightbulb size={15} color="#F59E0B" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>
            Suggested Prompts:
          </span>
          {prompts.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(p)}
              style={{
                background: '#ffffff',
                border: '1px solid #CBD5E1',
                borderRadius: 16,
                padding: '4px 12px',
                fontSize: 12,
                color: '#334155',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #E2E8F0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <input
            type="text"
            placeholder="Ask a question about sampling theory, GDP, CPI, or official guidelines..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              flex: 1,
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13.5,
              outline: 'none',
              color: '#0F172A',
            }}
          />
          <button
            type="submit"
            style={{
              background: '#4F46E5',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Send</span>
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  )
}
