import type { Landmark } from '../services/webcamApi'

export const SKELETON_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3],
  [0, 4], [4, 5], [5, 6],
  [0, 7], [7, 8],
  [9, 10],
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
] as const

export function drawSkeleton(
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
