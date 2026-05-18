export interface Profile {
  id: string
  first_name: string
  email: string
  created_at: string
}

export interface PrayerRequest {
  id: string
  user_id: string
  group_id: string | null
  title: string
  details: string | null
  is_answered: boolean
  answered_at: string | null
  is_archived: boolean
  created_at: string
  profiles?: Pick<Profile, 'id' | 'first_name'>
  prayed_for_count?: number
  user_has_prayed_today?: boolean
}

export interface PrayerGroup {
  id: string
  name: string
  created_by: string
  created_at: string
  member_count?: number
  latest_request_at?: string | null
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  profiles?: Pick<Profile, 'id' | 'first_name' | 'email'>
}

export interface GroupInvite {
  id: string
  group_id: string
  invited_email: string
  invited_by: string
  token: string
  accepted: boolean
  created_at: string
  prayer_groups?: Pick<PrayerGroup, 'id' | 'name'>
  profiles?: Pick<Profile, 'first_name'>
}

export interface PrayedForEvent {
  id: string
  request_id: string
  user_id: string
  date: string
}

export interface Notification {
  id: string
  user_id: string
  message: string
  request_id: string | null
  is_read: boolean
  created_at: string
}

export type AuthFormMode = 'login' | 'signup' | 'reset'
