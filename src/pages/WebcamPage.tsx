import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import WebcamStream from '../components/Webcam/WebcamStream'
import '../styles/page-header.css'

export default function WebcamPage() {
  const [isActive, setIsActive] = useState(false)

  return (
    <>
      <PageHeader title="웹캠 분석" description="실시간 웹캠으로 자세를 분석하고 이탈 시 알림을 받아보세요" />
      <WebcamStream isActive={isActive} onToggle={() => setIsActive(!isActive)} />
    </>
  )
}
