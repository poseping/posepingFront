interface AdminMembersControlsProps {
  providerFilter: string
  searchTerm: string
  selectedCount: number
  roleTarget: 'ADMIN' | 'USER'
  statusTarget: 'ACTIVE' | 'INACTIVE'
  isUpdatePending: boolean
  onProviderChange: (value: string) => void
  onSearchChange: (value: string) => void
  onRoleTargetChange: (value: 'ADMIN' | 'USER') => void
  onStatusTargetChange: (value: 'ACTIVE' | 'INACTIVE') => void
  onRoleUpdate: () => void
  onStatusUpdate: () => void
}

export default function AdminMembersControls({
  providerFilter,
  searchTerm,
  selectedCount,
  roleTarget,
  statusTarget,
  isUpdatePending,
  onProviderChange,
  onSearchChange,
  onRoleTargetChange,
  onStatusTargetChange,
  onRoleUpdate,
  onStatusUpdate,
}: AdminMembersControlsProps) {
  return (
<section className="admin-members__controls" aria-label="회원 검색 및 일괄 작업">
          <div className="admin-members__filters">
            <select
              value={providerFilter}
              onChange={(event) => onProviderChange(event.target.value)}
              aria-label="가입 경로"
            >
              <option value="">가입경로 전체</option>
              <option value="KAKAO">카카오</option>
              <option value="GOOGLE">구글</option>
            </select>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="회원 번호 또는 닉네임 검색"
            />
          </div>

          <div className="admin-members__actions">
            <span className="admin-members__selected">{selectedCount.toLocaleString('ko-KR')}명 선택</span>
            <select
              value={roleTarget}
              onChange={(event) => onRoleTargetChange(event.target.value as 'ADMIN' | 'USER')}
              aria-label="변경할 권한"
            >
              <option value="ADMIN">admin</option>
              <option value="USER">user</option>
            </select>
            <button type="button" onClick={onRoleUpdate} disabled={selectedCount === 0 || isUpdatePending}>
              권한 변경
            </button>
            <select
              value={statusTarget}
              onChange={(event) => onStatusTargetChange(event.target.value as 'ACTIVE' | 'INACTIVE')}
              aria-label="차단 상태"
            >
              <option value="INACTIVE">차단</option>
              <option value="ACTIVE">차단 해제</option>
            </select>
            <button type="button" onClick={onStatusUpdate} disabled={selectedCount === 0 || isUpdatePending}>
              차단
            </button>
          </div>
        </section>
  )
}
