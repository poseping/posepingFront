import PhotoAnalysisStudio from '../components/PhotoAnalysis/PhotoAnalysisStudio'
import PageHeader from '../components/PageHeader'

export default function HistoryPage() {
  return (
    <>
      <PageHeader title="사진 분석" description="정면과 측면 사진으로 자세를 분석합니다." />
      <main>
        <PhotoAnalysisStudio />
      </main>
    </>
  )
}
