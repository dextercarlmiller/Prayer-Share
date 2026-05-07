import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  isLoading?: boolean;
}

const styles = {
  primary: {
    bg: '#D97706',
    text: '#FFFFFF',
    border: '#D97706',
  },
  secondary: {
    bg: '#F5E6D3',
    text: '#92400E',
    border: '#E8D5BC',
  },
  ghost: {
    bg: 'transparent',
    text: '#D97706',
    border: 'transparent',
  },
  danger: {
    bg: '#FEE2E2',
    text: '#DC2626',
    border: '#FCA5A5',
  },
};

export function Button({ title, variant = 'primary', isLoading, disabled, style, ...props }: ButtonProps) {
  const s = styles[variant];

  return (
    <TouchableOpacity
      disabled={disabled || isLoading}
      style={[
        {
          backgroundColor: s.bg,
          borderWidth: 1,
          borderColor: s.border,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 24,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          opacity: disabled || isLoading ? 0.6 : 1,
        },
        style,
      ]}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={s.text} size="small" />
      ) : (
        <Text style={{ color: s.text, fontSize: 16, fontWeight: '600' }}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
