import type { AdminMember } from '../../services/adminService'

const providerLabels: Record<string, string> = {
  KAKAO: '카카오',
  GOOGLE: '구글',
}

const getMemberId = (member: AdminMember): string => {
  const id = member.member_no ?? member.member_id ?? member.id
  return id == null ? '-' : String(id)
}

const getMemberNumericId = (member: AdminMember): number | null => {
  const id = member.member_id ?? member.member_no ?? member.id
  return typeof id === 'number' ? id : null
}

const formatDate = (value?: string | null): string => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}


interface AdminMembersTableProps {
  paginatedMembers: AdminMember[]
  selectedIds: Set<number>
  isPageAllSelected: boolean
  currentPage: number
  totalPages: number
  onTogglePage: () => void
  onToggleMember: (memberId: number) => void
  onPageChange: React.Dispatch<React.SetStateAction<number>>
}

export default function AdminMembersTable({
  paginatedMembers,
  selectedIds,
  isPageAllSelected,
  currentPage,
  totalPages,
  onTogglePage: togglePage,
  onToggleMember: toggleMember,
  onPageChange,
}: AdminMembersTableProps) {
  return (
    <>
<div className="admin-members__table-wrap">
              <table className="admin-members__table">
                <thead>
                  <tr>
                    <th scope="col">
                      <input
                        type="checkbox"
                        checked={isPageAllSelected}
                        onChange={togglePage}
                        aria-label="현재 페이지 회원 전체 선택"
                      />
                    </th>
                    <th scope="col">회원번호</th>
                    <th scope="col">닉네임</th>
                    <th scope="col">이메일</th>
                    <th scope="col">가입 경로</th>
                    <th scope="col">권한</th>
                    <th scope="col">상태</th>
                    <th scope="col">최근 로그인</th>
                    <th scope="col">가입일</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.map((member, index) => {
                    const memberId = getMemberNumericId(member)
                    const isSelected = memberId !== null && selectedIds.has(memberId)

                    return (
                      <tr key={`${getMemberId(member)}-${index}`}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={memberId === null}
                            onChange={() => memberId !== null && toggleMember(memberId)}
                            aria-label={`${getMemberId(member)} 회원 선택`}
                          />
                        </td>
                        <td>{getMemberId(member)}</td>
                        <td>{member.nickname || '-'}</td>
                        <td>{member.email || '-'}</td>
                        <td>{providerLabels[String(member.provider ?? '').toUpperCase()] ?? member.provider ?? '-'}</td>
                        <td>
                          <span className={`admin-members__role admin-members__role--${member.role?.toLowerCase() === 'admin' ? 'admin' : 'user'}`}>
                            {member.role || '-'}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-members__status admin-members__status--${member.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                            {member.status || '-'}
                          </span>
                        </td>
                        <td>{formatDate(member.last_login_at)}</td>
                        <td>{formatDate(member.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="admin-members__pagination" aria-label="회원 목록 페이지네이션">
              <button type="button" onClick={() => onPageChange((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                이전
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button type="button" onClick={() => onPageChange((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                다음
              </button>
            </div>
    </>
  )
}
