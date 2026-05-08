import { useRef, useEffect, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { analyzeWebcam } from '../../services/webcamApi'
import { drawSkeleton } from '../../utils/skeleton'

const STATUS_COLOR: Record<string, string> = {
  good: '#10b981',
  warning: '#f59e0b',
  bad: '#ef4444',
}

export interface WebcamAnalysisResult {
  status: string
  deviation_score: number
  profile_name: string
  issues: string[]
  landmarks?: { x: number; y: number; z: number; visibility: number }[]
  frame_width?: number
  frame_height?: number
}

interface WebcamStreamProps {
  isAnalyzing: boolean
  webcamNeeded: boolean
  onResult: (data: WebcamAnalysisResult) => void
}

export default function WebcamStream({ isAnalyzing, webcamNeeded, onResult }: WebcamStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const displayCanvasRef = useRef<HTMLCanvasElement>(null)
  const analysisTimerRef = useRef<number>()
  const requestInFlightRef = useRef(false)

  useEffect(() => {
    if (!webcamNeeded) return

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
  }, [webcamNeeded])

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

  const { mutateAsync: runAnalyze } = useMutation({
    mutationFn: (imageBase64: string) => analyzeWebcam(imageBase64),
    onSuccess: (data) => {
      if (displayCanvasRef.current && data.landmarks?.length) {
        drawSkeleton(
          displayCanvasRef.current,
          data.landmarks,
          data.frame_width,
          data.frame_height,
          STATUS_COLOR[data.status],
        )
      }
      onResult({
        status: data.status,
        deviation_score: data.deviation_score,
        profile_name: data.profile_name,
        issues: data.issues,
        landmarks: data.landmarks,
        frame_width: data.frame_width,
        frame_height: data.frame_height,
      })
    },
    onError: (error) => {
      const axiosError = error as AxiosError
      console.error('웹캠 분석 실패:', axiosError.response?.data ?? error)
    },
  })

  useEffect(() => {
    if (!isAnalyzing) return

    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      if (!requestInFlightRef.current) {
        const imageBase64 = captureFrame()
        if (imageBase64) {
          requestInFlightRef.current = true
          try {
            await runAnalyze(imageBase64)
          } finally {
            requestInFlightRef.current = false
          }
        }
      }
      if (!cancelled) analysisTimerRef.current = window.setTimeout(tick, 300)
    }
    analysisTimerRef.current = window.setTimeout(tick, 0)
    return () => {
      cancelled = true
      requestInFlightRef.current = false
      clearTimeout(analysisTimerRef.current)
    }
  }, [isAnalyzing, captureFrame, runAnalyze])

  return (
    <>
      <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }} />
      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
      <canvas ref={displayCanvasRef} className="webcam-canvas" />
    </>
  )
}
