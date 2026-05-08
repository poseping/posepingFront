import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import PageHeader from '../components/PageHeader'
import AdminMembersControls from '../components/Admin/AdminMembersControls'
import AdminMembersTable from '../components/Admin/AdminMembersTable'
import { getAdminMembers, updateAdminMember, AdminMember, UpdateAdminMemberRequest } from '../services/adminService'
import '../styles/pages/admin.scss'

const PAGE_SIZE = 10
const getMemberId = (member: AdminMember): string => {
  const id = member.member_no ?? member.member_id ?? member.id
  return id == null ? '-' : String(id)
}

const getMemberNumericId = (member: AdminMember): number | null => {
  const id = member.member_id ?? member.member_no ?? member.id
  return typeof id === 'number' ? id : null
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
      <PageHeader />
      <main className="admin-members">
        <section className="admin-members__toolbar" aria-label="회원 목록 요약">
          <div>
            <p className="admin-members__eyebrow">Members</p>
            <h2>가입 회원</h2>
          </div>
          <div className="admin-members__count">{members.length.toLocaleString('ko-KR')}</div>
        </section>

        <AdminMembersControls
          providerFilter={providerFilter}
          searchTerm={searchTerm}
          selectedCount={selectedCount}
          roleTarget={roleTarget}
          statusTarget={statusTarget}
          isUpdatePending={updateMembersMutation.isPending}
          onProviderChange={handleProviderChange}
          onSearchChange={handleSearchChange}
          onRoleTargetChange={setRoleTarget}
          onStatusTargetChange={setStatusTarget}
          onRoleUpdate={handleRoleUpdate}
          onStatusUpdate={handleStatusUpdate}
        />

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
            <AdminMembersTable
              paginatedMembers={paginatedMembers}
              selectedIds={selectedIds}
              isPageAllSelected={isPageAllSelected}
              currentPage={currentPage}
              totalPages={totalPages}
              onTogglePage={togglePage}
              onToggleMember={toggleMember}
              onPageChange={setPage}
            />
          </>
        )}
      </main>
    </>
  )
}
