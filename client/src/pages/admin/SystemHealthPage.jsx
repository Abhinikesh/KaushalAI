import { useState, useEffect } from 'react'
import Badge from '../../components/ui/Badge'

export default function SystemHealthPage() {
  const [healthData, setHealthData] = useState({
    apiStatus: 'HEALTHY',
    apiLatency: '14 ms',
    aiStatus: 'HEALTHY',
    aiModel: 'sentence-transformers/all-MiniLM-L6-v2',
    dbStatus: 'CONNECTED',
    dbLatency: '3 ms',
    redisStatus: 'ACTIVE',
    uptime: '99.98%',
  })

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            System Infrastructure &amp; Microservices Health
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Real-time status of backend API gateways, Python AI vector service, MongoDB, and Redis cache
          </p>
        </div>

        <Badge variant="success">All Systems Operational</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-5)' }}>
        {/* Node.js Service */}
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>Node.js API Server</span>
            <Badge variant="success">Online</Badge>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            Port 5000 • Express API Engine
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span>Latency: <strong>{healthData.apiLatency}</strong></span>
            <span>Uptime: <strong>{healthData.uptime}</strong></span>
          </div>
        </div>

        {/* Python AI Service */}
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>Python AI Microservice</span>
            <Badge variant="success">Online</Badge>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            Port 8000 • FastAPI Vector Engine
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span>Embeddings: <strong>Loaded</strong></span>
            <span>Device: <strong>CPU (Optimized)</strong></span>
          </div>
        </div>

        {/* MongoDB Database */}
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>MongoDB 7 Database</span>
            <Badge variant="success">Connected</Badge>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            Primary Replica Cluster
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span>Ping: <strong>{healthData.dbLatency}</strong></span>
            <span>Collections: <strong>14 Registered</strong></span>
          </div>
        </div>

        {/* Redis Cache */}
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>Redis 7 In-Memory Cache</span>
            <Badge variant="success">Active</Badge>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            Session &amp; Recommendation Cache
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span>Hit Rate: <strong>94.2%</strong></span>
            <span>Memory: <strong>48 MB</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}
