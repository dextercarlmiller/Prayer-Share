import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Colors } from '@/lib/colors';

interface ThemedViewProps extends ViewProps {
  lightColor?: string;
  darkColor?: string;
}

export function ThemedView({ style, lightColor, darkColor, ...props }: ThemedViewProps) {
  const { colorScheme } = useColorScheme();
  const bg = colorScheme === 'dark'
    ? (darkColor ?? Colors.dark.background)
    : (lightColor ?? Colors.light.background);

  return <View style={[{ backgroundColor: bg }, style]} {...props} />;
}
