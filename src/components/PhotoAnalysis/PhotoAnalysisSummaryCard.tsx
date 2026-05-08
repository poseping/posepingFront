import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import type { ReactNode } from 'react'

interface SummaryMetricItem {
  label: string
  value: string
  range?: string
}

export default function PhotoAnalysisSummaryCard({
  className,
  header,
  status,
  issues = [],
  issueContent,
  metrics,
  warningMessage,
  alerts = [],
  missingLandmarks = [],
  assistantContent,
  footer,
}: {
  className?: string
  header: ReactNode
  status?: string | null
  issues?: string[]
  issueContent?: ReactNode
  metrics: SummaryMetricItem[]
  warningMessage?: string
  alerts?: string[]
  missingLandmarks?: string[]
  assistantContent?: ReactNode
  footer?: ReactNode
}) {
  return (
    <section className={`card${className ? ` ${className}` : ''}`}>
      <div className="photo-summary-header">
        {header}
        <div className="photo-summary-header-meta">
          {status && <span className={`photo-status-chip ${status}`}>{status}</span>}
          {issueContent ?? (issues.length > 0 && (
            <div className="photo-issue-tags photo-issue-tags--header">
              {issues.map((issue) => (
                <span key={issue} className="photo-issue-tag">{issue}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="photo-summary-grid">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            {metric.range && <small className="photo-summary-range">{metric.range}</small>}
          </div>
        ))}
      </div>
      {warningMessage && (
        <div className="photo-message-block photo-message-block--warning">
          <h4>
            <FontAwesomeIcon icon={faTriangleExclamation} />
          </h4>
          <span>{warningMessage}</span>
        </div>
      )}
      {alerts.length > 0 && (
        <div className="photo-message-block">
          <h4>알림</h4>
          <ul>
            {alerts.map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </div>
      )}
      {missingLandmarks.length > 0 && (
        <div className="photo-message-block">
          <h4>보완이 필요한 랜드마크</h4>
          <ul>
            {missingLandmarks.map((landmark) => (
              <li key={landmark}>{landmark}</li>
            ))}
          </ul>
        </div>
      )}
      {assistantContent}
      {footer}
    </section>
  )
}
