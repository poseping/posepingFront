import { ChangeEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImage } from '@fortawesome/free-solid-svg-icons'
import {
  ManualLandmarkInput,
  PhotoAnalysisResponse,
  PhotoSideView,
  analyzeManualPhotoLandmarks,
  analyzePhotoFiles,
  savePhotoAnalysis,
} from '../services/photoAnalysisApi'
import { buildPhotoCommentPayload, getAssistantErrorMessage, getPhotoComment } from '../services/assistantApi'
import PageHeader from '../components/PageHeader'
import HistorySummaryCards from '../components/History/HistorySummaryCards'
import EditableLandmarkCanvas, { FRONT_EDIT_IDS, LEFT_SIDE_EDIT_IDS, RIGHT_SIDE_EDIT_IDS } from '../components/PhotoAnalysis/EditableLandmarkCanvas'
import PhotoAnalysisResultSummary from '../components/PhotoAnalysis/PhotoAnalysisResultSummary'
import '../styles/features/photo-analysis.scss'


function normalizeManualLandmarks(landmarks: ManualLandmarkInput[]) {
  return landmarks.map((landmark) => ({
    id: landmark.id,
    name: landmark.name,
    x: Number(landmark.x.toFixed(6)),
    y: Number(landmark.y.toFixed(6)),
    z: Number(landmark.z.toFixed(6)),
    visibility: Number(landmark.visibility.toFixed(6)),
  }))
}

function extractApiErrorMessage(error: unknown, fallbackMessage: string) {
  const axiosError = error as AxiosError<{ detail?: unknown }>
  const detail = axiosError.response?.data?.detail

  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const messages = detail
        .map((item) => {
          if (typeof item === 'string') {
            return item
          }

          if (item && typeof item === 'object') {
            const maybeError = item as { loc?: unknown[]; msg?: string }
            const loc = Array.isArray(maybeError.loc) ? maybeError.loc.join(' > ') : null
            if (maybeError.msg && loc) {
              return `${loc}: ${maybeError.msg}`
            }
            if (maybeError.msg) {
              return maybeError.msg
            }
          }

          return null
        })
        .filter((message): message is string => Boolean(message))

    if (messages.length > 0) {
      return messages.join('\n')
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallbackMessage
}

function buildObjectUrl(file: File | null) {
  return file ? URL.createObjectURL(file) : null
}

function PhotoUploadField({
  id,
  label,
  file,
  hint,
  onChange,
}: {
  id: string
  label: string
  file: File | null
  hint: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label className="photo-upload-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        className="photo-upload-input"
        type="file"
        accept="image/*"
        onChange={onChange}
      />
      <div className="photo-upload-picker">
        <div className="photo-upload-picker__icon" aria-hidden="true">
          <FontAwesomeIcon icon={faImage} />
        </div>
        <div className="photo-upload-picker__content">
          <strong>{file ? file.name : '사진을 선택해주세요'}</strong>
          <small>{hint}</small>
        </div>
      </div>
    </label>
  )
}


export default function PhotoPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState(1)
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [sideFile, setSideFile] = useState<File | null>(null)
  const [sideView, setSideView] = useState<PhotoSideView>('left')
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string | null>(null)
  const [sidePreviewUrl, setSidePreviewUrl] = useState<string | null>(null)
  const [frontImageSize, setFrontImageSize] = useState({ width: 0, height: 0 })
  const [sideImageSize, setSideImageSize] = useState({ width: 0, height: 0 })
  const [finalResult, setFinalResult] = useState<PhotoAnalysisResponse | null>(null)
  const [frontLandmarks, setFrontLandmarks] = useState<ManualLandmarkInput[]>([])
  const [sideLandmarks, setSideLandmarks] = useState<ManualLandmarkInput[]>([])
  const [selectedFrontLandmarkId, setSelectedFrontLandmarkId] = useState<number | null>(null)
  const [selectedSideLandmarkId, setSelectedSideLandmarkId] = useState<number | null>(null)
  const [assistantComment, setAssistantComment] = useState<string | null>(null)
  const [assistantCommentError, setAssistantCommentError] = useState<string | null>(null)

  useEffect(() => {
    const nextFrontUrl = buildObjectUrl(frontFile)
    setFrontPreviewUrl(nextFrontUrl)
    return () => {
      if (nextFrontUrl) {
        URL.revokeObjectURL(nextFrontUrl)
      }
    }
  }, [frontFile])

  useEffect(() => {
    const nextSideUrl = buildObjectUrl(sideFile)
    setSidePreviewUrl(nextSideUrl)
    return () => {
      if (nextSideUrl) {
        URL.revokeObjectURL(nextSideUrl)
      }
    }
  }, [sideFile])

  const analyzePhotosMutation = useMutation({
    mutationFn: async () => {
      if (!frontFile || !sideFile) {
        throw new Error('정면 사진과 측면 사진을 모두 선택해 주세요.')
      }

      return analyzePhotoFiles(frontFile, sideFile, sideView)
    },
    onSuccess: (data) => {
      setFinalResult(null)
      setFrontLandmarks(data.front_landmarks)
      setSideLandmarks(data.side_landmarks)
      setSelectedFrontLandmarkId(data.front_landmarks.find((landmark) => FRONT_EDIT_IDS.includes(landmark.id))?.id ?? null)
      setSelectedSideLandmarkId(
          data.side_landmarks.find((landmark) =>
              (sideView === 'left' ? LEFT_SIDE_EDIT_IDS : RIGHT_SIDE_EDIT_IDS).includes(landmark.id)
          )?.id ?? null
      )
      setActiveStep(3)
    },
    onError: (error) => {
      const axiosError = error as AxiosError<{ detail?: string }>
      const detail =
          axiosError.response?.data?.detail ||
          (error instanceof Error ? error.message : '사진 분석 요청에 실패했습니다.')
      window.alert(detail)
    },
  })

  const finalAnalyzeMutation = useMutation({
    mutationFn: () =>
        analyzeManualPhotoLandmarks(
            sideView,
            normalizeManualLandmarks(frontLandmarks),
            normalizeManualLandmarks(sideLandmarks),
            {
              frontWidth: frontImageSize.width,
              frontHeight: frontImageSize.height,
              sideWidth: sideImageSize.width,
              sideHeight: sideImageSize.height,
            }
        ),
    onSuccess: (data) => {
      setFinalResult(data)
      setAssistantComment(null)
      setAssistantCommentError(null)
      setActiveStep(4)
    },
    onError: (error) => {
      console.error('최종 분석 실패:', error)
      window.alert(extractApiErrorMessage(error, '최종 분석 요청에 실패했습니다.'))
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!finalResult?.save_token) {
        throw new Error('저장 가능한 분석 결과가 없습니다.')
      }

      return savePhotoAnalysis(finalResult.save_token, assistantComment)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-analysis-history'] })
      queryClient.invalidateQueries({ queryKey: ['photo-analysis-history-summary'] })
      setFrontFile(null)
      setSideFile(null)
      setFrontImageSize({ width: 0, height: 0 })
      setSideImageSize({ width: 0, height: 0 })
      setFinalResult(null)
      setFrontLandmarks([])
      setSideLandmarks([])
      setSelectedFrontLandmarkId(null)
      setSelectedSideLandmarkId(null)
      setAssistantComment(null)
      setAssistantCommentError(null)
      setActiveStep(1)
      navigate('/photo', { replace: true })
    },
    onError: (error) => {
      console.error('분석 저장 실패:', error)
      window.alert(extractApiErrorMessage(error, '분석 결과 저장에 실패했습니다.'))
    },
  })

  const photoCommentMutation = useMutation({
    mutationFn: getPhotoComment,
    onSuccess: (data) => {
      setAssistantComment(data.comment)
      setAssistantCommentError(null)
    },
    onError: (error) => {
      setAssistantCommentError(getAssistantErrorMessage(error, '사진 코멘트를 불러오지 못했어요.'))
    },
  })

  useEffect(() => {
    if (!finalResult) return

    photoCommentMutation.mutate(buildPhotoCommentPayload(finalResult))
  }, [finalResult])

  const handleFileChange =
      (kind: 'front' | 'side') => (event: ChangeEvent<HTMLInputElement>) => {
        const nextFile = event.target.files?.[0] ?? null
        if (kind === 'front') {
          setFrontFile(nextFile)
          setFrontImageSize({ width: 0, height: 0 })
        } else {
          setSideFile(nextFile)
          setSideImageSize({ width: 0, height: 0 })
        }

        setFinalResult(null)
        setAssistantComment(null)
        setAssistantCommentError(null)
        setFrontLandmarks([])
        setSideLandmarks([])
        setActiveStep(2)
      }

  const renderIntroStep = () => (
      <section className="photo-hero-card">
        <div>
          <p className="photo-kicker">Photo Analysis</p>
          <h2>업로드한 사진으로 자세를 세밀하게 보정해 분석합니다</h2>
          <p>
            정면 사진과 측면 사진을 올리면 랜드마크를 먼저 잡아주고, 사용자가 직접 위치를 끌어 수정한 뒤
            최종 분석과 DB 저장 여부를 결정할 수 있습니다.
          </p>
        </div>
        <div className="photo-action-row">
          <button className="btn--primary btn--lg" onClick={() => setActiveStep(2)}>
            내 자세 확인하기
          </button>
        </div>
      </section>
  )

  const renderUploadStep = () => (
      <>
        <section className="card">
          <p className="photo-step-description">
            똑바로 서서 찍은 정면 사진과 측면 사진을 준비해주세요! 머리부터 골반까지 모두 나오면 좋아요.
          </p>
          <div className="photo-upload-grid">
            <PhotoUploadField
              id="photo-front-upload"
              label="정면 사진"
              file={frontFile}
              hint="머리부터 골반까지 보이는 사진을 권장합니다."
              onChange={handleFileChange('front')}
            />
            <PhotoUploadField
              id="photo-side-upload"
              label="측면 사진"
              file={sideFile}
              hint="왼쪽 또는 오른쪽 측면 사진을 선택하세요."
              onChange={handleFileChange('side')}
            />
            <label className="photo-upload-field compact">
              <span>측면 방향</span>
              <select value={sideView} onChange={(event) => setSideView(event.target.value as PhotoSideView)}>
                <option value="left">왼쪽 측면</option>
                <option value="right">오른쪽 측면</option>
              </select>
            </label>
          </div>
        </section>
        <div className="photo-action-row">
          <button className="btn--secondary btn--lg" onClick={() => setActiveStep(1)}>
            이전
          </button>
          <button
              className="btn--primary btn--lg"
              onClick={() => analyzePhotosMutation.mutate()}
              disabled={!frontFile || !sideFile || analyzePhotosMutation.isPending}
          >
            {analyzePhotosMutation.isPending ? '랜드마크 감지 중...' : '다음'}
          </button>
        </div>
      </>
  )

  const renderLandmarkEditStep = () => (
      <>
        <section className="card">
          <p className="photo-step-description">
            감지된 자세를 확인하고 수정이 필요하면 꼭짓점을 드래그해서 올바른 위치로 옮겨주세요.
          </p>
        </section>
        <section className="photo-editor-grid">
          <EditableLandmarkCanvas
              title="정면 사진"
              imageUrl={frontPreviewUrl}
              landmarks={frontLandmarks}
              panel="front"
              sideView={sideView}
              selectedLandmarkId={selectedFrontLandmarkId}
              onSelect={setSelectedFrontLandmarkId}
              onChange={setFrontLandmarks}
              onImageSizeChange={setFrontImageSize}
          />
          <EditableLandmarkCanvas
              title="측면 사진"
              imageUrl={sidePreviewUrl}
              landmarks={sideLandmarks}
              panel="side"
              sideView={sideView}
              selectedLandmarkId={selectedSideLandmarkId}
              onSelect={setSelectedSideLandmarkId}
              onChange={setSideLandmarks}
              onImageSizeChange={setSideImageSize}
          />
        </section>
        <section className="photo-action-row">
          <button className="btn--secondary btn--lg" onClick={() => setActiveStep(2)}>
            이전
          </button>
          <button
              className="btn--primary btn--lg"
              onClick={() => finalAnalyzeMutation.mutate()}
              disabled={frontLandmarks.length === 0 || sideLandmarks.length === 0 || finalAnalyzeMutation.isPending}
          >
            {finalAnalyzeMutation.isPending ? '최종 분석 중...' : '다음'}
          </button>
        </section>
      </>
  )

  const renderResultStep = () => {
    if (!finalResult) return null

    return (
        <>
          <PhotoAnalysisResultSummary
              title="최종 분석 결과"
              result={finalResult}
              assistantComment={assistantComment}
              assistantCommentError={assistantCommentError}
              isAssistantCommentPending={photoCommentMutation.isPending}
          />
          <div className="photo-save-actions">
            <button
                className="btn--secondary btn--lg"
                onClick={() => {
                  setFinalResult(null)
                  setActiveStep(1)
                }}
            >
              돌아가기
            </button>
            <button
                className="btn--primary btn--lg"
                onClick={() => saveMutation.mutate()}
                disabled={!finalResult.can_save || !finalResult.save_token || saveMutation.isPending}
            >
              {saveMutation.isPending ? '기록 중...' : '기록하기'}
            </button>
          </div>
        </>
    )
  }

  return (
      <>
        <PageHeader />
        <main>
          {activeStep === 1 && renderIntroStep()}

          <div className={'photo-analysis-page' + (activeStep === 2 || activeStep === 3 ? ' photo-analysis-page--narrow' : '')}>
            {activeStep === 1 && <HistorySummaryCards />}
            {activeStep === 2 && renderUploadStep()}
            {activeStep === 3 && renderLandmarkEditStep()}
            {activeStep === 4 && renderResultStep()}
          </div>
        </main>
      </>
  )
}
