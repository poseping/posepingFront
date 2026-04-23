import { useEffect } from 'react'
import type React from 'react'
import { analyzePose } from '../services/api'
import { drawSkeleton } from '../utils/skeleton'

/**
 * videoRef의 프레임을 주기적으로 캡처해 analyzePose를 호출하고,
 * 결과 스켈레톤을 canvasRef에 그린다.
 */
export function useSkeletonPreview(
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  intervalMs = 600,
) {
  useEffect(() => {
    const captureCanvas = document.createElement('canvas')
    const inFlight = { current: false }
    const lastCall = { current: 0 }
    let animFrame: number

    const loop = async (timestamp: number) => {
      animFrame = requestAnimationFrame(loop)
      if (inFlight.current) return
      if (timestamp - lastCall.current < intervalMs) return

      const video = videoRef.current
      if (!video || video.readyState < 2 || !video.videoWidth) return

      captureCanvas.width = 480
      captureCanvas.height = 360
      captureCanvas.getContext('2d')?.drawImage(video, 0, 0, 480, 360)
      const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.7)
      if (!dataUrl || dataUrl === 'data:,') return
      const imageBase64 = dataUrl.split(',')[1]

      inFlight.current = true
      lastCall.current = timestamp
      try {
        const result = await analyzePose(imageBase64)
        if (result.landmarks?.length && canvasRef.current) {
          drawSkeleton(canvasRef.current, result.landmarks, result.frame_width, result.frame_height)
        }
      } catch {
        // 프리뷰 오류는 무시
      } finally {
        inFlight.current = false
      }
    }

    animFrame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrame)
  }, [videoRef, canvasRef, intervalMs])
}
