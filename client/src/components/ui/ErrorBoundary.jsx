import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 24px',
          maxWidth: 800,
          margin: '40px auto',
          background: 'var(--color-surface, #ffffff)',
          borderRadius: 16,
          border: '1px solid var(--color-border, #e2e8f0)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          textAlign: 'center'
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'var(--color-error, #ef4444)'
          }}>
            <AlertTriangle size={28} />
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary, #0f172a)', marginBottom: 8 }}>
            Component Rendering Error
          </h2>

          <p style={{ fontSize: 13.5, color: 'var(--color-text-secondary, #64748b)', marginBottom: 20, maxWidth: 500, margin: '0 auto 20px' }}>
            An unexpected error occurred while rendering this administrative view. Details are captured below.
          </p>

          <div style={{
            background: '#0f172a',
            color: '#f8fafc',
            padding: '12px 16px',
            borderRadius: 8,
            fontSize: 12,
            fontFamily: 'monospace',
            textAlign: 'left',
            overflowX: 'auto',
            marginBottom: 24,
            maxHeight: 200
          }}>
            <div style={{ color: '#f87171', fontWeight: 600 }}>
              {this.state.error?.toString()}
            </div>
            {this.state.errorInfo?.componentStack && (
              <pre style={{ marginTop: 8, color: '#94a3b8', fontSize: 11, whiteSpace: 'pre-wrap' }}>
                {this.state.errorInfo.componentStack}
              </pre>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 8,
                background: 'var(--color-primary-600, #4f46e5)',
                color: '#ffffff',
                fontSize: 13.5,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={15} /> Reload View
            </button>
            <button
              onClick={() => { window.location.href = '/dashboard' }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 8,
                background: 'var(--color-surface, #ffffff)',
                color: 'var(--color-text-primary, #0f172a)',
                border: '1px solid var(--color-border, #e2e8f0)',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
