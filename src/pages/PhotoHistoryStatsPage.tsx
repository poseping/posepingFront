import PhotoHistoryStats from '../components/PhotoAnalysis/PhotoHistoryStats'
import PageHeader from '../components/PageHeader'
import '../styles/photo-analysis.scss'

export default function PhotoHistoryStatsPage() {
  return (
    <>
      <PageHeader title="저장된 기록 통계" description="저장한 사진 자세 분석 기록의 변화 추이를 확인합니다." />
      <main className="photo-analysis-page">
        <PhotoHistoryStats />
      </main>
    </>
  )
}
