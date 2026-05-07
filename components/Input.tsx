import React from 'react';
import { TextInput, View, Text, type TextInputProps } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Colors } from '@/lib/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={{ marginBottom: 16 }}>
      {label ? (
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: palette.text,
            marginBottom: 6,
          }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        style={[
          {
            backgroundColor: palette.cardBg,
            borderWidth: 1,
            borderColor: error ? '#EF4444' : palette.border,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: palette.text,
          },
          style,
        ]}
        placeholderTextColor={palette.textLight}
        {...props}
      />
      {error ? (
        <Text style={{ fontSize: 13, color: '#EF4444', marginTop: 4 }}>{error}</Text>
      ) : null}
    </View>
  );
}
