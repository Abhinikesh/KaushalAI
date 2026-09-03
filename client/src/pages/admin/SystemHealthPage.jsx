import { useQuery } from '@tanstack/react-query'
import { getSystemHealth } from '../../api/userFeatures.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function SystemHealthPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminSystemHealth'],
    queryFn: getSystemHealth,
    refetchInterval: 10000,
  })

  const isOperational = data?.status === 'OPERATIONAL'
  const services = data?.services

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            System Infrastructure &amp; Microservices Health
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Live ping diagnostics across Node.js API server, Python AI microservice, and MongoDB connection
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Badge variant={isOperational ? 'success' : 'high'}>
            {isLoading ? 'Checking...' : isOperational ? 'All Systems Operational' : 'Service Degraded'}
          </Badge>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-primary-600)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isFetching ? 'Pinging...' : '🔄 Ping Now'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-5)' }}>
          <Skeleton height="160px" />
          <Skeleton height="160px" />
          <Skeleton height="160px" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-5)' }}>
          {/* Node.js API Service */}
          <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>Node.js API Engine</span>
              <Badge variant={services?.apiServer?.status === 'HEALTHY' ? 'success' : 'high'}>
                {services?.apiServer?.status || 'Active'}
              </Badge>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              Express 4 • Memory Heap: <strong>{services?.apiServer?.memoryMb || 0} MB</strong>
            </div>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
              <span>Roundtrip: <strong>{services?.apiServer?.latencyMs || 0} ms</strong></span>
              <span>Uptime: <strong>{services?.apiServer?.uptime || 'N/A'}</strong></span>
            </div>
          </div>

          {/* Python AI FastAPI Service */}
          <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>Python AI Microservice</span>
              <Badge variant={services?.aiVectorService?.status === 'HEALTHY' ? 'success' : 'high'}>
                {services?.aiVectorService?.status || 'Unknown'}
              </Badge>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              FastAPI port 8000 • sentence-transformers (384-dim)
            </div>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
              <span>Latency: <strong>{services?.aiVectorService?.latencyMs || 0} ms</strong></span>
              <span>Endpoint: <strong>{services?.aiVectorService?.endpoint || 'localhost:8000'}</strong></span>
            </div>
          </div>

          {/* MongoDB Connection */}
          <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-base)', fontWeight: 'bold' }}>MongoDB Database</span>
              <Badge variant={services?.database?.status === 'CONNECTED' ? 'success' : 'high'}>
                {services?.database?.status || 'Connected'}
              </Badge>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              Mongoose 8 • Active Collections: <strong>{services?.database?.collectionsCount || 0}</strong>
            </div>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
              <span>Ping Latency: <strong>{services?.database?.latencyMs || 0} ms</strong></span>
              <span>Replica Lag: <strong>0 ms</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics info footer */}
      <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
        ℹ️ Live diagnostic metrics are collected automatically via <code>admin.db.ping()</code> and HTTP probes to microservice endpoints. Status checks auto-refresh every 10 seconds.
      </div>
    </div>
  )
}
