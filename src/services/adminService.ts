import apiClient from './api'

export interface AdminMember {
  member_no?: number
  member_id?: number
  id?: number
  provider?: string
  provider_user_id?: string
  nickname?: string | null
  email?: string | null
  name?: string | null
  profile_image_url?: string | null
  role?: string | null
  status?: string | null
  last_login_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: unknown
}

type AdminMembersPayload = AdminMember[] | {
  members?: AdminMember[]
  data?: AdminMember[]
  items?: AdminMember[]
}

export const getAdminMembers = async (): Promise<AdminMember[]> => {
  const response = await apiClient.get<AdminMembersPayload>('/admin/members')
  const payload = response.data

  if (Array.isArray(payload)) {
    return payload
  }

  return payload.members ?? payload.data ?? payload.items ?? []
}

export interface UpdateAdminMemberRequest {
  role?: 'ADMIN' | 'USER'
  status?: 'ACTIVE' | 'INACTIVE'
}

export const updateAdminMember = async (
  memberId: number,
  data: UpdateAdminMemberRequest,
): Promise<AdminMember> => {
  const response = await apiClient.patch<AdminMember>(`/admin/members/${memberId}`, data)
  return response.data
}
