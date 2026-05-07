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
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function SignupScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    setIsLoading(false);

    if (error) {
      Alert.alert('Sign Up Failed', error.message);
      return;
    }

    router.replace('/(auth)/onboarding');
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
            <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24 }}>
              <Text style={{ color: palette.primary, fontSize: 16 }}>← Back</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 26, fontWeight: '700', color: palette.text, marginBottom: 8 }}>
              Create Account
            </Text>
            <Text style={{ fontSize: 15, color: palette.textMuted, marginBottom: 32, lineHeight: 22 }}>
              Join a community of prayer and encouragement
            </Text>

            <Controller control={control} name="email"
              render={({ field: { onChange, value } }) => (
                <Input label="Email" value={value} onChangeText={onChange}
                  placeholder="you@example.com" keyboardType="email-address"
                  autoCapitalize="none" autoComplete="email" error={errors.email?.message} />
              )}
            />
            <Controller control={control} name="password"
              render={({ field: { onChange, value } }) => (
                <Input label="Password" value={value} onChangeText={onChange}
                  placeholder="At least 8 characters" secureTextEntry error={errors.password?.message} />
              )}
            />
            <Controller control={control} name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <Input label="Confirm Password" value={value} onChangeText={onChange}
                  placeholder="Re-enter your password" secureTextEntry error={errors.confirmPassword?.message} />
              )}
            />

            <Button title="Create Account" onPress={handleSubmit(onSubmit)}
              isLoading={isLoading} style={{ marginTop: 8 }} />

            <TouchableOpacity onPress={() => router.push('/(auth)/login')}
              style={{ alignItems: 'center', marginTop: 20 }}>
              <Text style={{ color: palette.textMuted, fontSize: 15 }}>
                Already have an account?{' '}
                <Text style={{ color: palette.primary, fontWeight: '600' }}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
