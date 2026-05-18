import { useEffect, useMemo, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { ko } from 'react-day-picker/locale'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendar, faChevronDown } from '@fortawesome/free-solid-svg-icons'
import 'react-day-picker/style.css'

interface Props {
  sessionDates: string[]
  selectedDate: string | null
  onSelect: (dateStr: string) => void
}

function parseDateStr(s: string | null | undefined): Date | undefined {
  if (!s) return undefined
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtTriggerLabel(dateStr: string | null): string {
  if (!dateStr) return '날짜'
  const [, m, d] = dateStr.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

export default function WcamDateCalendar({ sessionDates, selectedDate, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const today = useMemo(() => new Date(), [])

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const sessionDateObjs = useMemo(
    () => sessionDates.map(parseDateStr).filter((d): d is Date => !!d),
    [sessionDates],
  )

  const selected = parseDateStr(selectedDate)

  const handleSelect = (date: Date | undefined) => {
    if (!date) return
    onSelect(formatDateStr(date))
    setOpen(false)
  }

  return (
    <div className="wcam-cal" ref={rootRef}>
      <button
        type="button"
        className={`wcam-cal-trigger${selectedDate ? ' wcam-cal-trigger--active' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <FontAwesomeIcon icon={faCalendar} />
        <span>{fmtTriggerLabel(selectedDate)}</span>
        <FontAwesomeIcon icon={faChevronDown} className="wcam-cal-caret" />
      </button>
      {open && (
        <div className="wcam-cal-popover" role="dialog">
          <DayPicker
            mode="single"
            locale={ko}
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected ?? today}
            modifiers={{
              hasSession: sessionDateObjs,
              sat: { dayOfWeek: [6] },
              sun: { dayOfWeek: [0] },
            }}
            modifiersClassNames={{
              hasSession: 'rdp-has-session',
              sat: 'rdp-sat',
              sun: 'rdp-sun',
            }}
            footer={
              <div className="wcam-cal-footer">
                <span className="wcam-cal-legend">
                  <span className="wcam-cal-legend-dot" />
                  세션 있음
                </span>
                <button
                  type="button"
                  className="wcam-cal-today-btn"
                  onClick={() => handleSelect(today)}
                >
                  오늘로 이동
                </button>
              </div>
            }
          />
        </div>
      )}
    </div>
  )
}
