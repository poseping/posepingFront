import { useState } from 'react'
import WebcamStream from '../components/Webcam/WebcamStream'
import PageHeader from '../components/PageHeader'

function MainPage() {
  const [isActive, setIsActive] = useState(false)

  return (
    <div className="app">
      <PageHeader title="실시간 분석" />
      <main>
        <div className="main-page-content">
          <WebcamStream isActive={isActive} onToggle={() => setIsActive(!isActive)} />
        </div>
      </main>
    </div>
  )
}

export default MainPage
