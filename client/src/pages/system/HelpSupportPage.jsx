import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HelpCircle,
  Building2,
  Mail,
  Phone,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  Check,
  ShieldCheck
} from 'lucide-react'
import styles from './HelpSupportPage.module.css'

export default function HelpSupportPage() {
  const [openFaqIdx, setOpenFaqIdx] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const faqs = [
    {
      q: 'How are my competency scores and skill gaps calculated?',
      a: 'KaushalAI evaluates your self-assessment levels and quiz assessment performance against the official standard level mandated for your specific MoSPI cadre role (e.g. Statistical Officer, SSS). The gap is the difference between your current level and the required benchmark.',
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
    setFeedback('')
    showToast('Your inquiry has been submitted to the MoSPI Training Division.')
  }

  return (
    <div className={styles.pageContainer}>
      {/* ── Breadcrumb & Header ────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbActive}>Help &amp; Support</span>
          </nav>
          <h1 className={styles.title}>Help &amp; Official Support Center</h1>
          <p className={styles.subtitle}>
            Frequently asked questions, official MoSPI contacts, system documentation, and officer feedback.
          </p>
        </div>
      </div>

      {/* ── Contact Channels Grid ──────────────────────────── */}
      <div className={styles.contactsGrid}>
        <div className={styles.contactCard}>
          <div className={styles.contactIconWrap} style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <Building2 size={22} />
          </div>
          <h3 className={styles.contactTitle}>NSSTA Academy Helpdesk</h3>
          <p className={styles.contactDesc}>Knowledge Park II, Greater Noida, UP 201310</p>
          <span className={styles.contactEmail}>nssta@mospi.gov.in</span>
        </div>

        <div className={styles.contactCard}>
          <div className={styles.contactIconWrap} style={{ background: '#ECFDF5', color: '#10B981' }}>
            <Mail size={22} />
          </div>
          <h3 className={styles.contactTitle}>iGOT Integration Team</h3>
          <p className={styles.contactDesc}>Civil services portal syncing &amp; single sign-on support</p>
          <span className={styles.contactEmail}>support@karmayogi.gov.in</span>
        </div>

        <div className={styles.contactCard}>
          <div className={styles.contactIconWrap} style={{ background: '#FAF5FF', color: '#8B5CF6' }}>
            <ShieldCheck size={22} />
          </div>
          <h3 className={styles.contactTitle}>MoSPI IT &amp; Systems</h3>
          <p className={styles.contactDesc}>Khurshid Lal Bhawan, Janpath, New Delhi 110001</p>
          <span className={styles.contactEmail}>it-support@mospi.gov.in</span>
        </div>

        <div className={styles.contactCard}>
          <div className={styles.contactIconWrap} style={{ background: '#FFF7ED', color: '#F97316' }}>
            <Sparkles size={22} />
          </div>
          <h3 className={styles.contactTitle}>KaushalAI Assistant</h3>
          <p className={styles.contactDesc}>24/7 intelligent query resolution &amp; curriculum guide</p>
          <Link to="/ai-tutor" style={{ fontSize: 12, fontWeight: 600, color: '#4F46E5', textDecoration: 'none', marginTop: 'auto' }}>
            Open AI Tutor →
          </Link>
        </div>
      </div>

      {/* ── FAQs Section ───────────────────────────────────── */}
      <div className={styles.faqSection}>
        <h2 className={styles.faqHeading}>Frequently Asked Questions</h2>
        <div className={styles.faqList}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIdx === idx
            return (
              <div
                key={idx}
                className={styles.faqItem}
                onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
              >
                <div className={styles.faqQuestion}>
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
                </div>
                {isOpen && <p className={styles.faqAnswer}>{faq.a}</p>}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Officer Ticket / Feedback Form ─────────────────── */}
      <div className={styles.ticketCard}>
        <h2 className={styles.faqHeading}>Submit Officer Query / Support Ticket</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          Need assistance with cadre mappings, training nomination approvals, or account verification? Submit your inquiry directly.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <textarea
            className={styles.textareaField}
            placeholder="Type your question, cadre feedback, or support issue here..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <button type="submit" className={styles.submitBtn}>
            <Send size={15} />
            <span>Send Message to Support</span>
          </button>
        </form>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#1e293b',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 9999,
          }}
        >
          <Check size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
