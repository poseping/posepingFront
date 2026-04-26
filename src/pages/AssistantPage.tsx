import { FormEvent, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import PageHeader from '../components/PageHeader'
import {
  ChatHistoryItem,
  getAssistantErrorMessage,
  sendOnboardingChat,
} from '../services/assistantApi'
import '../styles/onboarding-chat.scss'

const STARTER_PROMPTS = [
  '하루 8시간 정도 앉아 있어요.',
  '목과 어깨가 자주 불편해요.',
  '운동은 일주일에 2번 정도 합니다.',
]

function getStopMessage(stopReason: string | null) {
  if (stopReason === 'completed') {
    return '생활 습관 분석이 완료되었습니다.'
  }

  if (stopReason === 'max_turn_reached') {
    return '대화 횟수 제한으로 생활 습관 분석이 종료되었습니다.'
  }

  return '채팅이 종료되었습니다.'
}

export default function AssistantPage() {
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [collectedFields, setCollectedFields] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [stopReason, setStopReason] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
      setStopReason(data.stop_reason)
      setErrorMessage(null)

      window.requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      })
    },
    onError: (error) => {
      setErrorMessage(getAssistantErrorMessage(error, '다시 시도해 주세요.'))
    },
  })

  const canSubmit = inputValue.trim().length > 0 && !onboardingMutation.isPending && !done
  const helperText = useMemo(
    () => chatHistory.length === 0
      ? '앉아 있는 시간, 운동 빈도, 통증 부위를 순서대로 수집합니다.'
      : '질문에 순서대로 답변해 주세요.',
    [chatHistory.length],
  )

  const submitPrompt = (prompt: string) => {
    const trimmed = prompt.trim()
    if (!trimmed || done) return

    setChatHistory((prev) => [
      ...prev,
      { role: 'user', content: trimmed },
    ])

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
        <section className="onboarding-chat-hero">
          <div>
            <p className="onboarding-chat-kicker">Assistant</p>
            <h2>채팅으로 간편하게 생활 습관을 분석합니다.</h2>
            <p>{helperText}</p>
          </div>
          <div className="onboarding-chat-chips">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="onboarding-chat-chip"
                onClick={() => submitPrompt(prompt)}
                disabled={onboardingMutation.isPending || done}
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="onboarding-chat-card">
          <div className="onboarding-chat-messages">
            {chatHistory.length === 0 && (
              <article className="onboarding-chat-bubble onboarding-chat-bubble--assistant">
                <span className="onboarding-chat-role">척추PING</span>
                <p>안녕하세요. 생활 습관 분석을 시작하겠습니다. 하루에 몇 시간 정도 앉아 계신가요?</p>
              </article>
            )}

            {chatHistory.map((message, index) => (
              <article
                key={`${message.role}-${index}-${message.content.slice(0, 24)}`}
                className={`onboarding-chat-bubble onboarding-chat-bubble--${message.role}`}
              >
                <span className="onboarding-chat-role">
                  {message.role === 'assistant' ? 'AI' : '나'}
                </span>
                <p>{message.content}</p>
              </article>
            ))}

            {done && (
              <div className={`onboarding-chat-stop onboarding-chat-stop--${stopReason ?? 'default'}`}>
                {getStopMessage(stopReason)}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="onboarding-chat-form" onSubmit={handleSubmit}>
            {onboardingMutation.isPending && (
              <div className="onboarding-chat-typing" aria-live="polite">
                <span className="onboarding-chat-typing-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span>입력 중</span>
              </div>
            )}

            <textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="질문에 답변해 보세요."
              rows={4}
              disabled={done}
            />
            <div className="onboarding-chat-form-footer">
              {errorMessage ? (
                <p className="onboarding-chat-error">{errorMessage}</p>
              ) : done ? (
                <p className="onboarding-chat-hint">{getStopMessage(stopReason)}</p>
              ) : (
                <p className="onboarding-chat-hint">reply가 null이어도 정상 종료일 수 있습니다.</p>
              )}
              <button type="submit" className="onboarding-chat-submit" disabled={!canSubmit}>
                보내기
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
