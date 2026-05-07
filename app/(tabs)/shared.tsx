import React, { useCallback, useEffect } from 'react';
import { FlatList, RefreshControl, View, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth';
import { usePrayersStore } from '@/store/prayers';
import { fetchSharedWithMe } from '@/lib/prayerQueries';
import { Colors } from '@/lib/colors';
import { PrayerCard } from '@/components/PrayerCard';
import { EmptyState } from '@/components/EmptyState';
import type { PrayerItemWithMeta } from '@/types';

export default function SharedWithMeScreen() {
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuthStore();
  const { sharedWithMe, setSharedWithMe, isLoading, setLoading } = usePrayersStore();

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { const items = await fetchSharedWithMe(user.id); setSharedWithMe(items); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (isLoading && sharedWithMe.length === 0) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}><ActivityIndicator color={palette.primary} /></View>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['bottom']}>
      <FlatList
        data={sharedWithMe}
        keyExtractor={(item: PrayerItemWithMeta) => item.id}
        renderItem={({ item }) => <PrayerCard item={item} />}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={<EmptyState emoji="🤝" title="Nothing shared with you yet" subtitle="When a friend shares a prayer request, it will appear here." />}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} tintColor={palette.primary} />}
      />
    </SafeAreaView>
  );
}
