import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/lib/colors';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

const schema = z.object({
  display_name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores'),
});

type FormData = z.infer<typeof schema>;

export default function OnboardingScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { Alert.alert('Error', 'Not signed in.'); setIsLoading(false); return; }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: data.display_name,
      username: data.username.toLowerCase(),
      created_at: new Date().toISOString(),
    });
    setIsLoading(false);

    if (error) {
      Alert.alert(error.code === '23505' ? 'Username Taken' : 'Error',
        error.code === '23505' ? 'That username is already in use.' : error.message);
      return;
    }
    router.replace('/(tabs)/');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 16 }}>✨</Text>
            <Text style={{ fontSize: 26, fontWeight: '700', color: palette.text, marginBottom: 8 }}>
              Set Up Your Profile
            </Text>
            <Text style={{ fontSize: 15, color: palette.textMuted, marginBottom: 32, lineHeight: 22 }}>
              Let others know who's lifting them up in prayer
            </Text>

            <Controller control={control} name="display_name"
              render={({ field: { onChange, value } }) => (
                <Input label="Your Name" value={value} onChangeText={onChange}
                  placeholder="e.g. Sarah Johnson" autoComplete="name" error={errors.display_name?.message} />
              )}
            />
            <Controller control={control} name="username"
              render={({ field: { onChange, value } }) => (
                <Input label="Username" value={value} onChangeText={(t) => onChange(t.toLowerCase())}
                  placeholder="e.g. sarahjohnson" autoCapitalize="none" autoCorrect={false}
                  error={errors.username?.message} />
              )}
            />

            <Text style={{ fontSize: 13, color: palette.textLight, marginBottom: 24, lineHeight: 18 }}>
              Your username lets friends find you and share prayer requests with you directly.
            </Text>

            <Button title="Let's Go 🙏" onPress={handleSubmit(onSubmit)} isLoading={isLoading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
