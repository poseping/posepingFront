import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera, faChartColumn, faComments } from '@fortawesome/free-solid-svg-icons'
import PageHeader from '../components/PageHeader'
import { RootState } from '../store/store'
import '../styles/pages/home.scss'

export default function HomePage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const nickname = user?.nickname?.trim() || '사용자'

  return (
    <>
      <PageHeader />
      <main>
        <section className="home-greeting">
          <p>안녕하세요</p>
          <h2>{nickname}님!</h2>
        </section>
        <div className="home-page">
          <section className="card home-action-card home-action-card--posture">
            <div className="home-action-card__content">
              <span className="home-action-card__icon"><FontAwesomeIcon icon={faCamera} /></span>
              <h2>실시간 자세 분석</h2>
              <p>과제, 업무 도중 나도 모르게 굽어지는 허리!<br />카메라로 내 자세를 실시간 확인할 수 있어요.</p>
            </div>
            <Link className="btn--primary home-action-card__button" to="/webcam">
              분석하러 가기
            </Link>
          </section>

          <section className="card home-action-card home-action-card--photo">
            <div className="home-action-card__content">
              <span className="home-action-card__icon"><FontAwesomeIcon icon={faChartColumn} /></span>
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
