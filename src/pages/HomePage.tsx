import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera, faChartColumn, faComments } from '@fortawesome/free-solid-svg-icons'
import PageHeader from '../components/PageHeader'

export default function HomePage() {
  return (
    <>
      <PageHeader title="" description="" />
      <main>
        <section className="home-hero">
          <p className="home-hero__eyebrow">Posture care starts here</p>
          <h2>오늘의 자세 관리, 무엇부터 시작할까요?</h2>
          <p>생활습관 점검부터 자세 분석, 기록 확인까지 척추PING에서 이어서 관리하세요.</p>
        </section>
        <div className="home-page">
          <section className="card home-action-card">
            <div className="home-action-card__content">
              <span className="home-action-card__icon"><FontAwesomeIcon icon={faComments} /></span>
              <h2>AI 생활습관 진단</h2>
              <p>AI와 대화하며 앉는 습관, 운동 패턴, 수면 환경을 점검하고 자세 개선에 필요한 생활습관을 찾아보세요.</p>
            </div>
            <Link className="primary-button home-action-card__button" to="/onboarding">
              AI와 대화하기
            </Link>
          </section>

          <section className="card home-action-card">
            <div className="home-action-card__content">
              <span className="home-action-card__icon"><FontAwesomeIcon icon={faCamera} /></span>
              <h2>자세 분석</h2>
              <p>사진이나 카메라로 현재 자세를 분석하고 목, 어깨, 척추 정렬 상태를 확인하세요.</p>
            </div>
            <Link className="primary-button home-action-card__button" to="/main">
              분석하러 가기
            </Link>
          </section>

          <section className="card home-action-card">
            <div className="home-action-card__content">
              <span className="home-action-card__icon"><FontAwesomeIcon icon={faChartColumn} /></span>
              <h2>기록 확인</h2>
              <p>누적된 분석 기록을 살펴보고 자세 변화와 개선 흐름을 한눈에 확인하세요.</p>
            </div>
            <Link className="primary-button home-action-card__button" to="/history">
              기록 보러 가기
            </Link>
          </section>
        </div>
      </main>
    </>
  )
}
