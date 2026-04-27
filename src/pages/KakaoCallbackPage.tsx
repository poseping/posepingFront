import { useEffect } from 'react'

export default function KakaoCallbackPage() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')

    if (window.opener) {
      // 팝업 모드: 부모 창에 코드 전달 후 닫기
      window.opener.postMessage(
        { type: 'KAKAO_AUTH_CODE', code },
        window.location.origin
      )
      window.close()
    }
  }, [])

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <p>카카오 로그인 처리 중...</p>
    </div>
  )
}
