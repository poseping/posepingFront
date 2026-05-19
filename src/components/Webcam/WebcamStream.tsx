import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { drawSkeleton } from '../../utils/skeleton'
import type { Landmark } from '../../services/webcamApi'

export interface WebcamStreamRef {
  captureFrame: () => string | null
}

interface WebcamStreamProps {
  webcamNeeded: boolean
  landmarks?: Landmark[]
  frameWidth?: number
  frameHeight?: number
  statusColor?: string
  onCameraError?: (message: string) => void
}

const WebcamStream = forwardRef<WebcamStreamRef, WebcamStreamProps>(
  function WebcamStream({ webcamNeeded, landmarks, frameWidth, frameHeight, statusColor, onCameraError }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const captureCanvasRef = useRef<HTMLCanvasElement>(null)
    const displayCanvasRef = useRef<HTMLCanvasElement>(null)

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
          onCameraError?.('카메라에 접근할 수 없습니다. 다른 앱이 카메라를 사용 중이거나 드라이버 문제일 수 있습니다.')
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

    useEffect(() => {
      if (displayCanvasRef.current && landmarks?.length) {
        drawSkeleton(displayCanvasRef.current, landmarks, frameWidth ?? 0, frameHeight ?? 0, statusColor)
      }
    }, [landmarks, frameWidth, frameHeight, statusColor])

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

    useImperativeHandle(ref, () => ({ captureFrame }), [captureFrame])

    return (
      <>
        <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }} />
        <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
        <canvas ref={displayCanvasRef} className="webcam-canvas" />
      </>
    )
  }
)

export default WebcamStream
