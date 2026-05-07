import React from 'react';
import { Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Colors } from '@/lib/colors';

export default function AuthLayout() {
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
      }}
    />
  );
}
