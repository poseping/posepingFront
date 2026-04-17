import { useRef, useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { analyzePose, PoseAnalysisResponse } from '../../services/api'
import '../../styles/webcam.css'

interface WebcamStreamProps {
  isActive: boolean
  onToggle: () => void
}

export default function WebcamStream({ isActive, onToggle }: WebcamStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null) // 숨겨진 Canvas: 비디오 → Base64
  const displayCanvasRef = useRef<HTMLCanvasElement>(null) // 표시 Canvas: 랜드마크 그리기
  const [result, setResult] = useState<PoseAnalysisResponse | null>(null)
  const animationFrameRef = useRef<number>()
  const requestInFlightRef = useRef(false)
  const lastAnalyzeAtRef = useRef(0)

  // TanStack Query - 자세 분석 mutation
  const { mutateAsync: analyzePoseImage, isPending } = useMutation({
    mutationFn: analyzePose,
    onSuccess: (data) => {
      setResult(data)
    },
    onError: (error) => {
      const axiosError = error as AxiosError
      console.error('자세 분석 실패:', axiosError.response?.data ?? error)
    },
  })

  // 웹캠 시작
  useEffect(() => {
    if (!isActive) return

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (error) {
        console.error('웹캠 접근 실패:', error)
      }
    }

    startWebcam()

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [isActive])

  // 프레임 캡처 + API 호출 (captureCanvas에만 쓴다)
  useEffect(() => {
    if (!isActive || !videoRef.current || !captureCanvasRef.current) return

    const captureAndAnalyze = async (timestamp: number) => {
      const captureCanvas = captureCanvasRef.current!
      const ctx = captureCanvas.getContext('2d')
      const video = videoRef.current!

      animationFrameRef.current = requestAnimationFrame(captureAndAnalyze)

      if (!ctx) return
      if (video.readyState < 2) return
      if (!video.videoWidth || !video.videoHeight) return
      if (requestInFlightRef.current) return
      if (timestamp - lastAnalyzeAtRef.current < 300) return

      captureCanvas.width = video.videoWidth
      captureCanvas.height = video.videoHeight

      // 비디오 프레임을 captureCanvas에 그린다
      ctx.drawImage(video, 0, 0)

      // 그 이미지를 Base64로 변환해서 API로 보낸다
      const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.8)
      const imageBase64 = dataUrl.split(',')[1]
      if (!imageBase64 || dataUrl === 'data:,') return

      requestInFlightRef.current = true
      try {
        await analyzePoseImage(imageBase64)
        lastAnalyzeAtRef.current = timestamp
      } finally {
        requestInFlightRef.current = false
      }
    }

    animationFrameRef.current = requestAnimationFrame(captureAndAnalyze)

    return () => {
      requestInFlightRef.current = false
      lastAnalyzeAtRef.current = 0
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isActive, analyzePoseImage])

  // 랜드마크 그리기 (displayCanvas에만 쓴다)
  useEffect(() => {
    if (!result) return
    if (!displayCanvasRef.current) return

    console.log('Result received:', result) // 디버깅
    console.log('Landmarks count:', result.landmarks?.length) // 디버깅
    console.log('Frame size:', result.frame_width, result.frame_height) // 디버깅

    if (!result.landmarks || result.landmarks.length === 0) {
      console.log('No landmarks to draw')
      return
    }

    const displayCanvas = displayCanvasRef.current
    const ctx = displayCanvas.getContext('2d')
    if (!ctx) return

    // result에서 받은 frame 크기로 canvas 크기 설정
    displayCanvas.width = result.frame_width
    displayCanvas.height = result.frame_height

    const w = displayCanvas.width
    const h = displayCanvas.height

    console.log('Canvas size set to:', w, h) // 디버깅

    // Canvas를 깨끗이 하고 검은색 배경 그리기
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, w, h)

    // 랜드마크 포인트 그리기
    result.landmarks.forEach((landmark) => {
      const x = landmark.x * w
      const y = landmark.y * h
      const visibility = landmark.visibility

      // visibility에 따라 색상 결정
      let color = visibility > 0.5 ? '#00FF00' : '#00A5FF'

      // 원 그리기
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fill()
    })

    // 연결선 그리기
    const connections = [
      [0, 1], [1, 2], [2, 3], // 왼쪽 눈
      [0, 4], [4, 5], [5, 6], // 오른쪽 눈
      [0, 7], [7, 8], // 귀
      [9, 10], // 입
      [11, 12], // 어깨
      [11, 13], [13, 15], // 왼쪽 팔
      [12, 14], [14, 16], // 오른쪽 팔
    ]

    ctx.strokeStyle = '#00FF00'
    ctx.lineWidth = 2

    connections.forEach(([startIdx, endIdx]) => {
      if (startIdx < result.landmarks.length && endIdx < result.landmarks.length) {
        const start = result.landmarks[startIdx]
        const end = result.landmarks[endIdx]

        if (start.visibility > 0.3 && end.visibility > 0.3) {
          const x1 = start.x * w
          const y1 = start.y * h
          const x2 = end.x * w
          const y2 = end.y * h

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
      }
    })
  }, [result])

  return (
    <div className="webcam-container">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="webcam-video"
        style={{ display: 'none' }}
      />
      {/* 숨겨진 Canvas: 비디오 캡처용 */}
      <canvas
        ref={captureCanvasRef}
        style={{ display: 'none' }}
      />
      {/* 표시되는 Canvas: 랜드마크 표시 */}
      <canvas ref={displayCanvasRef} className="webcam-canvas" />

      <button onClick={onToggle} className="toggle-button">
        {isActive ? '분석 중지' : '분석 시작'}
      </button>

      {isPending && <p className="loading">분석 중...</p>}

      {result && (
        <div className={`result ${result.status.toLowerCase()}`}>
          <h2>자세 상태: {result.status}</h2>
          <div className="metrics">
            <p>거북목 각도: {result.neck_forward_angle.toFixed(1)}°</p>
            <p>어깨 기울기: {result.shoulder_slope.toFixed(1)}°</p>
            <p>척추 정렬도: {(result.spine_alignment * 100).toFixed(0)}%</p>
            <p>신뢰도: {(result.confidence * 100).toFixed(0)}%</p>
          </div>
          <p className="recommendation">{result.recommendations?.[0] || '자세를 개선하세요'}</p>
        </div>
      )}
    </div>
  )
}
