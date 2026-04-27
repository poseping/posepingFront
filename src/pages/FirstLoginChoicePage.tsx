import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera, faComments, faImage } from '@fortawesome/free-solid-svg-icons'
import { Navigate, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import PageHeader from '../components/PageHeader'
import { RootState } from '../store/store'
import { hasPendingFirstLoginChoice, markFirstLoginChoiceSeen } from '../services/authService'
import '../styles/first-login-choice.scss'

type ChoiceDestination = '/onboarding' | '/main' | '/history'

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
    title: 'AI와 생활 습관 분석',
    description: '앉는 시간, 운동 빈도, 불편한 부위를 대화로 정리합니다.',
    primary: true,
  },
  {
    to: '/main',
    icon: faCamera,
    title: '실시간 분석으로 이동',
    description: '웹캠으로 현재 자세를 바로 확인합니다.',
  },
  {
    to: '/history',
    icon: faImage,
    title: '사진 분석으로 이동',
    description: '정면과 측면 사진으로 자세를 분석합니다.',
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
      <PageHeader title="처음 시작하기" description="원하는 분석 방법을 선택하세요." />
      <main className="first-login-choice">
        <section className="first-login-choice__intro">
          <p className="first-login-choice__eyebrow">Welcome</p>
          <h1>척추PING을 어떻게 시작할까요?</h1>
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
