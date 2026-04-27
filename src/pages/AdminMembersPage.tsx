import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import PageHeader from '../components/PageHeader'
import { getAdminMembers, updateAdminMember, AdminMember, UpdateAdminMemberRequest } from '../services/adminService'
import '../styles/admin.scss'

const PAGE_SIZE = 10
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

export default function AdminMembersPage() {
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [providerFilter, setProviderFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [roleTarget, setRoleTarget] = useState<'ADMIN' | 'USER'>('USER')
  const [statusTarget, setStatusTarget] = useState<'ACTIVE' | 'INACTIVE'>('INACTIVE')

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

  const filteredMembers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return members.filter((member) => {
      const provider = String(member.provider ?? '').toUpperCase()
      const matchesProvider = providerFilter ? provider === providerFilter : true
      const matchesSearch = normalizedSearch
        ? getMemberId(member).toLowerCase().includes(normalizedSearch) ||
          String(member.nickname ?? '').toLowerCase().includes(normalizedSearch)
        : true

      return matchesProvider && matchesSearch
    })
  }, [members, providerFilter, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selectablePageIds = paginatedMembers
    .map(getMemberNumericId)
    .filter((id): id is number => id !== null)
  const isPageAllSelected = selectablePageIds.length > 0 && selectablePageIds.every((id) => selectedIds.has(id))
  const selectedCount = selectedIds.size
  const errorMessage = error instanceof Error ? error.message : '회원 목록을 불러오지 못했습니다.'

  const updateMembersMutation = useMutation({
    mutationFn: async (data: UpdateAdminMemberRequest) => {
      const ids = Array.from(selectedIds)
      await Promise.all(ids.map((memberId) => updateAdminMember(memberId, data)))
    },
    onSuccess: () => {
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['admin-members'] })
    },
  })

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setPage(1)
    setSelectedIds(new Set())
  }

  const handleProviderChange = (value: string) => {
    setProviderFilter(value)
    setPage(1)
    setSelectedIds(new Set())
  }

  const toggleMember = (memberId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  const togglePage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (isPageAllSelected) {
        selectablePageIds.forEach((id) => next.delete(id))
      } else {
        selectablePageIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const handleRoleUpdate = () => {
    updateMembersMutation.mutate({ role: roleTarget })
  }

  const handleStatusUpdate = () => {
    updateMembersMutation.mutate({ status: statusTarget })
  }

  return (
    <>
      <PageHeader title="관리자" description="현재 가입한 회원 목록을 확인하세요" />
      <main className="admin-members">
        <section className="admin-members__toolbar" aria-label="회원 목록 요약">
          <div>
            <p className="admin-members__eyebrow">Members</p>
            <h2>가입 회원</h2>
          </div>
          <div className="admin-members__count">{members.length.toLocaleString('ko-KR')}</div>
        </section>

        <section className="admin-members__controls" aria-label="회원 검색 및 일괄 작업">
          <div className="admin-members__filters">
            <select
              value={providerFilter}
              onChange={(event) => handleProviderChange(event.target.value)}
              aria-label="가입 경로"
            >
              <option value="">가입경로 전체</option>
              <option value="KAKAO">카카오</option>
              <option value="GOOGLE">구글</option>
            </select>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="회원 번호 또는 닉네임 검색"
            />
          </div>

          <div className="admin-members__actions">
            <span className="admin-members__selected">{selectedCount.toLocaleString('ko-KR')}명 선택</span>
            <select
              value={roleTarget}
              onChange={(event) => setRoleTarget(event.target.value as 'ADMIN' | 'USER')}
              aria-label="변경할 권한"
            >
              <option value="ADMIN">admin</option>
              <option value="USER">user</option>
            </select>
            <button type="button" onClick={handleRoleUpdate} disabled={selectedCount === 0 || updateMembersMutation.isPending}>
              권한 변경
            </button>
            <select
              value={statusTarget}
              onChange={(event) => setStatusTarget(event.target.value as 'ACTIVE' | 'INACTIVE')}
              aria-label="차단 상태"
            >
              <option value="INACTIVE">차단</option>
              <option value="ACTIVE">차단 해제</option>
            </select>
            <button type="button" onClick={handleStatusUpdate} disabled={selectedCount === 0 || updateMembersMutation.isPending}>
              차단
            </button>
          </div>
        </section>

        {updateMembersMutation.isError && (
          <div className="admin-members__state admin-members__state--error">
            선택한 회원 정보를 변경하지 못했습니다.
          </div>
        )}

        {isLoading && <div className="admin-members__state">회원 목록을 불러오는 중입니다.</div>}

        {isError && (
          <div className="admin-members__state admin-members__state--error">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => void refetch()}>
              다시 시도
            </button>
          </div>
        )}

        {!isLoading && !isError && filteredMembers.length === 0 && (
          <div className="admin-members__state">가입한 회원이 없습니다.</div>
        )}

        {!isLoading && !isError && filteredMembers.length > 0 && (
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
              <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                이전
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                다음
              </button>
            </div>
          </>
        )}
      </main>
    </>
  )
}
