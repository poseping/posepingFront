import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark, faPlus, faDownload, faChevronUp, faChevronDown,
} from '@fortawesome/free-solid-svg-icons'

type Period = '오전' | '오후'

interface QuickPick {
  label: string
  period: Period
  hour: number
}

const QUICK_PICKS: QuickPick[] = [
  { label: '오전 8시', period: '오전', hour: 8 },
  { label: '오전 10시', period: '오전', hour: 10 },
  { label: '오후 1시', period: '오후', hour: 1 },
  { label: '오후 3시', period: '오후', hour: 3 },
  { label: '오후 6시', period: '오후', hour: 6 },
  { label: '오후 9시', period: '오후', hour: 9 },
]

// 1~12 wrap helper. 시(1~12), 분(0~59)
const wrap = (value: number, min: number, max: number) => {
  if (value > max) return min
  if (value < min) return max
  return value
}

export default function MyPreferencesCard() {
  const [times, setTimes] = useState<string[]>(['오후 3:00'])

  const [isAdding, setIsAdding] = useState(false)
  const [period, setPeriod] = useState<Period>('오후')
  const [hour, setHour] = useState(6)
  const [minute, setMinute] = useState(25)
  const [error, setError] = useState('')

  // ESC 키로 닫기
  useEffect(() => {
    if (!isAdding) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClosePicker()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdding])

  const resetPicker = () => {
    setPeriod('오후')
    setHour(6)
    setMinute(25)
    setError('')
  }

  const handleOpenPicker = () => {
    resetPicker()
    setIsAdding(true)
  }

  const handleClosePicker = () => {
    setIsAdding(false)
    resetPicker()
  }

  const handleConfirmAdd = () => {
    const formatted = `${period} ${hour}:${minute.toString().padStart(2, '0')}`
    if (times.includes(formatted)) {
      setError('이미 추가된 시간이에요')
      return
    }
    setTimes(prev => [...prev, formatted])
    handleClosePicker()
  }

  const handleQuickPick = (q: QuickPick) => {
    setPeriod(q.period)
    setHour(q.hour)
    setMinute(0)
    setError('')
  }

  const handleRemoveTime = (idx: number) => {
    setTimes(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <section className="card">
      <p className="mp-kicker">Preferences</p>
      <h3 className="mp-stats-title">알림 및 설정</h3>

      <ul className="mp-pref-list">
        <li className="mp-pref-row">
          <span className="mp-pref-label">자세 측정 알림</span>
          <label className="mp-pref-toggle">
            <input type="checkbox" defaultChecked />
            <span className="mp-pref-toggle__track" />
          </label>
        </li>

        <li className="mp-pref-row">
          <span className="mp-pref-label">알림 시간</span>
          <div className="mp-pref-times">
            {times.map((time, idx) => (
              <button
                key={`${time}-${idx}`}
                type="button"
                className="mp-pref-time-chip"
                onClick={() => handleRemoveTime(idx)}
                aria-label={`${time} 삭제`}
              >
                {time} <FontAwesomeIcon icon={faXmark} />
              </button>
            ))}
            <button type="button" className="mp-pref-time-add" onClick={handleOpenPicker}>
              <FontAwesomeIcon icon={faPlus} /> 시간 추가
            </button>
          </div>
        </li>

        <li className="mp-pref-row">
          <div className="mp-pref-label-group">
            <span className="mp-pref-label">데이터 내보내기</span>
            <span className="mp-pref-sublabel">최근 30일 자세 분석 리포트</span>
          </div>
          <button type="button" className="mp-pref-download">
            <FontAwesomeIcon icon={faDownload} /> PDF 다운로드
          </button>
        </li>
      </ul>

      {/* 시간 추가 모달 */}
      {isAdding && (
        <div className="mp-time-modal" role="dialog" aria-modal="true" aria-label="알림 시간 추가">
          <div className="mp-time-modal__backdrop" onClick={handleClosePicker} />

          <div className="mp-time-modal__content">
            {/* 헤더 */}
            <div className="mp-time-modal__header">
              <div className="mp-time-modal__heading">
                <p className="mp-time-modal__kicker">Add Alarm</p>
                <h3 className="mp-time-modal__title">알림 시간 추가</h3>
                <p className="mp-time-modal__subtitle">자세 측정 알림을 받을 시간을 선택해주세요.</p>
              </div>
              <button
                type="button"
                className="mp-time-modal__close"
                onClick={handleClosePicker}
                aria-label="닫기"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* 오전/오후 segmented toggle */}
            <div className="mp-time-modal__period" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={period === '오전'}
                className={`mp-time-modal__period-btn ${period === '오전' ? 'is-active' : ''}`}
                onClick={() => setPeriod('오전')}
              >
                오전
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={period === '오후'}
                className={`mp-time-modal__period-btn ${period === '오후' ? 'is-active' : ''}`}
                onClick={() => setPeriod('오후')}
              >
                오후
              </button>
            </div>

            {/* 시 / 분 스테퍼 */}
            <div className="mp-time-modal__steppers">
              <div className="mp-time-modal__stepper">
                <button
                  type="button"
                  className="mp-time-modal__stepper-btn"
                  onClick={() => setHour(prev => wrap(prev + 1, 1, 12))}
                  aria-label="시 증가"
                >
                  <FontAwesomeIcon icon={faChevronUp} />
                </button>
                <div className="mp-time-modal__stepper-value">
                  {hour}<small>시</small>
                </div>
                <button
                  type="button"
                  className="mp-time-modal__stepper-btn"
                  onClick={() => setHour(prev => wrap(prev - 1, 1, 12))}
                  aria-label="시 감소"
                >
                  <FontAwesomeIcon icon={faChevronDown} />
                </button>
              </div>

              <div className="mp-time-modal__stepper">
                <button
                  type="button"
                  className="mp-time-modal__stepper-btn"
                  onClick={() => setMinute(prev => wrap(prev + 1, 0, 59))}
                  aria-label="분 증가"
                >
                  <FontAwesomeIcon icon={faChevronUp} />
                </button>
                <div className="mp-time-modal__stepper-value">
                  {minute.toString().padStart(2, '0')}<small>분</small>
                </div>
                <button
                  type="button"
                  className="mp-time-modal__stepper-btn"
                  onClick={() => setMinute(prev => wrap(prev - 1, 0, 59))}
                  aria-label="분 감소"
                >
                  <FontAwesomeIcon icon={faChevronDown} />
                </button>
              </div>
            </div>

            {/* QUICK PICK 섹션 */}
            <div className="mp-time-modal__quick">
              <p className="mp-time-modal__kicker">Quick Pick</p>
              <div className="mp-time-modal__quick-list">
                {QUICK_PICKS.map(q => (
                  <button
                    key={q.label}
                    type="button"
                    className="mp-time-modal__quick-btn"
                    onClick={() => handleQuickPick(q)}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && <p className="mp-time-modal__error">{error}</p>}

            {/* 액션 버튼 */}
            <div className="mp-time-modal__actions">
              <button type="button" className="mp-time-modal__cancel" onClick={handleClosePicker}>
                취소
              </button>
              <button type="button" className="mp-time-modal__confirm" onClick={handleConfirmAdd}>
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
