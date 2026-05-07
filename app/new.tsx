import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Colors, CategoryColors } from '@/lib/colors';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import type { PrayerCategory, PrayerItemType } from '@/types';

const CATEGORIES: PrayerCategory[] = ['Health', 'Family', 'Work', 'Relationships', 'Financial', 'Spiritual', 'Other'];

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(120),
  description: z.string().max(1000).optional(),
  category: z.enum(['Health', 'Family', 'Work', 'Relationships', 'Financial', 'Spiritual', 'Other']),
});

type FormData = z.infer<typeof schema>;

export default function NewPrayerScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [itemType, setItemType] = useState<PrayerItemType>('request');

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'Spiritual' },
  });

  async function onSubmit(data: FormData) {
    if (!user) return;
    setIsLoading(true);
    const { error } = await supabase.from('prayer_items').insert({
      owner_id: user.id, title: data.title,
      description: data.description ?? '', category: data.category,
      type: itemType, is_resolved: false,
    });
    setIsLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', backgroundColor: palette.surface, borderRadius: 12, padding: 4, marginBottom: 24 }}>
            {(['request', 'praise'] as PrayerItemType[]).map((t) => (
              <TouchableOpacity key={t} onPress={() => setItemType(t)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center', backgroundColor: itemType === t ? palette.primary : 'transparent' }}>
                <Text style={{ fontWeight: '600', fontSize: 14, color: itemType === t ? '#FFF' : palette.textMuted }}>
                  {t === 'request' ? '🙏 Prayer Request' : '🌟 Praise Report'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Controller control={control} name="title"
            render={({ field: { onChange, value } }) => (
              <Input
                label={itemType === 'request' ? 'What do you need prayer for?' : 'What are you praising God for?'}
                value={value} onChangeText={onChange}
                placeholder={itemType === 'request' ? 'e.g. Healing for my mother' : 'e.g. Got the job I prayed for!'}
                error={errors.title?.message} />
            )}
          />
          <Controller control={control} name="description"
            render={({ field: { onChange, value } }) => (
              <Input label="Details (optional)" value={value} onChangeText={onChange}
                placeholder="Share as much or as little as you'd like..."
                multiline numberOfLines={5}
                style={{ height: 120, textAlignVertical: 'top', paddingTop: 12 }}
                error={errors.description?.message} />
            )}
          />

          <Text style={{ fontSize: 14, fontWeight: '500', color: palette.text, marginBottom: 10 }}>Category</Text>
          <Controller control={control} name="category"
            render={({ field: { onChange, value } }) => (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {CATEGORIES.map((cat) => {
                  const color = CategoryColors[cat] ?? '#6B7280';
                  const selected = value === cat;
                  return (
                    <TouchableOpacity key={cat} onPress={() => onChange(cat)}
                      style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: selected ? color : palette.border, backgroundColor: selected ? color + '20' : 'transparent' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? color : palette.textMuted }}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          />

          <Button title={itemType === 'request' ? 'Share Prayer Request' : 'Share Praise Report'}
            onPress={handleSubmit(onSubmit)} isLoading={isLoading} />
          <TouchableOpacity onPress={() => router.back()} style={{ alignItems: 'center', marginTop: 16 }}>
            <Text style={{ color: palette.textMuted, fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
