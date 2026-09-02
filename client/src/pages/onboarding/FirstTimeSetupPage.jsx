import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

export default function FirstTimeSetupPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [step, setStep] = useState(1)
  const [designation, setDesignation] = useState(user?.designation || 'Statistical Officer')
  const [department, setDepartment] = useState(user?.department || 'Field Operations Division (FOD)')

  const [ratings, setRatings] = useState({
    'Survey Sampling': 3,
    'National Accounts': 2,
    'Data Quality (NQAF)': 3,
    'Statistical Computing': 2,
  })

  const setRating = (k, v) => {
    setRatings((p) => ({ ...p, [k]: v }))
  }

  const handleFinish = () => {
    navigate('/dashboard')
  }

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>🇮🇳</div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Welcome to KaushalAI Onboarding
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Step {step} of 2: Configure your official cadre baseline to unlock personalized AI recommendations
        </p>
      </div>

      <Card style={{ padding: 'var(--space-6)' }}>
        {step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>
              Confirm Official Cadre &amp; Placement
            </h2>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Designation
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Division / Directorate
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-3)' }}>
              <Button onClick={() => setStep(2)}>
                Continue to Skill Baseline →
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>
              Self-Assess Your Current Baseline Proficiency (Levels 1–5)
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              Don&apos;t worry about achieving perfection — this baseline assists our AI recommender in prioritizing your training gap roadmaps.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {Object.entries(ratings).map(([skill, val]) => (
                <div key={skill} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)' }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{skill}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setRating(skill, lvl)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 'var(--radius-md)',
                          border: val === lvl ? '2px solid var(--color-primary-600)' : '1px solid var(--color-border)',
                          background: val === lvl ? 'var(--color-primary-600)' : 'var(--color-surface)',
                          color: val === lvl ? 'white' : 'var(--color-text-primary)',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-3)' }}>
              <Button variant="secondary" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button onClick={handleFinish}>
                Complete Setup &amp; Launch Dashboard 🚀
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
