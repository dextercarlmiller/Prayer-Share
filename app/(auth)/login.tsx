import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
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
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setIsLoading(false);

    if (error) {
      Alert.alert('Sign In Failed', error.message);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>🙏</Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '700',
                color: palette.text,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Prayer Share
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: palette.textMuted,
                textAlign: 'center',
                marginBottom: 40,
                lineHeight: 22,
              }}
            >
              Lift each other up in prayer
            </Text>

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  placeholder="••••••••"
                  secureTextEntry
                  autoComplete="password"
                  error={errors.password?.message}
                />
              )}
            />

            <Button
              title="Sign In"
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
              style={{ marginTop: 8, marginBottom: 16 }}
            />

            <View
              style={{
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: 12,
                padding: 14,
                alignItems: 'center',
                marginBottom: 24,
                opacity: 0.6,
              }}
            >
              <Text style={{ color: palette.textMuted, fontSize: 15 }}>
                🍎  Continue with Apple  (coming soon)
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/signup')}
              style={{ alignItems: 'center' }}
            >
              <Text style={{ color: palette.textMuted, fontSize: 15 }}>
                Don't have an account?{' '}
                <Text style={{ color: palette.primary, fontWeight: '600' }}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
