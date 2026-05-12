import type { PhotoAnalysisHistoryItem } from '../../services/photoAnalysisApi'

export const PHOTO_NORMAL_RANGES = {
  craniovertebralAngle: '50°보다 작다면 거북목일 수 있어요',
  shoulderSlope: '10°보다 크면 위험해요',
  hipSlope: '7°보다 크면 위험해요',
  asymmetryScore: '5%보다 크면 위험해요',
  spineAlignment: '0.75 이상을 권장해요',
}

export function getNumericMetric(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function formatMetric(value: number | null, suffix = '') {
  if (value === null || Number.isNaN(value)) {
    return '-'
  }

  return `${value.toFixed(1)}${suffix}`
}

export function formatScoreGrade(grade: string | null | undefined) {
  if (grade === 'stable') return '안정적'
  if (grade === 'caution') return '주의'
  if (grade === 'needs_improvement') return '개선 필요'
  return '-'
}

export function getScoreGradeClassName(grade: string | null | undefined) {
  if (grade === 'stable') return 'is-stable'
  if (grade === 'caution') return 'is-caution'
  if (grade === 'needs_improvement') return 'is-needs-improvement'
  return ''
}

export function formatAnalysisMode(mode: PhotoAnalysisHistoryItem['analysis_mode']) {
  if (mode === 'full') {
    return '전신'
  }

  if (mode === 'upper_body_only') {
    return '반신'
  }

  if (mode === 'manual_adjustment_required') {
    return '수동 보정'
  }

  return '-'
}

export function getHistoryDate(item: PhotoAnalysisHistoryItem) {
  return item.saved_at ?? item.analyzed_at ?? item.created_at ?? ''
}

export function formatHistoryDate(item: PhotoAnalysisHistoryItem) {
  const dateValue = getHistoryDate(item)
  const date = dateValue ? new Date(dateValue) : null

  if (!date || Number.isNaN(date.getTime())) {
    return '날짜 정보 없음'
  }

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
