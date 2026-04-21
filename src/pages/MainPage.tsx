/**
 * 메인 페이지
 * 자세 모니터링 (기존 App 컴포넌트)
 */

import { useState } from 'react'
import WebcamStream from '../components/Webcam/WebcamStream'
import PhotoAnalysisStudio from '../components/PhotoAnalysis/PhotoAnalysisStudio'
import PageHeader from '../components/PageHeader'
import '../styles/main-page.css'

function MainPage() {
  const [isActive, setIsActive] = useState(false)
  const [activeView, setActiveView] = useState<'realtime' | 'photo'>('realtime')

  return (
    <div className="app">
      <PageHeader title="바른자세 감시 시스템" />
      <main>
        <div className="main-page-content">
          <div className="analysis-tabs">
            <button
              className={`analysis-tab ${activeView === 'realtime' ? 'active' : ''}`}
              onClick={() => setActiveView('realtime')}
            >
              실시간 분석
            </button>
            <button
              className={`analysis-tab ${activeView === 'photo' ? 'active' : ''}`}
              onClick={() => {
                setIsActive(false)
                setActiveView('photo')
              }}
            >
              사진 분석
            </button>
          </div>

          {activeView === 'realtime' ? (
            <WebcamStream isActive={isActive} onToggle={() => setIsActive(!isActive)} />
          ) : (
            <PhotoAnalysisStudio />
          )}
        </div>
      </main>
    </div>
  )
}

export default MainPage
