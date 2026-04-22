import { useRef, useEffect, useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import {
  analyzeWebcam,
  getPostureProfiles,
  updatePostureProfile,
  deletePostureProfile,
  type PostureProfile,
} from '../../services/webcamApi'
import { drawSkeleton } from '../../utils/skeleton'
import PostureProfileModal from './PostureProfileModal'
import PostureGuideModal from './PostureGuideModal'
import '../../styles/webcam.css'

interface WebcamStreamProps {
  isActive: boolean
  onToggle: () => void
}

const STATUS_LABEL: Record<string, string> = {
  good: '좋은 자세',
  warning: '자세 주의',
  bad: '자세 불량',
}

const STATUS_COLOR: Record<string, string> = {
  good: '#22c55e',
  warning: '#f59e0b',
  bad: '#ef4444',
}


function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export default function WebcamStream({ isActive, onToggle }: WebcamStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const displayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [analyzeResult, setAnalyzeResult] = useState<{
    status: string
    deviation_score: number
    profile_name: string
    issues: string[]
  } | null>(null)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<PostureProfile | null>(null)
  const animationFrameRef = useRef<number>()
  const requestInFlightRef = useRef(false)
  const notificationSentRef = useRef(false)
  const queryClient = useQueryClient()

  const { data: profiles = [] } = useQuery({
    queryKey: ['postureProfiles'],
    queryFn: getPostureProfiles,
  })
  const hasProfile = profiles.length > 0

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission()
  }, [])

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

  const openGuide = useCallback(() => setIsGuideOpen(true), [])

  const { mutateAsync: runUpdate } = useMutation({
    mutationFn: ({ profileId, data }: { profileId: number; data: Parameters<typeof updatePostureProfile>[1] }) =>
      updatePostureProfile(profileId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['postureProfiles'] }),
  })

  const { mutateAsync: runDelete } = useMutation({
    mutationFn: (profileId: number) => deletePostureProfile(profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postureProfiles'] })
      setSelectedProfile(null)
    },
  })

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
      } finally {
        requestInFlightRef.current = false
      }
      void timestamp
    }

    animationFrameRef.current = requestAnimationFrame(loop)
    return () => {
      requestInFlightRef.current = false
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [isActive, hasProfile, captureFrame, runAnalyze])

  return (
    <>
    <div className="webcam-page">
      {/* hidden elements */}
      <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }} />
      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />

      {/* ── 왼쪽: 캔버스 + 분석 결과 ── */}
      <div className="webcam-left">
        <div className="wcam-stage-card">
          <div className="wcam-stage-inner">
            <canvas ref={displayCanvasRef} className="webcam-canvas" />
          </div>
        </div>

        {analyzeResult && (
          <div className="wcam-result-card">
            <div className="wcam-result-header">
              <h3>분석 결과</h3>
              <span className={`wcam-status-chip ${analyzeResult.status}`}>
                {STATUS_LABEL[analyzeResult.status]}
              </span>
            </div>
            <p className="wcam-result-score">
              이탈 점수&nbsp;<strong>{(analyzeResult.deviation_score * 100).toFixed(1)}</strong>
              &nbsp;·&nbsp;기준: {analyzeResult.profile_name}
            </p>
            {analyzeResult.issues.length > 0 && (
              <div className="wcam-issue-block">
                <h4>개선 필요 항목</h4>
                <ul>
                  {analyzeResult.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 오른쪽: 기준 자세 + 분석 버튼 ── */}
      <div className="webcam-right">
        <div className="wcam-card">
          <p className="wcam-kicker">기준 자세</p>

          {!hasProfile ? (
            /* 기준 자세 없음 — 빈 상태 */
            <div className="wcam-empty-state">
              <div className="wcam-empty-icon">📋</div>
              <h4>등록된 기준 자세가 없습니다</h4>
              <p>카메라 앞에 바르게 앉은 후 기준 자세를 등록하면 실시간 분석을 시작할 수 있습니다.</p>
              <button
                className="wcam-primary-btn"
                onClick={openGuide}
              >
                📸 기준 자세 등록하기
              </button>
            </div>
          ) : (
            /* 기준 자세 있음 — 카드 목록 */
            <>
              <div className="wcam-profile-list-header">
                <h4>등록된 자세 ({profiles.length}개)</h4>
              </div>
              <div className="wcam-profile-scroll">
                {profiles.map((profile) => (
                  <div
                    key={profile.profile_id}
                    className={`wcam-profile-item${profile.is_active ? ' active' : ''}`}
                    onClick={() => setSelectedProfile(profile)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="wcam-profile-name">{profile.profile_name}</span>
                    <span className="wcam-profile-date">{formatDate(profile.created_at)}</span>
                    {profile.is_active && <span className="wcam-profile-badge">사용 중</span>}
                  </div>
                ))}
                <button
                  className="wcam-add-btn"
                  onClick={openGuide}
                >
                  <span className="wcam-add-btn-icon">+</span>
                  <span>추가</span>
                </button>
              </div>
            </>
          )}

        </div>

        {hasProfile && (
          <button
            onClick={onToggle}
            className={isActive ? 'wcam-stop-btn' : 'wcam-primary-btn'}
          >
            {isActive ? '■ 분석 중지' : '▶ 분석 시작'}
          </button>
        )}
      </div>
    </div>

    {isGuideOpen && (
      <PostureGuideModal
        videoRef={videoRef}
        onClose={() => setIsGuideOpen(false)}
        onComplete={() => setIsGuideOpen(false)}
      />
    )}

    {selectedProfile && (
      <PostureProfileModal
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onUpdate={async (data) => {
          const updated = await runUpdate({ profileId: selectedProfile.profile_id, data })
          setSelectedProfile(updated)
        }}
        onDelete={async () => {
          await runDelete(selectedProfile.profile_id)
        }}
      />
    )}
    </>
  )
}
