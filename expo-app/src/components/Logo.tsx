import React from 'react';
import { View, Text } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}

const sizeMap = {
  small: { container: 'h-8 w-8 rounded-lg', text: 'text-base font-bold', label: 'text-base font-bold ml-2' },
  medium: { container: 'h-12 w-12 rounded-xl', text: 'text-xl font-bold', label: 'text-xl font-bold ml-3' },
  large: { container: 'h-16 w-16 rounded-2xl', text: 'text-3xl font-bold', label: 'text-3xl font-bold ml-4' },
};

export const Logo: React.FC<LogoProps> = ({ size = 'medium' }) => {
  const s = sizeMap[size];
  return (
    <View className="flex-row items-center">
      <View className={`${s.container} bg-primary items-center justify-center`}>
        <Text className={`${s.text} text-white`}>K</Text>
      </View>
      <Text className={`${s.label} text-foreground`}>Kvittr</Text>
    </View>
  );
};
