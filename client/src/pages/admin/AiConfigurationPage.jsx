import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ChevronRight,
  Sliders,
  Cpu,
  ShieldCheck,
  Zap,
  Save,
  Database,
  CheckCircle2,
  RefreshCw,
  BookOpen
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import styles from './AiConfigurationPage.module.css'

export default function AiConfigurationPage() {
  const [activeTab, setActiveTab] = useState('model')
  const [model, setModel] = useState('gemini-2.5-flash')
  const [temperature, setTemperature] = useState(0.2)
  const [topP, setTopP] = useState(0.85)
  const [maxTokens, setMaxTokens] = useState(2048)
  const [systemPrompt, setSystemPrompt] = useState(
    `You are KaushalAI Tutor, the institutional statistical capability assistant for the Ministry of Statistics and Programme Implementation (MoSPI), Government of India.\n\nGround all technical statistical responses in official frameworks:\n- System of National Accounts (SNA 2008)\n- NSS 78th Round Multi-Stage Stratified Sampling Methodologies\n- UN National Quality Assurance Framework (UN-NQAF)\n- MoSPI Consumer Price Index (CPI) Compilation Manuals\n\nDo not invent non-standard statistical notations. Always provide verified mathematical formulas for estimators and sampling variances.`
  )
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      alert('AI Configuration & System Prompt Guardrails successfully committed to active KaushalAI runtime!')
    }, 800)
  }

  // RAG indices
  const ragSources = [
    { name: 'SNA 2008 System of National Accounts Official Handbook', chunks: 1420, updated: '01 Sep 2026', status: 'Active Vector Index' },
    { name: 'NSS Concepts and Definitions (78th Round Instruction Manual)', chunks: 980, updated: '28 Aug 2026', status: 'Active Vector Index' },
    { name: 'UN-NQAF United Nations Quality Assurance Framework Manual', chunks: 640, updated: '20 Aug 2026', status: 'Active Vector Index' },
    { name: 'MoSPI CPI Manual on Methodology of Base 2012=100', chunks: 512, updated: '15 Aug 2026', status: 'Active Vector Index' },
  ]

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link to="/dashboard">Dashboard</Link>
        <ChevronRight size={13} />
        <Link to="/admin">Admin Governance</Link>
        <ChevronRight size={13} />
        <span className={styles.breadcrumbActive}>AI Model Configuration</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Generative AI Model &amp; Statistical Prompt Governance</h1>
          <p className={styles.subtitle}>
            Configure underlying LLM models (Gemini 2.5 Pro / Flash, Local On-Premise NIC LLM), prompt grounding rules, temperature parameters, and statistical nomenclature guardrails
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link to="/ai-tutor" className={styles.btnSecondary}>
            <Sparkles size={15} /> Test AI Tutor
          </Link>
          <button type="button" onClick={handleSave} disabled={isSaving} className={styles.btnPrimary}>
            <Save size={15} /> {isSaving ? 'Saving Configuration...' : 'Save AI Parameters'}
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <Cpu size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Active Foundation Model</div>
            <div className={styles.kpiValue}>Gemini 2.5 Flash</div>
            <div className={styles.kpiHelper}>NIC MeitY Cloud Deployed</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <Database size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Grounded Documents</div>
            <div className={styles.kpiValue}>3,552 Chunks</div>
            <div className={styles.kpiHelper}>Official MoSPI Methodologies</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Guardrail Reliability</div>
            <div className={styles.kpiValue}>99.8%</div>
            <div className={styles.kpiHelper}>Zero ungrounded hallucinations</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9' }}>
            <Zap size={20} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Mean Latency</div>
            <div className={styles.kpiValue}>620ms</div>
            <div className={styles.kpiHelper}>Streaming response enabled</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'model' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('model')}
        >
          <Sliders size={16} /> Hyperparameters &amp; Active Model
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'prompts' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('prompts')}
        >
          <Sparkles size={16} /> System Persona &amp; Nomenclature Guardrails
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'rag' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('rag')}
        >
          <Database size={16} /> RAG Vector Index Sources
        </button>
      </div>

      {/* Panels */}
      {activeTab === 'model' && (
        <div className={styles.panelCard}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
            Foundation Model &amp; Inference Hyperparameters
          </div>

          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Selected LLM Architecture</label>
              <select
                className={styles.select}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Recommended: Ultra Fast &amp; Grounded)</option>
                <option value="gemini-2.5-pro">Google Gemini 2.5 Pro (Deep Statistical Rationale)</option>
                <option value="nic-onprem-veda">NIC Veda-14B (On-Premise Gov Air-Gapped)</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Temperature ({temperature}) - Low for Factuality</label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>
                Recommended: 0.15 - 0.25 to prevent statistical hallucinations
              </span>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Top-p Sampling: {topP}</label>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Max Generation Output Tokens</label>
              <input
                type="number"
                className={styles.input}
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'prompts' && (
        <div className={styles.panelCard}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
            Institutional Persona System Prompt &amp; MoSPI Guardrails
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Global Master System Instruction (Injected in All Tutor &amp; Quiz Sessions)</label>
            <textarea
              rows={8}
              className={styles.textarea}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.5 }}
            />
          </div>

          <div style={{ background: 'var(--color-surface-alt)', padding: 14, borderRadius: 10, border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
              Active Nomenclature Validation Rules:
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              <li>Enforce SNA 2008 terminology (Gross Value Added at basic prices, not factor cost).</li>
              <li>Always cite National Sample Survey (NSS) round numbers and sampling multiplier formulas.</li>
              <li>Refuse generation of speculative macroeconomic statistics not published in official MoSPI releases.</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'rag' && (
        <div className={styles.panelCard}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
            RAG Vector Knowledge Base Corpus
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ragSources.map((r, i) => (
              <div key={i} style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--color-text-primary)' }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {r.chunks} Vector Chunks • Last synced: {r.updated}
                  </div>
                </div>
                <Badge variant="success">{r.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
