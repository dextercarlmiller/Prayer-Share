import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Colors } from '@/lib/colors';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { registerForPushNotifications, savePushToken, scheduleReminderNotification } from '@/lib/notifications';

const REMINDER_OPTIONS = [
  { label: '6:00 AM', value: '06:00' }, { label: '7:00 AM', value: '07:00' },
  { label: '8:00 AM', value: '08:00' }, { label: '9:00 AM', value: '09:00' },
  { label: '12:00 PM', value: '12:00' }, { label: '6:00 PM', value: '18:00' },
  { label: '9:00 PM', value: '21:00' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { profile, user, reset, setProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [reminderEnabled, setReminderEnabled] = useState(!!profile?.reminder_time);
  const [reminderTime, setReminderTime] = useState(profile?.reminder_time ?? '08:00');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!user) return;
    setIsSaving(true);
    await supabase.from('profiles').update({ display_name: displayName, reminder_time: reminderEnabled ? reminderTime : null }).eq('id', user.id);
    if (reminderEnabled) await scheduleReminderNotification(reminderTime);
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setProfile(data);
    setIsSaving(false);
    Alert.alert('Saved', 'Your profile has been updated.');
  }

  async function handleEnableNotifications() {
    if (!user) return;
    const token = await registerForPushNotifications();
    if (token) { await savePushToken(user.id, token); Alert.alert('Notifications Enabled', "You'll receive notifications for shared prayers."); }
    else Alert.alert('Permission Required', 'Please enable notifications in your device settings.');
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await supabase.auth.signOut(); reset(); router.replace('/(auth)/login'); } },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: palette.primary + '30', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 32, color: palette.primary }}>{profile?.display_name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: palette.text }}>{profile?.display_name}</Text>
          <Text style={{ fontSize: 14, color: palette.textMuted }}>@{profile?.username}</Text>
        </View>

        <Text style={{ fontSize: 16, fontWeight: '700', color: palette.text, marginBottom: 12 }}>Profile</Text>
        <Input label="Display Name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />

        <View style={{ borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 20, marginTop: 8, marginBottom: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: palette.text, marginBottom: 16 }}>Notifications</Text>
          <TouchableOpacity onPress={handleEnableNotifications}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: palette.surface, borderRadius: 10, marginBottom: 12 }}>
            <Text style={{ flex: 1, color: palette.text, fontSize: 15 }}>Enable Push Notifications</Text>
            <Text style={{ color: palette.primary }}>→</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: palette.surface, borderRadius: 10, marginBottom: 12 }}>
            <Text style={{ flex: 1, color: palette.text, fontSize: 15 }}>Daily Prayer Reminder</Text>
            <Switch value={reminderEnabled} onValueChange={setReminderEnabled} trackColor={{ true: palette.primary }} thumbColor="#FFF" />
          </View>
          {reminderEnabled && (
            <View>
              <Text style={{ fontSize: 14, color: palette.textMuted, marginBottom: 8 }}>Reminder time</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {REMINDER_OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt.value} onPress={() => setReminderTime(opt.value)}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: reminderTime === opt.value ? palette.primary : palette.border, backgroundColor: reminderTime === opt.value ? palette.primary + '20' : 'transparent' }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: reminderTime === opt.value ? palette.primary : palette.textMuted }}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <Button title="Save Changes" onPress={handleSave} isLoading={isSaving} style={{ marginBottom: 16 }} />
        <Button title="Sign Out" variant="ghost" onPress={handleSignOut} style={{ marginBottom: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
