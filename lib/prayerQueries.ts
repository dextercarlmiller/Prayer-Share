import { supabase } from './supabase';
import type { PrayerItemWithMeta } from '@/types';

// Raw shape returned by Supabase for a prayer_item row with joined owner + count
interface RawPrayerItem {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  owner: { id: string; display_name: string; username: string; avatar_url: string | null } | null;
  prayer_count: { count: number }[] | number | null;
}

const ITEM_SELECT = `
  id, owner_id, title, description, category, type, is_resolved, resolved_at, created_at, updated_at,
  owner:profiles!owner_id(id, display_name, username, avatar_url),
  prayer_count:prayer_counts(count)
`;

export async function fetchMyRequests(userId: string): Promise<PrayerItemWithMeta[]> {
  const { data, error } = await supabase
    .from('prayer_items')
    .select(ITEM_SELECT)
    .eq('owner_id', userId)
    .eq('type', 'request')
    .eq('is_resolved', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return normalizeItems((data ?? []) as unknown as RawPrayerItem[]);
}

export async function fetchSharedWithMe(userId: string): Promise<PrayerItemWithMeta[]> {
  const { data, error } = await supabase
    .from('prayer_shares')
    .select(`prayer_item:prayer_items!prayer_item_id(${ITEM_SELECT})`)
    .eq('shared_with_user_id', userId);

  if (error) throw error;

  const items = (data ?? [])
    .map((row) => (row as unknown as { prayer_item: RawPrayerItem }).prayer_item)
    .filter((item): item is RawPrayerItem => item !== null && !item.is_resolved && item.type === 'request');

  return normalizeItems(items);
}

export async function fetchPraiseReports(userId: string): Promise<PrayerItemWithMeta[]> {
  const [{ data: owned }, { data: shared }] = await Promise.all([
    supabase
      .from('prayer_items')
      .select(ITEM_SELECT)
      .eq('owner_id', userId)
      .eq('type', 'praise')
      .eq('is_resolved', false),
    supabase
      .from('prayer_shares')
      .select(`prayer_item:prayer_items!prayer_item_id(${ITEM_SELECT})`)
      .eq('shared_with_user_id', userId),
  ]);

  const sharedPraise = (shared ?? [])
    .map((row) => (row as unknown as { prayer_item: RawPrayerItem }).prayer_item)
    .filter((item): item is RawPrayerItem => item !== null && item.type === 'praise' && !item.is_resolved);

  const all = [...((owned ?? []) as unknown as RawPrayerItem[]), ...sharedPraise];
  const unique = Array.from(new Map(all.map((i) => [i.id, i])).values());
  unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return normalizeItems(unique);
}

export async function fetchArchived(userId: string): Promise<PrayerItemWithMeta[]> {
  const { data, error } = await supabase
    .from('prayer_items')
    .select(ITEM_SELECT)
    .eq('owner_id', userId)
    .eq('is_resolved', true)
    .order('resolved_at', { ascending: false });

  if (error) throw error;
  return normalizeItems((data ?? []) as unknown as RawPrayerItem[]);
}

function normalizeItems(items: RawPrayerItem[]): PrayerItemWithMeta[] {
  return items.map((item) => {
    let count = 0;
    if (Array.isArray(item.prayer_count) && item.prayer_count.length > 0) {
      count = item.prayer_count[0].count ?? 0;
    } else if (typeof item.prayer_count === 'number') {
      count = item.prayer_count;
    }

    return {
      id: item.id,
      owner_id: item.owner_id,
      title: item.title,
      description: item.description,
      category: item.category as PrayerItemWithMeta['category'],
      type: item.type as PrayerItemWithMeta['type'],
      is_resolved: item.is_resolved,
      resolved_at: item.resolved_at,
      created_at: item.created_at,
      updated_at: item.updated_at,
      owner: {
        id: item.owner?.id ?? item.owner_id,
        display_name: item.owner?.display_name ?? 'Unknown',
        username: item.owner?.username ?? '',
        avatar_url: item.owner?.avatar_url ?? null,
        push_token: null,
        reminder_time: null,
        created_at: item.created_at,
      },
      prayer_count: count,
      has_prayed: false,
    };
  });
}
