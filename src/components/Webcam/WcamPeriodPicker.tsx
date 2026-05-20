import { useEffect, useMemo, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { ko } from 'react-day-picker/locale'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faCalendar } from '@fortawesome/free-solid-svg-icons'
import 'react-day-picker/style.css'
import type { WebcamSessionHistoryItem } from '../../services/webcamApi'

interface Props {
  anchor: Date
  onChange: (date: Date) => void
  sessions: WebcamSessionHistoryItem[]
}

function startOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x
}
function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const dow = x.getDay()
  x.setDate(x.getDate() - (dow === 0 ? 6 : dow - 1))
  return x
}
function endOfWeek(d: Date): Date {
  const start = startOfWeek(d)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}
function fmtMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function weeksDiff(later: Date, earlier: Date): number {
  return Math.round((startOfWeek(later).getTime() - startOfWeek(earlier).getTime()) / (7 * 24 * 60 * 60 * 1000))
}
function relativeWeekLabel(weekAnchor: Date, now: Date): string {
  const diff = weeksDiff(now, weekAnchor)
  if (diff === 0) return '이번 주'
  if (diff === 1) return '지난 주'
  if (diff === -1) return '다음 주'
  if (diff > 0) return `${diff}주 전`
  return `${-diff}주 후`
}
function shiftWeek(d: Date, weeks: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + 7 * weeks)
  return x
}

export default function WcamPeriodPicker({ anchor, onChange, sessions }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfWeek(anchor))
  const rootRef = useRef<HTMLDivElement>(null)
  const now = useMemo(() => new Date(), [])

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setView('list')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const handleSelectAnchor = (date: Date) => {
    onChange(date)
    setOpen(false)
    setView('list')
  }

  const weekList = useMemo(() => {
    const items: Array<{ anchor: Date; start: Date; end: Date; relative: string; count: number }> = []
    for (let i = 0; i < 5; i++) {
      const weekAnchor = shiftWeek(now, -i)
      const start = startOfWeek(weekAnchor)
      const end = endOfWeek(weekAnchor)
      const count = sessions.filter(s => {
        const d = new Date(s.started_at)
        return d >= start && d <= end
      }).length
      items.push({
        anchor: weekAnchor,
        start,
        end,
        relative: relativeWeekLabel(weekAnchor, now),
        count,
      })
    }
    return items
  }, [sessions, now])

  const triggerStart = startOfWeek(anchor)
  const triggerEnd = endOfWeek(anchor)
  const triggerRange = `${fmtMD(triggerStart)} - ${fmtMD(triggerEnd)}`
  const triggerRelative = relativeWeekLabel(anchor, now)
  const isNextDisabled = startOfWeek(anchor).getTime() >= startOfWeek(now).getTime()
  const isSameWeek = (a: Date, b: Date) => weeksDiff(a, b) === 0

  const sessionDateObjs = useMemo(() => {
    return Array.from(new Set(sessions.map(s => s.started_at.slice(0, 10))))
      .map(s => {
        const [y, m, d] = s.split('-').map(Number)
        return new Date(y, m - 1, d)
      })
  }, [sessions])

  const selectedWeekRange = useMemo(() => ({
    from: startOfWeek(anchor),
    to: endOfWeek(anchor),
  }), [anchor])

  const today = startOfDay(now)

  return (
    <div className="wcam-period-picker" ref={rootRef}>
      <div className="wcam-period-nav">
        <button
          type="button"
          className="wcam-period-nav__btn"
          onClick={() => onChange(shiftWeek(anchor, -1))}
          aria-label="이전 주"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <button
          type="button"
          className="wcam-period-nav__content wcam-period-nav__content--button"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <strong>{triggerRange}</strong>
          {triggerRelative && <span>{triggerRelative}</span>}
        </button>
        <button
          type="button"
          className="wcam-period-nav__btn"
          onClick={() => onChange(shiftWeek(anchor, 1))}
          disabled={isNextDisabled}
          aria-label="다음 주"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      {open && (
        <>
          <div
            className="wcam-period-backdrop"
            onClick={() => { setOpen(false); setView('list') }}
            aria-hidden="true"
          />
          <div className="wcam-period-popover" role="dialog">
            <div className="wcam-period-popover__sheet-handle" aria-hidden="true" />
            <div className="wcam-period-popover__sheet-header">
              <h3>{view === 'list' ? '기간 선택' : ''}</h3>
              <button
                type="button"
                className="wcam-period-popover__sheet-close"
                onClick={() => { setOpen(false); setView('list') }}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
          {view === 'list' ? (
            <>
              <ul className="wcam-period-list">
                {weekList.map(item => {
                  const active = isSameWeek(item.anchor, anchor)
                  return (
                    <li key={item.relative}>
                      <button
                        type="button"
                        className={`wcam-period-list__row${active ? ' wcam-period-list__row--active' : ''}`}
                        onClick={() => handleSelectAnchor(item.anchor)}
                      >
                        <span className="wcam-period-list__rel">{item.relative}</span>
                        <span className="wcam-period-list__range">{fmtMD(item.start)} - {fmtMD(item.end)}</span>
                        <span className="wcam-period-list__count">{item.count}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <button
                type="button"
                className="wcam-period-popover__switch"
                onClick={() => { setView('calendar'); setCalendarMonth(startOfWeek(anchor)) }}
              >
                <FontAwesomeIcon icon={faCalendar} />
                <span>
                  <strong>이전 주차 직접 선택</strong>
                  <small>달력에서 날짜 선택</small>
                </span>
              </button>
            </>
          ) : (
            <>
              <div className="wcam-period-popover__cal-header">
                <button
                  type="button"
                  className="wcam-period-popover__back"
                  onClick={() => setView('list')}
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                  <span>돌아가기</span>
                </button>
                <div className="wcam-period-popover__month-nav">
                  <button
                    type="button"
                    className="wcam-period-popover__month-btn"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                    aria-label="이전 달"
                  >
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>
                  <span className="wcam-period-popover__month-label">
                    {calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월
                  </span>
                  <button
                    type="button"
                    className="wcam-period-popover__month-btn"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                    disabled={calendarMonth.getFullYear() === now.getFullYear() && calendarMonth.getMonth() >= now.getMonth()}
                    aria-label="다음 달"
                  >
                    <FontAwesomeIcon icon={faChevronRight} />
                  </button>
                </div>
              </div>
              <DayPicker
                mode="single"
                locale={ko}
                hideNavigation
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selected={anchor}
                onSelect={(d) => d && handleSelectAnchor(d)}
                disabled={{ after: today }}
                modifiers={{
                  hasSession: sessionDateObjs,
                  selectedWeek: selectedWeekRange,
                  sat: { dayOfWeek: [6] },
                  sun: { dayOfWeek: [0] },
                }}
                modifiersClassNames={{
                  hasSession: 'rdp-has-session',
                  selectedWeek: 'rdp-selected-week',
                  sat: 'rdp-sat',
                  sun: 'rdp-sun',
                }}
              />
              <p className="wcam-period-popover__hint">날짜를 클릭하면 해당 주차로 이동해요</p>
            </>
          )}
          </div>
        </>
      )}
    </div>
  )
}
