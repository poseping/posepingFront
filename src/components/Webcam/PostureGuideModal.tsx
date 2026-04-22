import { useRef, useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { analyzePose } from '../../services/api'
import { registerPostureProfile } from '../../services/webcamApi'

interface PostureGuideModalProps {
  videoRef: React.RefObject<HTMLVideoElement>
  onClose: () => void
  onComplete: () => void
}

const STEPS = [
  {
    title: '위치 확인',
    icon: '📷',
    instruction: '카메라와 눈높이를 맞추고, 머리부터 허리까지 화면에 보이도록 거리를 조정해주세요.',
    tip: '카메라에서 약 50~80cm 거리가 적당해요',
  },
  {
    title: '허리·등',
    icon: '🦴',
    instruction: '등받이에 기대지 말고 허리를 곧게 세워주세요. 골반을 살짝 앞으로 기울이면 자연스럽게 허리가 펴집니다.',
    tip: '배꼽을 앞으로 내민다는 느낌으로 앉아보세요',
  },
  {
    title: '어깨·목',
    icon: '💆',
    instruction: '양쪽 어깨를 수평으로 내리고, 턱을 살짝 당겨주세요. 귀와 어깨가 일직선이 되면 좋아요.',
    tip: '머리를 천장 방향으로 당기는 느낌으로',
  },
  {
    title: '등록',
    icon: '✅',
    instruction: '이 자세 그대로 유지해주세요. 잠시 후 기준 자세가 자동으로 등록됩니다.',
    tip: null,
  },
]

type Status = 'idle' | 'capturing' | 'done' | 'error'

export default function PostureGuideModal({ videoRef, onClose, onComplete }: PostureGuideModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>()
  const queryClient = useQueryClient()

  const [step, setStep] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 미러링된 라이브 프리뷰
  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current
      const video = videoRef.current
      if (canvas && video && video.readyState >= 2 && video.videoWidth) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.save()
          ctx.scale(-1, 1)
          ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
          ctx.restore()
        }
      }
      animFrameRef.current = requestAnimationFrame(draw)
    }
    animFrameRef.current = requestAnimationFrame(draw)
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [videoRef])

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
  }, [videoRef])

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

  // 카운트다운 → 0 되면 자동 캡처
  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      doRegister()
      return
    }
    const timer = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000)
    return () => clearTimeout(timer)
  }, [countdown, doRegister])

  const isLastStep = step === STEPS.length - 1
  const current = STEPS[step]
  const isCountingDown = countdown !== null && countdown > 0
  const isBusy = isCountingDown || status === 'capturing' || status === 'done'

  return (
    <div className="guide-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isBusy) onClose() }}>
      <div className="guide-modal">
        {/* hidden canvas for capture */}
        <canvas ref={captureCanvasRef} style={{ display: 'none' }} />

        {/* 헤더 */}
        <div className="guide-header">
          <div className="guide-dots">
            {STEPS.map((_, i) => (
              <div key={i} className={`guide-dot ${i < step ? 'done' : i === step ? 'active' : ''}`} />
            ))}
          </div>
          <button className="guide-close" onClick={onClose} disabled={isBusy}>✕</button>
        </div>

        {/* 본문 */}
        <div className="guide-body">
          {/* 웹캠 프리뷰 */}
          <div className="guide-preview-wrap">
            <canvas ref={canvasRef} className="guide-preview-canvas" />
            {isCountingDown && (
              <div className="guide-countdown-badge">{countdown}</div>
            )}
            {status === 'capturing' && (
              <div className="guide-countdown-badge">📸</div>
            )}
            {status === 'done' && (
              <div className="guide-countdown-badge done">✅</div>
            )}
          </div>

          {/* 안내 텍스트 */}
          <div className="guide-instruction">
            <div className="guide-step-icon">{current.icon}</div>
            <p className="guide-step-label">{step + 1} / {STEPS.length}</p>
            <h3 className="guide-step-title">{current.title}</h3>
            <p className="guide-step-desc">{current.instruction}</p>
            {current.tip && (
              <p className="guide-step-tip">💡 {current.tip}</p>
            )}
            {status === 'error' && (
              <p className="guide-error-msg">{errorMsg}</p>
            )}
          </div>
        </div>

        {/* 푸터 버튼 */}
        <div className="guide-footer">
          {step > 0 && !isBusy && status !== 'error' && (
            <button className="guide-btn-back" onClick={() => setStep((s) => s - 1)}>
              ← 이전
            </button>
          )}

          <div className="guide-footer-right">
            {!isLastStep && (
              <button className="guide-btn-next" onClick={() => setStep((s) => s + 1)}>
                다음 →
              </button>
            )}

            {isLastStep && status === 'idle' && !isCountingDown && (
              <button className="guide-btn-register" onClick={() => setCountdown(3)}>
                📸 지금 등록하기
              </button>
            )}

            {isLastStep && isCountingDown && (
              <button className="guide-btn-register" disabled>
                {countdown}초 후 자동 등록...
              </button>
            )}

            {isLastStep && status === 'capturing' && (
              <button className="guide-btn-register" disabled>
                등록 중...
              </button>
            )}

            {status === 'error' && (
              <button
                className="guide-btn-register"
                onClick={() => { setStatus('idle'); setErrorMsg(null); setCountdown(null) }}
              >
                다시 시도
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
