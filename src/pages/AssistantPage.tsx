import { FormEvent, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import PageHeader from '../components/PageHeader'
import {
  ChatHistoryItem,
  OnboardingMissingField,
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
    return '필수 정보 수집이 완료되었습니다.'
  }

  if (stopReason === 'max_turn_reached') {
    return '대화 횟수 제한으로 온보딩이 종료되었습니다.'
  }

  return '온보딩이 종료되었습니다.'
}

export default function AssistantPage() {
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [collectedFields, setCollectedFields] = useState<Record<string, string>>({})
  const [missingFields, setMissingFields] = useState<OnboardingMissingField[]>([])
  const [turnCount, setTurnCount] = useState(0)
  const [maxTurns, setMaxTurns] = useState(10)
  const [done, setDone] = useState(false)
  const [stopReason, setStopReason] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const onboardingMutation = useMutation({
    mutationFn: sendOnboardingChat,
    onSuccess: (data, variables) => {
      const nextHistory: ChatHistoryItem[] = [
        ...(variables.chat_history ?? []),
        { role: 'user', content: variables.user_prompt },
      ]

      if (data.reply) {
        nextHistory.push({ role: 'assistant', content: data.reply })
      }

      setChatHistory(nextHistory)
      setCollectedFields(data.collected_fields)
      setMissingFields(data.missing_fields)
      setTurnCount(data.turn_count)
      setMaxTurns(data.max_turns)
      setDone(data.done)
      setStopReason(data.stop_reason)
      setErrorMessage(null)

      window.requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      })
    },
    onError: (error) => {
      setErrorMessage(getAssistantErrorMessage(error, '온보딩 응답을 불러오지 못했습니다. 다시 시도해 주세요.'))
    },
  })

  const canSubmit = inputValue.trim().length > 0 && !onboardingMutation.isPending && !done
  const helperText = useMemo(
    () => chatHistory.length === 0
      ? '앉아 있는 시간, 운동 빈도, 통증 부위를 순서대로 수집합니다.'
      : '백엔드가 수집 상태를 관리하므로, 프론트는 collected_fields와 missing_fields를 매 턴 유지해야 합니다.',
    [chatHistory.length],
  )

  const submitPrompt = (prompt: string) => {
    const trimmed = prompt.trim()
    if (!trimmed || done) return

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
        title="AI 온보딩"
        description="앉아 있는 시간, 운동 빈도, 통증 부위를 수집하는 온보딩 세션입니다."
      />
      <main className="onboarding-chat-shell">
        <section className="onboarding-chat-hero">
          <div>
            <p className="onboarding-chat-kicker">Assistant</p>
            <h2>백엔드 세션 기준으로 온보딩 수집 상태를 관리합니다.</h2>
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

        <section className="onboarding-chat-status-grid">
          <article className="onboarding-chat-status-card">
            <h3>진행 상태</h3>
            <p>{turnCount} / {maxTurns} 턴</p>
            <p>{done ? getStopMessage(stopReason) : '수집 진행 중'}</p>
          </article>

          <article className="onboarding-chat-status-card">
            <h3>수집 완료</h3>
            {Object.keys(collectedFields).length === 0 ? (
              <p>아직 수집된 항목이 없습니다.</p>
            ) : (
              <ul className="onboarding-chat-field-list">
                {Object.entries(collectedFields).map(([key, value]) => (
                  <li key={key}>
                    <strong>{key}</strong>
                    <span>{value}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="onboarding-chat-status-card">
            <h3>남은 항목</h3>
            {missingFields.length === 0 ? (
              <p>남은 항목이 없습니다.</p>
            ) : (
              <ul className="onboarding-chat-missing-list">
                {missingFields.map((field) => (
                  <li key={field.key}>
                    <strong>{field.label}</strong>
                    <span>{field.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <section className="onboarding-chat-card">
          <div className="onboarding-chat-messages">
            {chatHistory.length === 0 && (
              <div className="onboarding-chat-empty">
                첫 메시지를 보내면 온보딩 세션이 시작됩니다.
              </div>
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

            {onboardingMutation.isPending && (
              <article className="onboarding-chat-bubble onboarding-chat-bubble--assistant">
                <span className="onboarding-chat-role">AI</span>
                <p>응답을 생성하는 중입니다...</p>
              </article>
            )}

            {done && (
              <div className={`onboarding-chat-stop onboarding-chat-stop--${stopReason ?? 'default'}`}>
                {getStopMessage(stopReason)}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="onboarding-chat-form" onSubmit={handleSubmit}>
            <textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="예: 하루 8시간 앉아 있고, 운동은 주 3회, 통증은 없습니다."
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
