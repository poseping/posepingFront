import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import PageHeader from '../components/PageHeader'
import {
  ChatHistoryItem,
  getAssistantErrorMessage,
  sendOnboardingChat,
} from '../services/assistantApi'
import '../styles/onboarding-chat.scss'
import {useSelector} from "react-redux";
import {RootState} from "../store/store.ts";

const REDIRECT_DELAY_SECONDS = 3
const ASSISTANT_AVATAR_SRC = '/assets/logo/android-icon-48x48.png'

export default function AssistantPage() {
  const navigate = useNavigate()
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [collectedFields, setCollectedFields] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null)
  const [visibleInitialBubbleCount, setVisibleInitialBubbleCount] = useState(0)
  const latestMessageRef = useRef<HTMLElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const requestInFlightRef = useRef(false)
  const user = useSelector((state: RootState) => state.auth.user)
  const nickname = user?.nickname?.trim() || '사용자';
  const initialMessages = [
    `안녕하세요, ${nickname} 님!`,
    '평소 생활 습관에 대해 몇 가지 물어볼게요😊',
    '하루에 몇 시간 정도 앉아 계시나요?',
  ]

  const setLatestMessageRef = (node: HTMLElement | null) => {
    latestMessageRef.current = node
  }

  const scrollToChatBottom = (behavior: ScrollBehavior = 'smooth') => {
    window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior,
      })
    })
  }

  const scrollToLatestMessage = () => {
    scrollToChatBottom()
  }

  useEffect(() => {
    if (redirectCountdown === null) return

    if (redirectCountdown <= 0) {
      navigate('/mypage')
      return
    }

    const timerId = window.setTimeout(() => {
      setRedirectCountdown((current) => (current === null ? null : current - 1))
    }, 1500)

    return () => window.clearTimeout(timerId)
  }, [navigate, redirectCountdown])

  useEffect(() => {
    const bubbleTimers = [100, 600, 1100].map((delay, index) =>
      window.setTimeout(() => {
        setVisibleInitialBubbleCount((count) => Math.max(count, Math.min(index + 1, initialMessages.length)))
      }, delay),
    )

    return () => {
      bubbleTimers.forEach((timerId) => window.clearTimeout(timerId))
    }
  }, [initialMessages.length])

  const onboardingMutation = useMutation({
    mutationFn: sendOnboardingChat,
    onSuccess: (data) => {
      const reply = data.reply
      if (reply) {
        setChatHistory((prev) => [
          ...prev,
          { role: 'assistant', content: reply },
        ])
      }

      setCollectedFields(data.collected_fields)
      setDone(data.done)
      setErrorMessage(null)

      scrollToLatestMessage()

      if (data.done) {
        setRedirectCountdown(REDIRECT_DELAY_SECONDS)
      }
    },
    onError: (error) => {
      setErrorMessage(getAssistantErrorMessage(error, '다시 시도해 주세요.'))
      setDone(false)
    },
    onSettled: () => {
      requestInFlightRef.current = false
    },
  })

  useEffect(() => {
    scrollToChatBottom()
    const timerId = window.setTimeout(() => scrollToChatBottom('auto'), 120)

    return () => window.clearTimeout(timerId)
  }, [chatHistory.length, visibleInitialBubbleCount, onboardingMutation.isPending, done, errorMessage])

  const canSubmit = inputValue.trim().length > 0 && !onboardingMutation.isPending && !done
  const submitPrompt = (prompt: string) => {
    const trimmed = prompt.trim()
    if (!trimmed || done || onboardingMutation.isPending || requestInFlightRef.current) return

    requestInFlightRef.current = true
    setErrorMessage(null)
    onboardingMutation.reset()
    setChatHistory((prev) => [
      ...prev,
      { role: 'user', content: trimmed },
    ])
    scrollToLatestMessage()

    onboardingMutation.mutate({
      user_prompt: trimmed,
      chat_history: chatHistory,
      collected_fields: collectedFields,
    })
    setInputValue('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitPrompt(inputValue)
  }

  return (
    <div className="onboarding-chat-page">
      <PageHeader
        title="생활 습관 분석"
        description="생활 습관을 AI가 분석합니다."
      />
      <main className="onboarding-chat-shell">
        <section className="onboarding-chat-card">
          <div className="onboarding-chat-messages">
            {initialMessages.slice(0, visibleInitialBubbleCount).map((message, index) => (
              <div
                key={message}
                ref={index === visibleInitialBubbleCount - 1 && chatHistory.length === 0 && !done ? setLatestMessageRef : undefined}
                className="onboarding-chat-message-row onboarding-chat-message-row--assistant"
              >
                <img
                  className="onboarding-chat-avatar"
                  src={ASSISTANT_AVATAR_SRC}
                  alt=""
                  aria-hidden="true"
                />
                <article className="onboarding-chat-bubble onboarding-chat-bubble--assistant">
                  <p>{message}</p>
                </article>
              </div>
            ))}

            {chatHistory.map((message, index) => {
              const isAssistant = message.role === 'assistant'

              if (isAssistant) {
                return (
                  <div
                    ref={index === chatHistory.length - 1 && !done ? setLatestMessageRef : undefined}
                    key={`${message.role}-${index}-${message.content.slice(0, 24)}`}
                    className="onboarding-chat-message-row onboarding-chat-message-row--assistant"
                  >
                    <img
                      className="onboarding-chat-avatar"
                      src={ASSISTANT_AVATAR_SRC}
                      alt=""
                      aria-hidden="true"
                    />
                    <article className="onboarding-chat-bubble onboarding-chat-bubble--assistant">
                      <p>{message.content}</p>
                    </article>
                  </div>
                )
              }

              return (
                <article
                  ref={index === chatHistory.length - 1 && !done ? setLatestMessageRef : undefined}
                  key={`${message.role}-${index}-${message.content.slice(0, 24)}`}
                  className={`onboarding-chat-bubble onboarding-chat-bubble--${message.role}`}
                >
                  <p>{message.content}</p>
                </article>
              )
            })}

            {done && (
              <div
                className={`onboarding-chat-stop onboarding-chat-stop--default`}
              >
                {redirectCountdown !== null && (
                    <p className="onboarding-chat-redirect">
                      {redirectCountdown}초 뒤 마이페이지로 이동합니다.
                    </p>
                )}
              </div>
            )}

            <div ref={messagesEndRef} aria-hidden="true" />
          </div>

          <div className={"onboarding-chat-wrap"}>
            <div className={"onboarding-chat-inner"}>
              {onboardingMutation.isPending ? (
                  <div className="onboarding-chat-typing" aria-live="polite">
                <span className="onboarding-chat-typing-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                    <span>입력 중</span>
                  </div>
              ) : "" }
              {errorMessage ? (
                  <p className="onboarding-chat-error">{errorMessage}</p>
              ) : ""}
              <form className="onboarding-chat-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    placeholder="질문에 답변해 보세요."
                    disabled={done}
                />
                <button type="submit" className="onboarding-chat-submit" disabled={!canSubmit} aria-label="메시지 보내기">
                  <FontAwesomeIcon icon={faPaperPlane} />
                </button>
              </form>
            </div>

          </div>

        </section>
      </main>
    </div>
  )
}
