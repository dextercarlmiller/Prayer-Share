import React, { useCallback, useEffect } from 'react';
import { FlatList, RefreshControl, View, Text, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth';
import { usePrayersStore } from '@/store/prayers';
import { fetchPraiseReports } from '@/lib/prayerQueries';
import { Colors } from '@/lib/colors';
import { PrayerCard } from '@/components/PrayerCard';
import { EmptyState } from '@/components/EmptyState';
import type { PrayerItemWithMeta } from '@/types';

export default function PraiseReportsScreen() {
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuthStore();
  const { praiseReports, setPraiseReports, isLoading, setLoading } = usePrayersStore();

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { const items = await fetchPraiseReports(user.id); setPraiseReports(items); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (isLoading && praiseReports.length === 0) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}><ActivityIndicator color={palette.primary} /></View>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['bottom']}>
      <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 4, backgroundColor: '#D9770615', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, marginRight: 8 }}>🌟</Text>
        <Text style={{ color: '#92400E', fontSize: 14, lineHeight: 20, flex: 1 }}>Celebrate answered prayers and God's faithfulness</Text>
      </View>
      <FlatList
        data={praiseReports}
        keyExtractor={(item: PrayerItemWithMeta) => item.id}
        renderItem={({ item }) => <PrayerCard item={item} />}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={<EmptyState emoji="🌟" title="No praise reports yet" subtitle="Share what God has done — celebrate answered prayers with your community." />}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} tintColor={palette.primary} />}
      />
    </SafeAreaView>
  );
}
