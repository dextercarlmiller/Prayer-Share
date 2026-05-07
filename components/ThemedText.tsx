import React from 'react';
import { Text, type TextProps } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Colors } from '@/lib/colors';

interface ThemedTextProps extends TextProps {
  variant?: 'default' | 'muted' | 'light';
}

export function ThemedText({ style, variant = 'default', ...props }: ThemedTextProps) {
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const color =
    variant === 'muted'
      ? palette.textMuted
      : variant === 'light'
      ? palette.textLight
      : palette.text;

  return <Text style={[{ color }, style]} {...props} />;
}
