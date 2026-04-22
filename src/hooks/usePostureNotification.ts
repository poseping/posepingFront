import { useRef, useEffect, useState } from 'react'

const COOLDOWN_MS: Record<string, number> = {
  bad: 30_000,     // 30초
  warning: 60_000, // 1분
}

const DEFAULT_MESSAGE: Record<string, string> = {
  bad: '자세가 많이 무너졌어요! 허리를 펴주세요.',
  warning: '자세가 흐트러지고 있어요. 자세를 확인해 주세요.',
}

export function usePostureNotification() {
  const lastNotifiedAt = useRef<Partial<Record<string, number>>>({})
  const [permission, setPermission] = useState<NotificationPermission>(Notification.permission)

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(setPermission)
    }
  }, [])

  function notify(status: 'good' | 'warning' | 'bad', issues: string[]) {
    if (status === 'good') return

    if (Notification.permission !== 'granted') {
      console.log('[notify] 스킵 — 권한:', Notification.permission)
      return
    }
    if (!document.hidden) {
      console.log('[notify] 스킵 — 탭 활성 중')
      return
    }

    const now = Date.now()
    const cooldown = COOLDOWN_MS[status] ?? 30_000
    const last = lastNotifiedAt.current[status] ?? 0
    if (now - last < cooldown) {
      console.log(`[notify] 스킵 — 쿨다운 ${Math.ceil((cooldown - (now - last)) / 1000)}초 남음`)
      return
    }

    console.log('[notify] 알림 발송:', status, issues)
    new Notification('척추PIng', {
      body: issues.length > 0 ? issues.join(', ') : DEFAULT_MESSAGE[status],
      icon: '/favicon.ico',
    })
    lastNotifiedAt.current[status] = now
  }

  return { notify, permission }
}
