import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import type { ReactNode } from 'react'

interface SummaryMetricItem {
  label: string
  value: string
  range?: string
  infoText?: string
}

export default function PhotoAnalysisSummaryCard({
  className,
  header,
  status,
  issues = [],
  issueContent,
  preGridContent,
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
  preGridContent?: ReactNode
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
      {preGridContent}
      <div className="photo-summary-grid">
        {metrics.map((metric) => (
          <div className={"photo-summary-grid-wrapper"} key={metric.label}>
            <span className={"photo-summary-title"}>{metric.label}</span>
            <strong>{metric.value}</strong>
            {metric.range && <small className="photo-summary-range">{metric.range}</small>}
            {metric.infoText && (
                <div className="photo-summary-info">
                  <button
                      type="button"
                      className="photo-summary-info__button"
                      aria-label={`${metric.label} 설명 보기`}
                  >
                    i
                  </button>
                  <div className="photo-summary-info__tooltip" role="tooltip">
                    {metric.infoText}
                  </div>
                </div>
            )}
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
