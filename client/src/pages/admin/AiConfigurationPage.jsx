import { useState } from 'react'
import Badge from '../../components/ui/Badge'

export default function AiConfigurationPage() {
  const [model, setModel] = useState('sentence-transformers/all-MiniLM-L6-v2')
  const [topK, setTopK] = useState(10)
  const [minThreshold, setMinThreshold] = useState(0.65)
  const [saved, setSaved] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ maxWidth: 850, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          AI Microservice &amp; Model Configuration
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Vector embedding model hyper-parameters, similarity thresholds, and inference microservice settings
        </p>
      </div>

      {saved && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-lg)', color: '#065f46', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          ✓ AI parameters updated. Vector index refreshed.
        </div>
      )}

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Semantic Embedding Model
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{ width: '100%', marginTop: 4, padding: 'var(--space-2) var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)' }}
            />
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Dense vector dimension: 384 embeddings</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Recommendation Top-K Cutoff: <strong>{topK} Courses</strong>
              </label>
              <input
                type="range"
                min="5"
                max="25"
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                style={{ width: '100%', marginTop: 8, accentColor: 'var(--color-primary-600)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Min Similarity Threshold: <strong>{minThreshold}</strong>
              </label>
              <input
                type="range"
                min="0.40"
                max="0.90"
                step="0.05"
                value={minThreshold}
                onChange={(e) => setMinThreshold(Number(e.target.value))}
                style={{ width: '100%', marginTop: 8, accentColor: 'var(--color-primary-600)' }}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              Inference Server: <strong>FastAPI port 8000 (Pydantic v2)</strong>
            </span>
            <button
              type="submit"
              style={{
                padding: 'var(--space-2) var(--space-6)',
                background: 'var(--color-primary-600)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Update AI Parameters
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
