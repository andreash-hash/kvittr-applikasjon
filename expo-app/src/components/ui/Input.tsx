import React from 'react';
import { TextInput, View, Text, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  return (
    <View className="gap-1">
      {label && <Text className="text-sm font-medium text-foreground">{label}</Text>}
      <TextInput
        className={`h-12 rounded-xl border border-border bg-card px-4 text-foreground ${error ? 'border-destructive' : ''} ${className ?? ''}`}
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
      {error && <Text className="text-xs text-destructive">{error}</Text>}
    </View>
  );
};
