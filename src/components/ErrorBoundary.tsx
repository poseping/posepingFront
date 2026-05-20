import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div style={{
        padding: '24px',
        fontFamily: 'monospace',
        fontSize: '13px',
        background: '#fff0f0',
        color: '#c00',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        minHeight: '100vh',
      }}>
        <strong>[디버그] 렌더 에러</strong>{'\n\n'}
        {error.message}{'\n\n'}
        {error.stack}
      </div>
    )
  }
}
