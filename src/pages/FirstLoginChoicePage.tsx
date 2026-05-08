import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera, faComments, faImage } from '@fortawesome/free-solid-svg-icons'
import { Navigate, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import PageHeader from '../components/PageHeader'
import { RootState } from '../store/store'
import { hasPendingFirstLoginChoice, markFirstLoginChoiceSeen } from '../services/authService'
import '../styles/pages/first-login-choice.scss'

type ChoiceDestination = '/onboarding' | '/main' | '/photo'

const BRAND_LOGO_SRC = '/assets/logo/android-icon-192x192.png'

const choices: Array<{
  to: ChoiceDestination
  icon: typeof faComments
  title: string
  description: string
  primary?: boolean
}> = [
  {
    to: '/onboarding',
    icon: faComments,
    title: 'AI와 내 생활 습관 분석',
    description: '자세를 분석하기 전 먼저 생활 습관을 파악해요.',
    primary: true,
  },
  {
    to: '/main',
    icon: faCamera,
    title: '실시간 자세 분석',
    description: '웹캠으로 실시간 자세를 분석하고 피드백을 받아요.',
  },
  {
    to: '/photo',
    icon: faImage,
    title: '사진 분석으로 이동',
    description: '사진을 업로드해서 내 자세를 분석하고 기록을 남겨봐요.',
  },
]

export default function FirstLoginChoicePage() {
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)

  if (!user || !hasPendingFirstLoginChoice(user)) {
    return <Navigate to="/home" replace />
  }

  const handleSelect = (to: ChoiceDestination) => {
    markFirstLoginChoiceSeen(user)
    navigate(to, { replace: true })
  }

  return (
    <>
      <PageHeader />
      <main className="first-login-choice">
        <section className="first-login-choice__intro">
          <img className="first-login-choice__logo" src={BRAND_LOGO_SRC} alt="PosePing" />
          <h1>포즈PING을 어떻게 시작할까요?</h1>
          <p>생활 습관 분석을 먼저 진행하거나, 건너뛰고 바로 자세 분석을 시작할 수 있습니다.</p>
        </section>

        <section className="first-login-choice__grid">
          {choices.map((choice) => (
            <button
              key={choice.to}
              type="button"
              className={`card first-login-choice__card${choice.primary ? ' is-primary' : ''}`}
              onClick={() => handleSelect(choice.to)}
            >
              <span className="first-login-choice__icon">
                <FontAwesomeIcon icon={choice.icon} />
              </span>
              <span>
                <strong>{choice.title}</strong>
                <small>{choice.description}</small>
              </span>
            </button>
          ))}
        </section>
      </main>
    </>
  )
}
