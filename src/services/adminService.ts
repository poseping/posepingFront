import apiClient from './api'

export interface AdminMember {
  member_no?: number
  member_id?: number
  id?: number
  provider?: string
  nickname?: string | null
  email?: string | null
  profile_image_url?: string | null
  role?: string | null
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
