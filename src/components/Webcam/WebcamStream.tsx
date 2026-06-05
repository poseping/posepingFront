import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { drawSkeleton } from '../../utils/skeleton'
import type { Landmark } from '../../services/webcamApi'

export interface WebcamStreamRef {
  captureFrame: () => string | null
  togglePip: () => Promise<void>
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
  onPipChange?: (active: boolean) => void
  pipPlaying?: boolean
  pipOverlay?: { label: string; score: number }
}

const WebcamStream = forwardRef<WebcamStreamRef, WebcamStreamProps>(
  function WebcamStream({ webcamNeeded, deviceId, landmarks, frameWidth, frameHeight, statusColor, onCameraError, onDevicesFound, onPipChange, pipPlaying, pipOverlay }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const captureCanvasRef = useRef<HTMLCanvasElement>(null)
    const displayCanvasRef = useRef<HTMLCanvasElement>(null)
    const pipCanvasRef = useRef<HTMLCanvasElement>(null)
    const pipVideoRef = useRef<HTMLVideoElement>(null)
    const onPipChangeRef = useRef(onPipChange)
    useEffect(() => { onPipChangeRef.current = onPipChange }, [onPipChange])

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

      // pipCanvas: 스켈레톤 복사 + 오버레이 합성 (PIP 스트림용)
      const pipCanvas = pipCanvasRef.current
      if (!pipCanvas || !canvas.width || !canvas.height) return
      pipCanvas.width = canvas.width
      pipCanvas.height = canvas.height
      const pc = pipCanvas.getContext('2d')
      if (!pc) return
      pc.drawImage(canvas, 0, 0)

      if (pipOverlay) {
        const w = canvas.width
        const h = canvas.height
        const barH = 48

        pc.fillStyle = 'rgba(0,0,0,0.6)'
        pc.fillRect(0, h - barH, w, barH)

        // 상태 색 점
        const dotR = 6
        const dotX = 18
        const dotY = h - barH / 2
        pc.fillStyle = statusColor ?? '#10b981'
        pc.beginPath()
        pc.arc(dotX, dotY, dotR, 0, Math.PI * 2)
        pc.fill()

        // 상태 라벨
        pc.textBaseline = 'middle'
        pc.font = 'bold 14px sans-serif'
        pc.fillStyle = '#fff'
        pc.fillText(pipOverlay.label, dotX + dotR + 8, dotY)

        // 자세 점수 (우측)
        const scoreStr = pipOverlay.score.toFixed(1)
        const prefix = '자세 점수 '
        pc.font = '13px sans-serif'
        const prefixW = pc.measureText(prefix).width
        pc.font = 'bold 13px sans-serif'
        const scoreW = pc.measureText(scoreStr).width
        const pad = 16
        pc.font = '13px sans-serif'
        pc.fillStyle = 'rgba(255,255,255,0.7)'
        pc.fillText(prefix, w - prefixW - scoreW - pad, dotY)
        pc.font = 'bold 13px sans-serif'
        pc.fillStyle = '#fff'
        pc.fillText(scoreStr, w - scoreW - pad, dotY)
      }
    }, [landmarks, frameWidth, frameHeight, statusColor, pipOverlay])

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

    const togglePip = useCallback(async () => {
      const pipCanvas = pipCanvasRef.current
      const pipVideo = pipVideoRef.current
      if (!pipCanvas || !pipVideo) return
      if (document.pictureInPictureElement === pipVideo) {
        await document.exitPictureInPicture()
        return
      }
      pipVideo.srcObject = pipCanvas.captureStream(10)
      await pipVideo.play()
      await pipVideo.requestPictureInPicture()
      onPipChangeRef.current?.(true)
    }, [])

    useEffect(() => {
      const pipVideo = pipVideoRef.current
      if (!pipVideo) return
      const handleLeave = () => onPipChangeRef.current?.(false)
      pipVideo.addEventListener('leavepictureinpicture', handleLeave)
      return () => pipVideo.removeEventListener('leavepictureinpicture', handleLeave)
    }, [])

    // PIP 창 버튼이 실제 video 상태를 보므로 직접 play/pause 호출
    useEffect(() => {
      const pipVideo = pipVideoRef.current
      if (!pipVideo || document.pictureInPictureElement !== pipVideo) return
      if (pipPlaying) {
        pipVideo.play().catch(() => {})
      } else {
        pipVideo.pause()
      }
    }, [pipPlaying])

    useImperativeHandle(ref, () => ({ captureFrame, togglePip }), [captureFrame, togglePip])

    return (
      <>
        <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }} />
        <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
        <canvas ref={displayCanvasRef} className="webcam-canvas" />
        <canvas ref={pipCanvasRef} style={{ display: 'none' }} />
        <video ref={pipVideoRef} muted playsInline style={{ display: 'none' }} />
      </>
    )
  }
)

export default WebcamStream
