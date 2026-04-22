import PhotoAnalysisStudio from '../components/PhotoAnalysis/PhotoAnalysisStudio'
import PageHeader from '../components/PageHeader'
import '../styles/page-header.css'

export default function HistoryPage() {
  return (
    <div className="app">
        <PageHeader title="사진 분석" description="정면과 측면 사진으로 자세를 분석합니다." />
        <div className={"sub"}>
            <PhotoAnalysisStudio />
        </div>
    </div>
  )
}
