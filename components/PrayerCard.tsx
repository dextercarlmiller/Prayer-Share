import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Colors, CategoryColors } from '@/lib/colors';
import type { PrayerItemWithMeta } from '@/types';

interface PrayerCardProps {
  item: PrayerItemWithMeta;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PrayerCard({ item }: PrayerCardProps) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const categoryColor = CategoryColors[item.category] ?? '#6B7280';

  return (
    <TouchableOpacity
      onPress={() => router.push(`/request/${item.id}`)}
      style={{
        backgroundColor: palette.cardBg,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: palette.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
        <View
          style={{
            backgroundColor: categoryColor + '20',
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 3,
            marginRight: 8,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: categoryColor }}>
            {item.category}
          </Text>
        </View>
        {item.type === 'praise' && (
          <View
            style={{
              backgroundColor: '#D97706' + '20',
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#D97706' }}>Praise</Text>
          </View>
        )}
      </View>

      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: palette.text,
          marginBottom: 4,
          lineHeight: 22,
        }}
        numberOfLines={2}
      >
        {item.title}
      </Text>

      {item.description ? (
        <Text
          style={{
            fontSize: 14,
            color: palette.textMuted,
            lineHeight: 20,
            marginBottom: 12,
          }}
          numberOfLines={2}
        >
          {item.description}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: palette.textLight }}>
          {item.owner?.display_name ?? 'You'} · {formatDate(item.created_at)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: palette.primary ?? '#D97706' }}>
            🙏 {item.prayer_count}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
