import '../../styles/components/posture-guide-modal.scss'
import { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faArrowRight,
  faCamera,
  faCheck,
  faLightbulb,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { analyzePose } from '../../services/api'
import { registerPostureProfile } from '../../services/webcamApi'
import { useSkeletonPreview } from '../../hooks/useSkeletonPreview'

interface PostureGuideModalProps {
  onClose: () => void
  onComplete: () => void
}

const STEPS = [
  {
    title: '카메라 위치 잡기',
    icon: faCamera,
    instruction: '카메라와 눈높이를 맞추고, 머리부터 허리까지 화면에 보이도록 거리를 조정해주세요.',
    tip: '카메라에서 약 50~80cm 거리가 적당해요',
  },
  {
    title: '허리와 등 펴기',
    icon: faBone,
    instruction: '등받이에 기대지 말고 허리를 곧게 세워주세요. 골반을 살짝 앞으로 기울이면 자연스럽게 허리가 펴집니다.',
    tip: '배꼽을 앞으로 내민다는 느낌으로 앉아보세요',
  },
  {
    title: '어깨 펴고 목 정렬',
    icon: faPerson,
    instruction: '양쪽 어깨를 수평으로 내리고, 턱을 살짝 당겨주세요. 귀와 어깨가 일직선이 되면 좋아요.',
    tip: '머리를 천장 방향으로 당기는 느낌으로',
  },
  {
    title: '이 자세 그대로!',
    icon: faCircleCheck,
    instruction: '이 자세 그대로 유지해주세요. 잠시 후 기준 자세가 자동으로 등록됩니다.',
    tip: '3초간 움직이지 않으면 자동으로 캡처돼요',
  },
]

type Status = 'idle' | 'capturing' | 'done' | 'error'

export default function PostureGuideModal({ onClose, onComplete }: PostureGuideModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const queryClient = useQueryClient()

  const [step, setStep] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let stopped = false
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (!stopped && videoRef.current) videoRef.current.srcObject = stream
        else stream.getTracks().forEach((t) => t.stop())
      } catch (error) {
        console.error('웹캠 접근 실패:', error)
      }
    }
    startWebcam()
    return () => {
      stopped = true
      if (videoRef.current?.srcObject) {
        ;(videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
        videoRef.current.srcObject = null
      }
    }
  }, [])

  useSkeletonPreview(videoRef, canvasRef)

  const captureFrame = useCallback((): string | null => {
    const canvas = captureCanvasRef.current
    const video = videoRef.current
    if (!canvas || !video || video.readyState < 2 || !video.videoWidth) return null
    canvas.width = 480
    canvas.height = 360
    canvas.getContext('2d')?.drawImage(video, 0, 0, 480, 360)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    if (!dataUrl || dataUrl === 'data:,') return null
    return dataUrl.split(',')[1]
  }, [])

  const doRegister = useCallback(async () => {
    setStatus('capturing')
    try {
      const imageBase64 = captureFrame()
      if (!imageBase64) throw new Error('웹캠이 준비되지 않았습니다.')
      const poseResult = await analyzePose(imageBase64)
      if (!poseResult.landmarks?.length) throw new Error('자세를 감지하지 못했습니다. 카메라를 조정해주세요.')
      await registerPostureProfile(poseResult.landmarks)
      queryClient.invalidateQueries({ queryKey: ['postureProfiles'] })
      setStatus('done')
      setTimeout(onComplete, 1200)
    } catch (e) {
      const err = e as AxiosError<{ detail: string }>
      setErrorMsg(err.response?.data?.detail ?? (e as Error).message ?? '알 수 없는 오류')
      setStatus('error')
    }
  }, [captureFrame, queryClient, onComplete])

  const doRegisterRef = useRef(doRegister)
  useLayoutEffect(() => { doRegisterRef.current = doRegister }, [doRegister])

  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      doRegisterRef.current()
      return
    }
    const timer = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const isLastStep = step === STEPS.length - 1
  const current = STEPS[step]
  const isCountingDown = countdown !== null && countdown > 0
  const isBusy = isCountingDown || status === 'capturing' || status === 'done'

  const content = (
    <div className="guide-modal">
      <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }} />
      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />

      <div className="guide-header">
        <div className="guide-dots">
          {STEPS.map((_, i) => (
            <div key={i} className={`guide-dot ${i < step ? 'done' : i === step ? 'active' : ''}`} />
          ))}
        </div>
        <button className="btn-icon btn-icon--circle" onClick={onClose} disabled={isBusy}>
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      <div className="guide-body">
        <div className="guide-preview-wrap">
          <canvas ref={canvasRef} className="guide-preview-canvas" />
          {isCountingDown && (
            <div className="guide-countdown-badge">{countdown}</div>
          )}
          {status === 'capturing' && (
            <div className="guide-countdown-badge"><FontAwesomeIcon icon={faCamera} /></div>
          )}
          {status === 'done' && (
            <div className="guide-countdown-badge done"><FontAwesomeIcon icon={faCheck} /></div>
          )}
        </div>

        <div className="guide-instruction">
          <p className="guide-step-label">{step + 1} / {STEPS.length}</p>
          <h3 className="guide-step-title">{current.title}</h3>
          <p className="guide-step-desc">{current.instruction}</p>
          {current.tip && (
            <p className="guide-step-tip">
              <FontAwesomeIcon icon={faLightbulb} />
              {current.tip}
            </p>
          )}
          {status === 'error' && (
            <p className="guide-error-msg">{errorMsg}</p>
          )}
        </div>
      </div>

      <div className="guide-footer">
        {step > 0 && !isBusy && status !== 'error' && (
          <button className="btn--secondary" onClick={() => setStep((s) => s - 1)}>
            <FontAwesomeIcon icon={faArrowLeft} />
            이전
          </button>
        )}
        <div className="guide-footer-right">
          {!isLastStep && (
            <button className="btn--primary" onClick={() => setStep((s) => s + 1)}>
              다음
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
          )}
          {isLastStep && status === 'idle' && !isCountingDown && (
            <button className="btn--primary" onClick={() => setCountdown(3)}>
              <FontAwesomeIcon icon={faCamera} />
              지금 등록하기
            </button>
          )}
          {isLastStep && isCountingDown && (
            <button className="btn--primary" disabled>
              {countdown}초 후 자동 등록...
            </button>
          )}
          {isLastStep && status === 'capturing' && (
            <button className="btn--primary" disabled>
              등록 중...
            </button>
          )}
          {status === 'error' && (
            <button
              className="btn--primary"
              onClick={() => { setStatus('idle'); setErrorMsg(null); setCountdown(null) }}
            >
              다시 시도
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div
      className="guide-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && !isBusy) onClose() }}
    >
      {content}
    </div>
  )
}
