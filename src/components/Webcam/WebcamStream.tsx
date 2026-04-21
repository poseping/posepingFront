import { useRef, useEffect, useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import {
  analyzePose,
  analyzeWebcam,
  registerPostureProfile,
  getPostureProfiles,
  type Landmark,
} from '../../services/api'
import '../../styles/webcam.css'

interface WebcamStreamProps {
  isActive: boolean
  onToggle: () => void
}

const STATUS_LABEL: Record<string, string> = {
  good: '✅ 좋은 자세',
  warning: '⚠️ 자세 주의',
  bad: '🚨 자세 불량',
}

const STATUS_COLOR: Record<string, string> = {
  good: '#22c55e',
  warning: '#f59e0b',
  bad: '#ef4444',
}

const SKELETON_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3],
  [0, 4], [4, 5], [5, 6],
  [0, 7], [7, 8],
  [9, 10],
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
] as const

function drawSkeleton(
  canvas: HTMLCanvasElement,
  landmarks: Landmark[],
  frameWidth: number,
  frameHeight: number,
  color = '#22c55e',
) {
  const ctx = canvas.getContext('2d')
  if (!ctx || !landmarks.length) return

  canvas.width = frameWidth
  canvas.height = frameHeight

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, frameWidth, frameHeight)

  landmarks.forEach((lm) => {
    ctx.fillStyle = lm.visibility > 0.5 ? color : '#60a5fa'
    ctx.beginPath()
    ctx.arc(lm.x * frameWidth, lm.y * frameHeight, 4, 0, 2 * Math.PI)
    ctx.fill()
  })

  ctx.strokeStyle = color
  ctx.lineWidth = 2
  SKELETON_CONNECTIONS.forEach(([s, e]) => {
    const a = landmarks[s]
    const b = landmarks[e]
    if (!a || !b || a.visibility < 0.3 || b.visibility < 0.3) return
    ctx.beginPath()
    ctx.moveTo(a.x * frameWidth, a.y * frameHeight)
    ctx.lineTo(b.x * frameWidth, b.y * frameHeight)
    ctx.stroke()
  })
}

export default function WebcamStream({ isActive, onToggle }: WebcamStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const displayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [analyzeResult, setAnalyzeResult] = useState<{ status: string; deviation_score: number; profile_name: string; issues: string[] } | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerMsg, setRegisterMsg] = useState<string | null>(null)
  const animationFrameRef = useRef<number>()
  const requestInFlightRef = useRef(false)
  const lastAnalyzeAtRef = useRef(0)
  const notificationSentRef = useRef(false)
  const queryClient = useQueryClient()

  const { data: profiles = [] } = useQuery({
    queryKey: ['postureProfiles'],
    queryFn: getPostureProfiles,
  })
  const hasProfile = profiles.length > 0

  // 브라우저 알림 권한
  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission()
  }, [])

  // bad 상태 알림 (30초 쿨다운)
  useEffect(() => {
    if (analyzeResult?.status === 'bad' && !notificationSentRef.current) {
      if (Notification.permission === 'granted') {
        new Notification('척추핑 - 자세 경고', {
          body: analyzeResult.issues.join(', ') || '자세를 바로잡아 주세요!',
          icon: '/favicon.ico',
        })
      }
      notificationSentRef.current = true
      setTimeout(() => { notificationSentRef.current = false }, 30_000)
    }
  }, [analyzeResult])

  // 웹캠 마운트 시 시작
  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch (error) {
        console.error('웹캠 접근 실패:', error)
      }
    }
    startWebcam()
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  // 프레임 캡처 (width/height 지정 시 축소)
  const captureFrame = useCallback((captureWidth = 480, captureHeight = 360): string | null => {
    const canvas = captureCanvasRef.current
    const video = videoRef.current
    if (!canvas || !video || video.readyState < 2 || !video.videoWidth) return null

    canvas.width = captureWidth
    canvas.height = captureHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, captureWidth, captureHeight)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    if (!dataUrl || dataUrl === 'data:,') return null
    return dataUrl.split(',')[1]
  }, [])

  // 기준 자세 등록
  const handleRegister = useCallback(async () => {
    setIsRegistering(true)
    setRegisterMsg(null)
    try {
      const imageBase64 = captureFrame()
      if (!imageBase64) {
        setRegisterMsg('웹캠이 준비되지 않았습니다.')
        return
      }
      const poseResult = await analyzePose(imageBase64)
      if (!poseResult.landmarks?.length) {
        setRegisterMsg('자세를 감지하지 못했습니다. 카메라를 조정해주세요.')
        return
      }
      // 등록 시 스켈레톤 즉시 표시
      if (displayCanvasRef.current) {
        drawSkeleton(displayCanvasRef.current, poseResult.landmarks, poseResult.frame_width, poseResult.frame_height)
      }
      await registerPostureProfile(poseResult.landmarks)
      queryClient.invalidateQueries({ queryKey: ['postureProfiles'] })
      setRegisterMsg('✅ 기준 자세가 등록되었습니다!')
    } catch (e) {
      const err = e as AxiosError<{ detail: string }>
      setRegisterMsg(`등록 실패: ${err.response?.data?.detail ?? '알 수 없는 오류'}`)
    } finally {
      setIsRegistering(false)
    }
  }, [captureFrame, queryClient])

  // 분석 mutation
  const { mutateAsync: runAnalyze } = useMutation({
    mutationFn: (imageBase64: string) => analyzeWebcam(imageBase64),
    onSuccess: (data) => {
      setAnalyzeResult({
        status: data.status,
        deviation_score: data.deviation_score,
        profile_name: data.profile_name,
        issues: data.issues,
      })
      if (displayCanvasRef.current && data.landmarks?.length) {
        drawSkeleton(
          displayCanvasRef.current,
          data.landmarks,
          data.frame_width,
          data.frame_height,
          STATUS_COLOR[data.status],
        )
      }
    },
    onError: (error) => {
      const axiosError = error as AxiosError
      console.error('웹캠 분석 실패:', axiosError.response?.data ?? error)
    },
  })

  // 분석 루프: 이전 요청 완료 즉시 다음 요청 (최소 대기 없음)
  useEffect(() => {
    if (!isActive || !hasProfile) return

    const loop = async (timestamp: number) => {
      animationFrameRef.current = requestAnimationFrame(loop)
      if (requestInFlightRef.current) return

      const imageBase64 = captureFrame()
      if (!imageBase64) return

      requestInFlightRef.current = true
      try {
        await runAnalyze(imageBase64)
        lastAnalyzeAtRef.current = timestamp
      } finally {
        requestInFlightRef.current = false
      }
    }

    animationFrameRef.current = requestAnimationFrame(loop)
    return () => {
      requestInFlightRef.current = false
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [isActive, hasProfile, captureFrame, runAnalyze])

  return (
    <div className="webcam-container">
      <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }} />
      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
      <canvas ref={displayCanvasRef} className="webcam-canvas" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleRegister}
          disabled={isRegistering}
          style={{
            padding: '8px 16px',
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: isRegistering ? 'not-allowed' : 'pointer',
            opacity: isRegistering ? 0.6 : 1,
          }}
        >
          {isRegistering ? '등록 중...' : hasProfile ? '기준 자세 재등록' : '📸 기준 자세 등록'}
        </button>
        {hasProfile && (
          <span style={{ color: '#22c55e', fontSize: 13 }}>
            기준 자세 {profiles.length}개 등록됨
          </span>
        )}
      </div>

      {registerMsg && (
        <p style={{ margin: '4px 0', fontSize: 13, color: registerMsg.startsWith('✅') ? '#22c55e' : '#ef4444' }}>
          {registerMsg}
        </p>
      )}

      {!hasProfile && (
        <p style={{ color: '#f59e0b', fontSize: 13 }}>
          ⚠️ 기준 자세를 먼저 등록해야 분석을 시작할 수 있습니다.
        </p>
      )}

      <button
        onClick={onToggle}
        disabled={!hasProfile}
        className="toggle-button"
        style={{ opacity: hasProfile ? 1 : 0.4, cursor: hasProfile ? 'pointer' : 'not-allowed' }}
      >
        {isActive ? '분석 중지' : '분석 시작'}
      </button>

      {analyzeResult && (
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            border: `2px solid ${STATUS_COLOR[analyzeResult.status]}`,
            background: `${STATUS_COLOR[analyzeResult.status]}18`,
            width: '100%',
            maxWidth: 640,
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: STATUS_COLOR[analyzeResult.status] }}>
            {STATUS_LABEL[analyzeResult.status]}
          </h3>
          <p style={{ margin: '0 0 4px', fontSize: 13 }}>
            이탈 점수: <strong>{(analyzeResult.deviation_score * 100).toFixed(1)}</strong>
            &nbsp;/ 기준: {analyzeResult.profile_name}
          </p>
          {analyzeResult.issues.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13 }}>
              {analyzeResult.issues.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
