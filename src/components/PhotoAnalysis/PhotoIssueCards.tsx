import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPerson } from '@fortawesome/free-solid-svg-icons'
import { formatMetric } from './photoSummary'

const ISSUE_CARD_CONFIGS = [
  {
    key: 'neck',
    label: '거북목',
    valueLabel: 'CVA 추정값',
    imageSrc: '/assets/img/neck_icon.png',
    className: 'photo-result-issue-card--neck',
    matches: (issue: string) => issue.includes('거북목'),
  },
  {
    key: 'asymmetry',
    label: '좌우비대칭',
    valueLabel: '좌우 비대칭',
    icon: faPerson,
    className: 'photo-result-issue-card--asymmetry',
    matches: (issue: string) => issue.includes('좌우') || issue.includes('비대칭'),
  },
] as const

export function filterFallbackIssues(issues: string[]) {
  return issues.filter((issue) => !ISSUE_CARD_CONFIGS.some((config) => config.matches(issue)))
}

export default function PhotoIssueCards({
  issues,
  craniovertebralAngle,
  asymmetryScore,
}: {
  issues: string[]
  craniovertebralAngle: number | null
  asymmetryScore: number | null
}) {
  return (
    <div className="photo-result-issue-cards">
      {ISSUE_CARD_CONFIGS.map((config) => {
        const matchedIssue = issues.find(config.matches)
        const metricValue =
          config.key === 'neck'
            ? formatMetric(craniovertebralAngle, '°')
            : formatMetric(asymmetryScore, '%')

        return (
          <div
            key={config.key}
            className={`photo-result-issue-card ${config.className}${matchedIssue ? ' is-active' : ''}`}
          >
            <div className="photo-result-issue-card__icon" aria-hidden="true">
              {'imageSrc' in config ? (
                <img src={config.imageSrc} alt="" className="photo-result-issue-card__icon-image" />
              ) : (
                <FontAwesomeIcon icon={config.icon} style={{ padding: '1rem' }} />
              )}
            </div>
            <strong>{config.label}</strong>
            <div className="photo-result-issue-card__value">
              <span>{config.valueLabel}</span>
              <b>{metricValue}</b>
            </div>
          </div>
        )
      })}
    </div>
  )
}
