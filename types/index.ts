export type PrayerCategory =
  | 'Health'
  | 'Family'
  | 'Work'
  | 'Relationships'
  | 'Financial'
  | 'Spiritual'
  | 'Other';

export type PrayerItemType = 'request' | 'praise';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  push_token: string | null;
  reminder_time: string | null;
  created_at: string;
}

export interface PrayerItem {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: PrayerCategory;
  type: PrayerItemType;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  prayer_count?: number;
  owner?: Profile;
  shared_by?: Profile;
}

export interface PrayerShare {
  id: string;
  prayer_item_id: string;
  shared_with_user_id: string;
  shared_at: string;
}

export interface PrayerCount {
  id: string;
  prayer_item_id: string;
  prayed_by_user_id: string;
  prayed_at: string;
}

export interface Invite {
  id: string;
  created_by: string;
  email: string | null;
  token: string;
  prayer_item_id: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface PrayerItemWithMeta extends PrayerItem {
  prayer_count: number;
  has_prayed: boolean;
  owner: Profile;
}
