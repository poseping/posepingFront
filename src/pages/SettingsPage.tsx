import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear } from '@fortawesome/free-solid-svg-icons'
import PageHeader from '../components/PageHeader'
import '../styles/settings.scss'

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="설정" description="알림, 분석 기준 등 앱 환경을 설정하세요" />
      <main className="settings-empty">
        <FontAwesomeIcon className="settings-empty__icon" icon={faGear} />
        <p>준비 중입니다.</p>
      </main>
    </>
  )
}
