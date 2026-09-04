import { useState } from 'react'
import { Check } from 'lucide-react'

export default function HelpSupportPage() {
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const faqs = [
    {
      q: 'How are my competency scores and skill gaps calculated?',
      a: 'KaushalAI evaluates your self-assessment levels and quiz assessment performance against the official standard level mandated for your specific MOSPI cadre role (e.g. Statistical Officer, SSS). The gap is the difference between your current level and the required benchmark.',
    },
    {
      q: 'Are iGOT Karmayogi course completions automatically synced?',
      a: 'Yes. Course enrolments and module progress on the iGOT Karmayogi civil services portal are linked to your official email and reflected in your Total Learning Hours and competency milestones.',
    },
    {
      q: 'How do I nominate myself for NSSTA in-person training workshops?',
      a: 'Browse the NSSTA & TPAC Training Calendar under LEARNER navigation, select the programme, and click "Apply for Nomination". Your request is sent to your controlling administrative officer for official forwarding to NSSTA Greater Noida.',
    },
    {
      q: 'Who can upload training materials to generate new quizzes?',
      a: 'Officers designated with Trainer or Admin privileges can upload official manuals (PDF, PPT, DOCX) to automatically generate AI-grounded multiple choice question assessments.',
    },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!feedback.trim()) return
    setSubmitted(true)
    setFeedback('')
    setTimeout(() => setSubmitted(false), 4000)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Help &amp; Official Support Center
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Frequently asked questions, official MOSPI contacts, system documentation, and officer feedback
        </p>
      </div>

      {/* Emergency / Official Contacts Bar */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1.5px solid #dbeafe',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-5)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--color-primary-600)', textTransform: 'uppercase' }}>
            NSSTA Helpdesk
          </span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>support-nssta@mospi.gov.in</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>Mon–Fri, 9:30 AM – 6:00 PM IST</div>
        </div>

        <div>
          <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--color-primary-600)', textTransform: 'uppercase' }}>
            iGOT Karmayogi Support
          </span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>helpdesk-igot@karmayogi.gov.in</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>Toll-Free: 1800-111-555</div>
        </div>

        <div>
          <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--color-primary-600)', textTransform: 'uppercase' }}>
            Platform Documentation
          </span>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 2 }}>Official User Handbook</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>Version 2.4 (August 2026)</div>
        </div>
      </div>

      {/* FAQs */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
        }}
      >
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
          Frequently Asked Questions
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {faqs.map((f, i) => (
            <div key={i} style={{ borderBottom: i === faqs.length - 1 ? 'none' : '1px solid var(--color-border)', paddingBottom: i === faqs.length - 1 ? 0 : 'var(--space-4)' }}>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                {f.q}
              </h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 4, lineHeight: 1.6 }}>
                {f.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Officer Feedback Form */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
        }}
      >
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Submit Technical Query or Feedback
        </h3>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2, marginBottom: 'var(--space-4)' }}>
          Have an issue or suggestion for improving the official competency framework? Let our support team know.
        </p>

        {submitted && (
          <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-lg)', color: '#065f46', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Check size={14} strokeWidth={2.5} />
            <span>Your feedback has been registered under reference #MOSPI-SUPPORT-2026.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <textarea
            rows={4}
            placeholder="Describe your question or feedback in detail..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-surface)',
              fontSize: 'var(--text-sm)',
            }}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              style={{
                padding: 'var(--space-2) var(--space-5)',
                background: 'var(--color-primary-600)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Submit Query
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
