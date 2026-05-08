import { useState } from 'react'
import WebcamStream from '../components/Webcam/WebcamStream'
import WebcamHistoryStats from '../components/Webcam/WebcamHistoryStats'
import PageHeader from '../components/PageHeader'

function MainPage() {
  const [isActive, setIsActive] = useState(false)

  return (
    <>
      <PageHeader />
      <main className="page-content">
        <WebcamStream isActive={isActive} onToggle={() => setIsActive(!isActive)} />
        <WebcamHistoryStats />
      </main>
    </>
  )
}

export default MainPage
