import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

interface SummaryMetricItem {
  label: string
  value: string
  range?: string
  infoText?: string
}

function SummaryMetricInfo({
  label,
  infoText,
}: {
  label: string
  infoText: string
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState<{ left: number; top: number; width: number } | null>(null)

  const updateTooltipPosition = useCallback(() => {
    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const viewportPadding = 12
    const tooltipWidth = Math.min(280, Math.max(220, window.innerWidth - viewportPadding * 2))
    const left = Math.min(
      window.innerWidth - tooltipWidth - viewportPadding,
      Math.max(viewportPadding, rect.right - tooltipWidth)
    )
    const top = rect.bottom + 8

    setTooltipStyle({ left, top, width: tooltipWidth })
  }, [])

  useEffect(() => {
    if (!isOpen) return

    updateTooltipPosition()

    const handleViewportChange = () => updateTooltipPosition()
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)

    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [isOpen, updateTooltipPosition])

  return (
    <div
      className="photo-summary-info"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        className="photo-summary-info__button"
        aria-label={`${label} 설명 보기`}
        aria-expanded={isOpen}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen((current) => !current)}
      >
        i
      </button>
      <div
        className={`photo-summary-info__tooltip${isOpen ? ' is-open' : ''}`}
        role="tooltip"
        style={tooltipStyle ? { left: tooltipStyle.left, top: tooltipStyle.top, width: tooltipStyle.width } : undefined}
      >
        {infoText}
      </div>
    </div>
  )
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
            {metric.infoText && <SummaryMetricInfo label={metric.label} infoText={metric.infoText} />}
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
