import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera, faObjectGroup, faComments } from '@fortawesome/free-solid-svg-icons'
import PageHeader from '../components/PageHeader'
import { RootState } from '../store/store'
import '../styles/pages/home.scss'

// 시간대별 인사말 (24시간 전체 커버)
const getTimeGreeting = () => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) return '좋은 아침이에요!'
  if (hour >= 11 && hour < 14) return '즐거운 점심시간 되세요!'
  if (hour >= 14 && hour < 18) return '활기찬 오후 보내세요!'
  return '편안한 밤 보내세요!'   // 18~24시 + 0~5시
}

export default function HomePage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const nickname = user?.nickname?.trim() || '사용자'

  return (
    <>
      <PageHeader />
      <main>
        <section className="home-greeting">
          <p>{getTimeGreeting()}</p>
          <h2>{nickname}님!</h2>
        </section>
        <div className="home-page">
        <section className='my-info'>
          <div className='my-info-score' style={{ '--score': 76 } as React.CSSProperties}>
            <svg className='my-info-score__ring' viewBox='0 0 100 100' aria-hidden='true'>
              <defs>
                <linearGradient id='mi-score-gradient' x1='0%' y1='0%' x2='100%' y2='100%'>
                  <stop offset='0%' stopColor='#1FB5AC' />
                  <stop offset='100%' stopColor='#6B7FCB' />
                </linearGradient>
              </defs>
              <circle className='my-info-score__track' cx='50' cy='50' r='45' pathLength='100' />
              <circle className='my-info-score__progress' cx='50' cy='50' r='45' pathLength='100' />
            </svg>
            <div className='my-info-score__inner'>
              <strong className='my-info-score__value'>76</strong>
              <span className='my-info-score__max'>/ 100점</span>
            </div>
          </div>
          <div className='my-info-text'>
            <p className='my-info-kicker'>RECENT POSTURE SCORE</p>
            <h3>꾸준히 좋아지고 있어요.<br />오늘도 측정해볼까요?</h3>
            <p>가장 최근은 <b>어제 22:14</b>. 지난 7일 평균보다 <b>+5점</b> 향상됐어요.<br /> 오늘은 거북목 자세를 특히 주의해보세요.</p>
            <div className='my-info-actions'>
              <Link className='my-info-actions__btn my-info-actions__btn--primary' to='/webcam'>
                지금 측정 시작
              </Link>
              <Link className='my-info-actions__btn my-info-actions__btn--secondary' to='/'>
                자세한 리포트 →
              </Link>
            </div>
          </div>
        </section>
          <section className="card home-action-card home-action-card--posture">
            <div className="home-action-card__content">
              <span className="home-action-card__icon"><FontAwesomeIcon icon={faObjectGroup} /></span>
              <h2>실시간 자세 분석</h2>
              <p>과제, 업무 도중 나도 모르게 굽어지는 허리!<br />카메라로 내 자세를 실시간 확인할 수 있어요.</p>
            </div>
            <Link className="btn--primary home-action-card__button" to="/webcam">
              분석하러 가기
            </Link>
          </section>

          <section className="card home-action-card home-action-card--photo">
            <div className="home-action-card__content">
              <span className="home-action-card__icon"><FontAwesomeIcon icon={faCamera} /></span>
              <h2>사진 분석, 기록</h2>
              <p>사진으로 내 자세 점수를 알아봐요!<br/>누적된 분석 기록을 살펴보고 자세 변화와 개선 흐름을 한눈에 확인하세요.</p>
            </div>
            <Link className="btn--primary home-action-card__button" to="/photo">
              기록 보러 가기
            </Link>
          </section>

          <section className="card home-action-card home-action-card--ai">
            <div className="home-action-card__content">
              <span className="home-action-card__icon"><FontAwesomeIcon icon={faComments} /></span>
              <h2>AI 생활습관 진단</h2>
              <p>AI와 대화하며 앉는 습관, 운동 패턴, 수면 환경을 점검하고 자세 개선에 필요한 생활습관을 찾아보세요.</p>
            </div>
            <Link className="btn--primary home-action-card__button" to="/onboarding">
              AI와 대화하기
            </Link>
          </section>
        </div>
      </main>
    </>
  )
}
