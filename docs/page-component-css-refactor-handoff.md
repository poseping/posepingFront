# Page/Component/CSS Refactor Handoff

이 문서는 현재 프론트엔드 정리 작업을 다른 담당자가 동일한 기준으로 재현하거나 Claude에게 지시할 수 있도록 정리한 인수인계 문서입니다.

## 1. Page와 Component 기능 구분 기준

### 기준

- `pages`는 라우트 단위 화면과 feature 흐름을 책임진다.
- 특정 페이지에서만 쓰이는 상태, API 호출, 단계 전환, 저장/삭제 같은 화면 흐름은 page 쪽에 둔다.
- `components`는 page 내부에서 반복되거나 독립적으로 읽기 쉬운 UI 단위만 둔다.
- 컴포넌트가 독립적으로 재사용될 가능성이 낮고 page 흐름과 강하게 묶여 있으면 page 내부 함수 또는 page 하위 컴포넌트로 유지한다.
- 컴포넌트를 나눌 때는 props가 과하게 늘어나지 않도록, 기능 단위가 명확한 경우에만 파일로 분리한다.

### 수정 방식

- 기존 `HistoryPage` 역할을 `PhotoPage`로 변경하고, 사진 분석 feature의 중심 page로 정리했다.
- 사진 분석 단계 화면은 `PhotoPage` 안에서 관리하도록 하고, 내부에서 분리 가능한 UI만 `PhotoAnalysis` 컴포넌트로 뺐다.
- 저장 기록 통계 화면은 별도 route page인 `PhotoHistoryStatsPage`로 유지했다.
- 기존 `PhotoSummaryCards`는 사진 분석 기록 요약 성격이므로 `History` 컴포넌트 영역으로 이동하고 `HistorySummaryCards`로 변경했다.
- `MyPage`는 계정/설정 기능을 직접 들고 있지 않고, 프로필/생활습관 카드만 조합하도록 정리했다.
- `SettingsPage`는 `MyPage` 하위 route 역할로 이동하고 계정 설정 액션을 담당하도록 정리했다.

### 실제 수정 파일

- `src/pages/PhotoPage.tsx`
- `src/pages/PhotoHistoryStatsPage.tsx`
- `src/pages/MyPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/AssistantPage.tsx`
- `src/App.tsx`
- `src/components/History/HistorySummaryCards.tsx`
- `src/components/PhotoAnalysis/EditableLandmarkCanvas.tsx`
- `src/components/PhotoAnalysis/PhotoAnalysisResultSummary.tsx`
- `src/components/PhotoAnalysis/PhotoHistoryRecordSummary.tsx`
- `src/components/PhotoAnalysis/SelectableTrendDot.tsx`
- `src/components/MyPage/MyProfileCard.tsx`
- `src/components/MyPage/MyHabitsCard.tsx`
- `src/components/PageHeader.tsx`
- `src/components/BottomNav.tsx`

## 2. 페이지 이름 변경 목록과 이유

### `HistoryPage` -> `PhotoPage`

- 변경 파일: `src/pages/HistoryPage.tsx` 삭제, `src/pages/PhotoPage.tsx` 추가
- route 변경: `/history` 계열에서 `/photo`, `/photo/stats` 중심으로 변경
- 이유: 해당 화면의 실제 기능이 전체 history 관리가 아니라 사진 자세 분석 feature였기 때문에 page 이름과 route를 기능 의미에 맞췄다.

### `OnboardingChatPage` 별칭 -> `AssistantPage`

- 변경 파일: `src/pages/AssistantPage.tsx`, `src/App.tsx`
- route 유지: `/onboarding`
- 이유: 내부적으로 같은 화면을 `OnboardingChatPage`, `AssistantPage`처럼 여러 이름으로 부르는 혼선을 줄이기 위해 `AssistantPage`로 통일했다.

### `SettingsPage` -> `MyPage` 하위 페이지

- 변경 파일: `src/pages/SettingsPage.tsx`, `src/App.tsx`, `src/pages/MyPage.tsx`
- route 변경: 설정 route를 `/mypage/settings`로 배치
- 이유: 설정은 독립 메인 탭이 아니라 사용자 계정 영역의 하위 기능이므로 `MyPage` 하위 페이지로 두는 것이 더 자연스럽다.

### `PhotoHistoryStatsPage`

- 변경 파일: `src/pages/PhotoHistoryStatsPage.tsx`
- route: `/photo/stats`
- 이유: 사진 분석 기록 통계는 `PhotoPage`의 step 화면이 아니라 저장 기록을 보는 독립 route 화면이므로 별도 page로 유지했다.

## 3. 요소 이동/변경 목록과 이유

### 실시간 분석 통계 요소 제거

- 대상: 기존 history/page 영역에 있던 실시간 분석 통계 카드
- 변경 파일: `src/components/History/HistorySummaryCards.tsx`
- 이유: 사진 분석 page 안에서 실시간 웹캠 분석 통계가 함께 노출되면 feature 경계가 섞인다. 사진 분석 화면에는 사진 분석 기록 요약만 남겼다.

### `PhotoSummaryCards` 이동 및 이름 변경

- 기존: `src/components/PhotoAnalysis/PhotoSummaryCards.tsx`
- 변경: `src/components/History/HistorySummaryCards.tsx`
- import 변경: `src/pages/PhotoPage.tsx`
- 이유: 카드가 사진 분석 실행 단계보다는 저장된 기록 요약 성격에 가깝기 때문에 `History` 폴더로 이동했다.

### 설정 진입점을 MyPage 카드로 이동

- 변경 파일: `src/components/MyPage/MyProfileCard.tsx`, `src/pages/MyPage.tsx`
- 변경 내용: MyPage 첫 번째 카드 우측 상단에 설정 아이콘 버튼 추가, 클릭 시 `/mypage/settings`로 이동
- 이유: 설정은 사용자 프로필/계정과 연결된 액션이므로 MyPage의 프로필 카드에서 접근하는 것이 명확하다.

### 로그아웃/회원탈퇴를 설정 페이지로 이동

- 변경 파일: `src/pages/SettingsPage.tsx`, `src/pages/MyPage.tsx`
- 변경 내용: MyPage에서 로그아웃/회원탈퇴 액션 제거, SettingsPage 안으로 이동
- 이유: destructive action과 계정 액션은 설정 화면에 모으는 것이 UX와 책임 분리가 명확하다.

### 설정 페이지 하단 돌아가기 버튼 추가

- 변경 파일: `src/pages/SettingsPage.tsx`
- 변경 내용: 계정 설정 카드 하단에 돌아가기 버튼 추가, 클릭 시 `/mypage`로 이동
- 이유: 설정을 MyPage 하위 화면으로 배치했기 때문에 상위 화면으로 돌아가는 명시적 경로가 필요하다.

### PageHeader 내 설정 탭 제거

- 변경 파일: `src/components/PageHeader.tsx`, `src/components/BottomNav.tsx`
- 변경 내용: 설정을 메인 navigation 항목에서 제거
- 이유: 설정이 MyPage 하위 기능으로 이동했으므로 전역 nav에 노출할 필요가 없어졌다.

## 4. CSS 이동/변경 목록과 이유

### `src/styles` 폴더 역할별 재구성

- 변경 파일:
  - `src/styles/main.scss`
  - `src/styles/base/global.scss`
  - `src/styles/layout/bottom-nav.scss`
  - `src/styles/layout/page-header.scss`
  - `src/styles/pages/admin.scss`
  - `src/styles/pages/first-login-choice.scss`
  - `src/styles/pages/home.scss`
  - `src/styles/pages/login.scss`
  - `src/styles/pages/my-page.scss`
  - `src/styles/pages/onboarding-chat.scss`
  - `src/styles/pages/settings.scss`
  - `src/styles/components/history-summary-cards.scss`
  - `src/styles/features/photo-analysis.scss`
  - `src/styles/features/webcam.scss`
- 변경 내용: 기존에 `src/styles` 루트에 섞여 있던 SCSS 파일들을 역할별 하위 폴더로 이동했다.
- 새 기준:
  - `base/`: 전역 token, reset, 공통 버튼/카드/모달 등 앱 전체에서 쓰는 스타일
  - `layout/`: 앱 레이아웃에 가까운 공통 UI 스타일
  - `pages/`: 특정 route page 전용 스타일
  - `components/`: 독립 컴포넌트 전용 스타일
  - `features/`: 여러 page/component가 공유하는 feature 단위 스타일
- 이유: `src/styles` 루트에 page, component, global, feature 스타일이 모두 섞여 있으면 CSS 소유권과 import 위치를 추적하기 어렵다. SCSS는 `public/assets` 같은 정적 결과물이 아니라 빌드 대상 소스이므로 `src/styles` 아래에 두되, 역할별 폴더로 나눠 관리한다.

### SCSS import 경로 변경

- 변경 파일:
  - `src/styles/main.scss`
  - `src/components/Webcam/WebcamStream.tsx`
  - `src/components/PageHeader.tsx`
  - `src/components/History/HistorySummaryCards.tsx`
  - `src/pages/AdminMembersPage.tsx`
  - `src/pages/AssistantPage.tsx`
  - `src/pages/FirstLoginChoicePage.tsx`
  - `src/pages/LoginPage.tsx`
  - `src/pages/MyPage.tsx`
  - `src/pages/PhotoPage.tsx`
  - `src/pages/PhotoHistoryStatsPage.tsx`
  - `src/pages/SettingsPage.tsx`
- 변경 내용:
  - `main.scss`의 `@use './global'` -> `@use './base/global'`
  - `main.scss`의 `@use './bottom-nav'` -> `@use './layout/bottom-nav'`
  - `main.scss`의 `@use './home'` -> `@use './pages/home'`
  - page SCSS import는 `../styles/pages/*.scss`로 변경
  - feature SCSS import는 `../styles/features/*.scss`로 변경
  - layout/component SCSS import는 `../styles/layout/*.scss`, `../../styles/components/*.scss`로 변경
- 이유: 파일을 이동한 뒤에도 route page와 component가 자기 소유 스타일 또는 필요한 feature 스타일을 명시적으로 import하도록 유지하기 위해서다.

### `photo-summary-cards.scss` -> `history-summary-cards.scss`

- 기존: `src/styles/photo-summary-cards.scss`
- 변경: `src/styles/components/history-summary-cards.scss`
- 연결 컴포넌트: `src/components/History/HistorySummaryCards.tsx`
- 이유: 컴포넌트 이름과 위치가 `HistorySummaryCards`로 바뀌었으므로 SCSS 파일명도 같은 의미로 맞췄다.

### `mp-*` selector -> `history-*` selector

- 변경 파일: `src/styles/components/history-summary-cards.scss`, `src/components/History/HistorySummaryCards.tsx`
- 변경 내용: `mp-kicker`, `mp-stats-title`, `mp-metrics`, `mp-score`, `mp-bar-*`, `mp-habit-footer` 등 Photo history 카드 내부 selector를 `history-*`로 변경
- 이유: `mp-*`는 MyPage 전용 prefix인데 사진 기록 요약 카드가 같은 prefix를 쓰면 `my-page.scss`와 의미/스타일 충돌 가능성이 생긴다.

### `photo-analysis.scss` import 복구

- 변경 파일: `src/pages/PhotoPage.tsx`, `src/pages/PhotoHistoryStatsPage.tsx`
- 변경 내용: 두 page 모두 `src/styles/features/photo-analysis.scss`를 직접 import
- 이유: `/photo/stats`는 `PhotoPage`의 자식 컴포넌트가 아니라 별도 route page이므로, 직접 진입 시 필요한 스타일을 스스로 import해야 한다.

### 전역 selector를 `global.scss`로 이동

- 변경 파일: `src/styles/base/global.scss`, `src/styles/pages/login.scss`, `src/styles/features/webcam.scss`
- 변경 내용:
  - `login.scss`의 전역 `.btn-icon` 스타일을 `base/global.scss`의 `.btn-icon`으로 이동
  - `webcam.scss`의 전역 `.btn--primary .svg-inline--fa` 스타일을 `base/global.scss`로 이동
- 이유: page/feature 전용 SCSS에 전역 selector가 있으면 SPA에서 다른 화면 스타일에 영향을 줄 수 있다. 전역 버튼/아이콘 규칙은 `global.scss`가 소유해야 한다.

### `my-page.scss` 정리

- 변경 파일: `src/styles/pages/my-page.scss`
- 변경 내용: MyPage 카드와 MyPage 하위 컴포넌트 스타일 중심으로 유지
- 이유: 로그아웃/회원탈퇴가 SettingsPage로 이동했으므로 MyPage는 프로필/생활습관 카드 스타일만 담당하도록 범위를 좁혔다.

### `settings.scss` 추가/확장

- 변경 파일: `src/styles/pages/settings.scss`
- 변경 내용: 설정 계정 카드, 액션 리스트, 회원탈퇴 확인 UI, 하단 돌아가기 버튼 스타일 추가
- 이유: 설정 화면으로 이동한 계정 액션의 스타일을 SettingsPage 소유 CSS로 분리하기 위해서다.

### Webcam 관련 전달 사항

- 변경 파일: `src/styles/features/webcam.scss`
- 이번 작업에서는 전역 selector 일부만 `base/global.scss`로 옮겼다.
- `webcam.scss`는 여전히 웹캠 화면, 가이드 모달, 프로필 모달, 통계, 아이콘 예외 스타일을 넓게 포함한다.
- 다른 담당자에게 전달할 권장 방향:
  - 전체 파일을 무리하게 쪼개지 않는다.
  - `PostureGuideModal`, `PostureProfileModal`, `WebcamStream`처럼 재사용 경계가 분명한 단위만 별도 SCSS로 분리한다.
  - 각 컴포넌트가 독립 사용될 수 있다면 해당 컴포넌트가 필요한 SCSS를 직접 import하게 한다.

## 5. Props 이동/변경/삭제 목록과 이유

### `PageHeader` props 제거

- 변경 파일: `src/components/PageHeader.tsx`
- 변경 내용: `title`, `description` 등 실제로 사용되지 않거나 화면에서 필요 없는 props 전달을 제거하고, `PageHeader`를 props 없는 공통 navigation header로 정리
- 호출부 변경 파일:
  - `src/pages/HomePage.tsx`
  - `src/pages/MainPage.tsx`
  - `src/pages/PhotoPage.tsx`
  - `src/pages/PhotoHistoryStatsPage.tsx`
  - `src/pages/MyPage.tsx`
  - `src/pages/SettingsPage.tsx`
  - `src/pages/AssistantPage.tsx`
  - `src/pages/FirstLoginChoicePage.tsx`
  - `src/pages/AdminDashboardPage.tsx`
  - `src/pages/AdminMembersPage.tsx`
- 이유: page title/description을 넘겨도 `PageHeader`에서 실질적으로 쓰지 않거나 UI 책임이 애매했다. Header는 navigation만 담당하게 하고, 화면별 설명은 각 page 본문에서 직접 관리하도록 했다.

### `MyProfileCard` props 추가

- 변경 파일: `src/components/MyPage/MyProfileCard.tsx`, `src/pages/MyPage.tsx`
- 추가 props: `onOpenSettings`
- 이유: 설정 버튼은 카드 내부 UI에 있지만 route 이동은 page가 책임지는 것이 맞다. 따라서 카드에는 콜백만 넘기고, 실제 navigation은 `MyPage`에서 처리한다.

### `MyHabitsCard` props 분리

- 변경 파일: `src/components/MyPage/MyHabitsCard.tsx`, `src/pages/MyPage.tsx`
- 주요 props: `habitData`, `habitLoading`, `onStartAnalysis`, `onRetakeHabits`
- 이유: 생활습관 카드가 데이터 표시와 버튼 UI만 담당하고, API 상태와 route 이동은 MyPage가 관리하도록 분리했다.

### `PhotoAnalysisResultSummary` props 정리

- 변경 파일: `src/components/PhotoAnalysis/PhotoAnalysisResultSummary.tsx`, `src/pages/PhotoPage.tsx`
- 주요 props: 분석 결과, assistant comment 상태, 저장 상태, 저장/다시 분석 콜백
- 이유: 결과 요약 UI는 컴포넌트로 분리하되, 분석 저장/assistant comment 호출 흐름은 PhotoPage가 유지하도록 했다.

### `EditableLandmarkCanvas` props 분리

- 변경 파일: `src/components/PhotoAnalysis/EditableLandmarkCanvas.tsx`, `src/pages/PhotoPage.tsx`
- 주요 props: 이미지 URL, landmark 목록, 선택/수정 상태, 편집 가능한 landmark id 목록
- 이유: canvas 편집 UI는 독립 컴포넌트로 둘 수 있지만, 어떤 단계에서 어떤 이미지를 편집하는지는 PhotoPage의 분석 흐름에 속한다.

### `PhotoHistoryRecordSummary` props 분리

- 변경 파일: `src/components/PhotoAnalysis/PhotoHistoryRecordSummary.tsx`, `src/pages/PhotoHistoryStatsPage.tsx`
- 주요 props: 선택된 기록, 삭제 진행 상태, 삭제 확인 상태, 삭제 요청/취소/실행 콜백
- 이유: 기록 상세 UI와 삭제 확인 UI는 컴포넌트가 담당하고, 삭제 mutation과 query invalidation은 page가 책임지도록 분리했다.

### `SelectableTrendDot` props 분리

- 변경 파일: `src/components/PhotoAnalysis/SelectableTrendDot.tsx`, `src/pages/PhotoHistoryStatsPage.tsx`
- 주요 props: recharts dot props, 선택된 history key, 선택 콜백
- 이유: 차트 점 선택 UI만 컴포넌트로 분리하고, 선택 상태는 `PhotoHistoryStatsPage`가 관리하도록 했다.

## 검증

- `npm run build` 통과
- 샌드박스 실행 시 `esbuild spawn EPERM`으로 실패할 수 있어, 동일 명령을 승인된 환경에서 재실행해 검증했다.
- Sass `legacy-js-api` deprecation warning은 남아 있으며, 이번 refactor 범위에는 포함하지 않았다.

## 추가 검토 지시문

위의 변경 사항을 확인하고, 이 문서에서 실제로 변경되지 않은 파일들을 모두 같은 기준으로 검토하시오.

검토 기준은 다음과 같다.

- page는 route 단위 화면과 feature 흐름을 책임지는지 확인한다.
- component는 page 내부에서 반복되거나 독립적으로 읽기 쉬운 UI 단위만 담당하는지 확인한다.
- page와 component 사이에 불필요하게 많은 props가 오가거나, page 흐름이 component 안으로 과하게 들어가 있지 않은지 확인한다.
- 이름이 실제 기능과 맞지 않는 page/component/file이 있는지 확인한다.
- CSS 파일명, import 위치, selector prefix가 실제 소유 컴포넌트나 page와 일치하는지 확인한다.
- 전역 selector가 page/feature 전용 SCSS 안에 남아 있지 않은지 확인한다.
- 특정 route page가 필요한 CSS를 직접 import하지 않아 단독 진입 시 스타일이 빠질 가능성이 있는지 확인한다.

검토 후 실제 변경은 하지 말고, 변경이 필요한 사항만 목록으로 정리하여 사용자에게 제공하시오.

각 항목에는 다음 내용을 포함하시오.

- 대상 파일
- 문제점
- 변경이 필요한 이유
- 권장 수정 방향
- 우선순위
