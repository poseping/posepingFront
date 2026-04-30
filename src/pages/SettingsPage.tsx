import PageHeader from '../components/PageHeader'
import '../styles/settings.scss'

const SETTINGS_ICON_SRC = '/assets/logo/poseping_gray.png'

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="설정" description="알림, 분석 기준 등 앱 환경을 설정하세요" />
      <main className="settings-empty">
        <img className="settings-empty__icon" src={SETTINGS_ICON_SRC} alt="" aria-hidden="true" />
        <p>준비 중입니다.</p>
      </main>
    </>
  )
}
