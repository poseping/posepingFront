import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faChair, faDumbbell, faHeartPulse } from '@fortawesome/free-solid-svg-icons'
import type { LifestyleHabit } from '../../services/memberApi'

interface MyHabitsCardProps {
  habitData: LifestyleHabit | null | undefined
  habitLoading: boolean
  onStartAnalysis: () => void
  onRetakeHabits: () => void
}

export default function MyHabitsCard({ habitData, habitLoading, onStartAnalysis, onRetakeHabits }: MyHabitsCardProps) {
  return (
<section className="card">
          <p className="mp-kicker">My Habits</p>
          <h3 className="mp-stats-title" style={{ marginBottom: '1.25rem' }}>생활 습관 정보</h3>

          {habitLoading && <div className="mp-stats-empty">불러오는 중...</div>}

          {!habitLoading && !habitData && (
            <>
              <div className="mp-stats-empty">아직 생활 습관 정보가 없어요.</div>
              <div className="mp-habit-footer">
                <button className="btn--tonal" onClick={onStartAnalysis}>
                  분석 시작하기 <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </div>
            </>
          )}

          {!habitLoading && habitData && (
            <>
              <div className="mp-habit-list">
                <div className="mp-habit-row">
                  <div className="mp-habit-icon"><FontAwesomeIcon icon={faChair} /></div>
                  <span className="mp-habit-label">하루 앉는 시간</span>
                  <span className="mp-habit-value">{habitData.sitting_hours_per_day ?? '-'}</span>
                </div>
                <div className="mp-habit-row">
                  <div className="mp-habit-icon"><FontAwesomeIcon icon={faDumbbell} /></div>
                  <span className="mp-habit-label">주간 운동 횟수</span>
                  <span className="mp-habit-value">{habitData.exercise_days_per_week ?? '-'}</span>
                </div>
                <div className="mp-habit-row">
                  <div className="mp-habit-icon"><FontAwesomeIcon icon={faHeartPulse} /></div>
                  <span className="mp-habit-label">불편한 부위</span>
                  <span className="mp-habit-value">{habitData.pain_areas ?? '-'}</span>
                </div>
              </div>
              <div className="mp-habit-footer">
                <button className="btn--tonal" onClick={onRetakeHabits}>
                  다시 답변하기 <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </div>
            </>
          )}
        </section>
  )
}
