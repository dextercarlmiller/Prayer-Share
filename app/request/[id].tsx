import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { usePrayersStore } from '@/store/prayers';
import { Colors, CategoryColors } from '@/lib/colors';
import { Button } from '@/components/Button';
import type { PrayerItemWithMeta, Profile } from '@/types';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuthStore();
  const { updateItem } = usePrayersStore();

  const [item, setItem] = useState<PrayerItemWithMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [prayLoading, setPrayLoading] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [sharedWith, setSharedWith] = useState<Profile[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const isOwner = user?.id === item?.owner_id;

  const load = useCallback(async () => {
    setLoading(true);
    const { data: itemData, error } = await supabase.from('prayer_items')
      .select('*, owner:profiles!owner_id(id, display_name, username, avatar_url)')
      .eq('id', id).single();
    if (error || !itemData) { setLoading(false); return; }
    const [{ data: counts }, { data: userPrayed }] = await Promise.all([
      supabase.from('prayer_counts').select('id').eq('prayer_item_id', id),
      supabase.from('prayer_counts').select('id').eq('prayer_item_id', id).eq('prayed_by_user_id', user?.id ?? ''),
    ]);
    setItem({ ...itemData, prayer_count: counts?.length ?? 0, has_prayed: (userPrayed?.length ?? 0) > 0 } as PrayerItemWithMeta);
    setLoading(false);
  }, [id, user?.id]);

  const loadSharedWith = useCallback(async () => {
    if (!isOwner) return;
    const { data } = await supabase.from('prayer_shares')
      .select('profile:profiles!shared_with_user_id(id, display_name, username, avatar_url)')
      .eq('prayer_item_id', id);
    type ShareRow = { profile: Profile | null };
    setSharedWith((data ?? []).map((row) => (row as unknown as ShareRow).profile).filter((p): p is Profile => p !== null));
  }, [id, isOwner]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (item) loadSharedWith(); }, [item, loadSharedWith]);
  useEffect(() => { if (item) navigation.setOptions({ title: item.type === 'praise' ? 'Praise Report' : 'Prayer Request' }); }, [item, navigation]);

  async function handlePray() {
    if (!user || !item) return;
    setPrayLoading(true);
    if (item.has_prayed) {
      await supabase.from('prayer_counts').delete().eq('prayer_item_id', id).eq('prayed_by_user_id', user.id);
      const updated = { ...item, prayer_count: item.prayer_count - 1, has_prayed: false };
      setItem(updated); updateItem(id, { prayer_count: updated.prayer_count, has_prayed: false });
    } else {
      await supabase.from('prayer_counts').insert({ prayer_item_id: id, prayed_by_user_id: user.id });
      const updated = { ...item, prayer_count: item.prayer_count + 1, has_prayed: true };
      setItem(updated); updateItem(id, { prayer_count: updated.prayer_count, has_prayed: true });
    }
    setPrayLoading(false);
  }

  async function handleResolve() {
    Alert.alert('Mark as Answered?', 'This will move the prayer to your Archive. You can still view it there.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Answered', onPress: async () => { await supabase.from('prayer_items').update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq('id', id); router.back(); } },
    ]);
  }

  async function handleDelete() {
    Alert.alert('Delete Prayer?', 'This will permanently delete this prayer request.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('prayer_items').delete().eq('id', id); router.back(); } },
    ]);
  }

  async function searchUsers(query: string) {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase.from('profiles').select('id, display_name, username, avatar_url').ilike('username', `%${query}%`).neq('id', user?.id ?? '').limit(10);
    setSearchResults((data ?? []) as Profile[]);
  }

  async function shareWithUser(profile: Profile) {
    setShareLoading(true);
    const { error } = await supabase.from('prayer_shares').insert({ prayer_item_id: id, shared_with_user_id: profile.id });
    if (!error) { setSharedWith((prev) => [...prev, profile]); setSearchQuery(''); setSearchResults([]); }
    setShareLoading(false);
  }

  async function sendEmailInvite() {
    if (!inviteEmail.trim()) return;
    setShareLoading(true);
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await supabase.from('invites').insert({ created_by: user?.id, email: inviteEmail.trim(), token, prayer_item_id: id });
    setShareLoading(false); setInviteEmail('');
    Alert.alert('Invite Sent', `An invitation has been sent to ${inviteEmail.trim()}.`);
  }

  async function copyShareLink() {
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await supabase.from('invites').insert({ created_by: user?.id, email: null, token, prayer_item_id: id });
    await Clipboard.setStringAsync(`prayershare://invite/${token}`);
    Alert.alert('Link Copied', 'Share link copied to clipboard.');
  }

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}><ActivityIndicator color={palette.primary} /></View>;
  if (!item) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}><Text style={{ color: palette.textMuted }}>Prayer request not found.</Text></View>;

  const categoryColor = CategoryColors[item.category] ?? '#6B7280';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <View style={{ backgroundColor: categoryColor + '20', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: categoryColor }}>{item.category}</Text>
          </View>
          {item.type === 'praise' && <View style={{ backgroundColor: '#D97706' + '20', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}><Text style={{ fontSize: 13, fontWeight: '600', color: '#D97706' }}>🌟 Praise Report</Text></View>}
          {item.is_resolved && <View style={{ backgroundColor: '#10B98120', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}><Text style={{ fontSize: 13, fontWeight: '600', color: '#10B981' }}>✅ Answered</Text></View>}
        </View>

        <Text style={{ fontSize: 22, fontWeight: '700', color: palette.text, lineHeight: 30, marginBottom: 8 }}>{item.title}</Text>
        <Text style={{ fontSize: 13, color: palette.textLight, marginBottom: 20 }}>{item.owner?.display_name ?? 'Unknown'} · {formatDate(item.created_at)}</Text>
        {item.description ? <Text style={{ fontSize: 16, color: palette.textMuted, lineHeight: 26, marginBottom: 28 }}>{item.description}</Text> : null}

        {!item.is_resolved && (
          <TouchableOpacity onPress={handlePray} disabled={prayLoading}
            style={{ backgroundColor: item.has_prayed ? palette.surface : palette.primary, borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 16, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <Text style={{ fontSize: 22 }}>🙏</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: item.has_prayed ? palette.text : '#FFF' }}>
              {item.has_prayed ? `Prayed (${item.prayer_count})` : `I Prayed for This · ${item.prayer_count}`}
            </Text>
          </TouchableOpacity>
        )}

        {isOwner && !item.is_resolved && (
          <>
            <Button title="Share with a Friend" variant="secondary" onPress={() => setShowShare(true)} style={{ marginBottom: 12 }} />
            <Button title="Mark as Answered ✅" variant="secondary" onPress={handleResolve} style={{ marginBottom: 12 }} />
            <Button title="Delete Prayer" variant="danger" onPress={handleDelete} />
          </>
        )}
      </ScrollView>

      <Modal visible={showShare} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowShare(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: palette.border }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: palette.text }}>Share with a Friend</Text>
            <TouchableOpacity onPress={() => setShowShare(false)}><Text style={{ color: palette.primary, fontSize: 16 }}>Done</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: palette.text, marginBottom: 8 }}>Find by username</Text>
            <TextInput value={searchQuery} onChangeText={searchUsers} placeholder="Search username..."
              placeholderTextColor={palette.textLight}
              style={{ backgroundColor: palette.surface, borderRadius: 10, padding: 12, fontSize: 15, color: palette.text, marginBottom: 8, borderWidth: 1, borderColor: palette.border }} />
            {searchResults.map((profile) => (
              <TouchableOpacity key={profile.id} onPress={() => shareWithUser(profile)} disabled={shareLoading}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: palette.cardBg, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: palette.border }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: palette.primary + '30', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ fontSize: 16, color: palette.primary }}>{profile.display_name[0]?.toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: palette.text }}>{profile.display_name}</Text>
                  <Text style={{ fontSize: 13, color: palette.textMuted }}>@{profile.username}</Text>
                </View>
                <Text style={{ marginLeft: 'auto', color: palette.primary, fontSize: 13 }}>+ Share</Text>
              </TouchableOpacity>
            ))}
            {sharedWith.length > 0 && (
              <>
                <Text style={{ fontSize: 14, fontWeight: '600', color: palette.text, marginTop: 16, marginBottom: 8 }}>Shared with</Text>
                {sharedWith.map((profile) => (
                  <View key={profile.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: palette.surface, borderRadius: 10, marginBottom: 8 }}>
                    <Text style={{ flex: 1, color: palette.text }}>{profile.display_name} <Text style={{ color: palette.textMuted }}>@{profile.username}</Text></Text>
                    <TouchableOpacity onPress={async () => { await supabase.from('prayer_shares').delete().eq('prayer_item_id', id).eq('shared_with_user_id', profile.id); setSharedWith((p) => p.filter((x) => x.id !== profile.id)); }}>
                      <Text style={{ color: '#EF4444', fontSize: 13 }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
            <Text style={{ fontSize: 14, fontWeight: '600', color: palette.text, marginTop: 20, marginBottom: 8 }}>Invite by email</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput value={inviteEmail} onChangeText={setInviteEmail} placeholder="friend@example.com"
                placeholderTextColor={palette.textLight} keyboardType="email-address" autoCapitalize="none"
                style={{ flex: 1, backgroundColor: palette.surface, borderRadius: 10, padding: 12, fontSize: 15, color: palette.text, borderWidth: 1, borderColor: palette.border }} />
              <TouchableOpacity onPress={sendEmailInvite} disabled={shareLoading}
                style={{ backgroundColor: palette.primary, borderRadius: 10, padding: 12, justifyContent: 'center' }}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Send</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={copyShareLink}
              style={{ marginTop: 16, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: palette.border, alignItems: 'center' }}>
              <Text style={{ color: palette.primary, fontSize: 15, fontWeight: '500' }}>🔗 Copy Invite Link</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
