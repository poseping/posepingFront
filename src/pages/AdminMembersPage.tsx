import { useQuery } from '@tanstack/react-query'
import PageHeader from '../components/PageHeader'
import { getAdminMembers, AdminMember } from '../services/adminService'
import '../styles/page-header.css'
import '../styles/admin-members.css'

const getMemberId = (member: AdminMember): string => {
  const id = member.member_no ?? member.member_id ?? member.id
  return id == null ? '-' : String(id)
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

export default function AdminMembersPage() {
  const {
    data: members = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-members'],
    queryFn: getAdminMembers,
  })

  const errorMessage = error instanceof Error ? error.message : '회원 목록을 불러오지 못했습니다.'

  return (
    <>
      <PageHeader title="관리자" description="현재 가입한 회원 목록을 확인하세요" />
      <main className="admin-members">
        <section className="admin-members__toolbar" aria-label="회원 목록 요약">
          <div>
            <p className="admin-members__eyebrow">Members</p>
            <h2 className="admin-members__title">가입 회원</h2>
          </div>
          <div className="admin-members__count">{members.length.toLocaleString('ko-KR')}</div>
        </section>

        {isLoading && <div className="admin-members__state">회원 목록을 불러오는 중입니다.</div>}

        {isError && (
          <div className="admin-members__state admin-members__state--error">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => void refetch()}>
              다시 시도
            </button>
          </div>
        )}

        {!isLoading && !isError && members.length === 0 && (
          <div className="admin-members__state">가입한 회원이 없습니다.</div>
        )}

        {!isLoading && !isError && members.length > 0 && (
          <div className="admin-members__table-wrap">
            <table className="admin-members__table">
              <thead>
                <tr>
                  <th scope="col">회원번호</th>
                  <th scope="col">닉네임</th>
                  <th scope="col">이메일</th>
                  <th scope="col">가입 경로</th>
                  <th scope="col">권한</th>
                  <th scope="col">가입일</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, index) => (
                  <tr key={`${getMemberId(member)}-${index}`}>
                    <td>{getMemberId(member)}</td>
                    <td>{member.nickname || '-'}</td>
                    <td>{member.email || '-'}</td>
                    <td>{member.provider || '-'}</td>
                    <td>
                      <span className={`admin-members__role admin-members__role--${member.role?.toLowerCase() === 'admin' ? 'admin' : 'user'}`}>
                        {member.role || '-'}
                      </span>
                    </td>
                    <td>{formatDate(member.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}
