import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { drawSkeleton } from '../../utils/skeleton'
import type { Landmark } from '../../services/webcamApi'

export interface WebcamStreamRef {
  captureFrame: () => string | null
}

interface WebcamStreamProps {
  webcamNeeded: boolean
  deviceId?: string
  landmarks?: Landmark[]
  frameWidth?: number
  frameHeight?: number
  statusColor?: string
  onCameraError?: (message: string) => void
  onDevicesFound?: (devices: MediaDeviceInfo[]) => void
}

const WebcamStream = forwardRef<WebcamStreamRef, WebcamStreamProps>(
  function WebcamStream({ webcamNeeded, deviceId, landmarks, frameWidth, frameHeight, statusColor, onCameraError, onDevicesFound }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const captureCanvasRef = useRef<HTMLCanvasElement>(null)
    const displayCanvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
      if (!webcamNeeded) return
      let stopped = false
      const startWebcam = async () => {
        const attach = async (stream: MediaStream) => {
          if (!stopped && videoRef.current) {
            videoRef.current.srcObject = stream
            const all = await navigator.mediaDevices.enumerateDevices()
            if (!stopped) onDevicesFound?.(all.filter((d) => d.kind === 'videoinput'))
          } else {
            stream.getTracks().forEach((t) => t.stop())
          }
        }
        try {
          const videoConstraints = deviceId
            ? { deviceId: { exact: deviceId } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } }
          const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints })
          await attach(stream)
        } catch {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            await attach(stream)
          } catch (error) {
            console.error('웹캠 접근 실패:', error)
            onCameraError?.('카메라에 접근할 수 없습니다. 다른 앱이 카메라를 사용 중이거나 드라이버 문제일 수 있습니다.')
          }
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
    }, [webcamNeeded, deviceId])

    useEffect(() => {
      const canvas = displayCanvasRef.current
      if (!canvas) return
      if (landmarks?.length) {
        drawSkeleton(canvas, landmarks, frameWidth ?? 0, frameHeight ?? 0, statusColor)
      } else {
        canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
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
