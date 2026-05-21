import React from 'react';
import { View, Text } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}

const LETTERS = ['k', 'v', 'i', 't', 't', 'r'];
const COLORS = ['#4B3B8C', '#E05C7A', '#F4A13A', '#7B6BB5', '#5B8DD9', '#2AB5A5'];
const fontSizes: Record<string, number> = { small: 18, medium: 26, large: 36 };

export const Logo: React.FC<LogoProps> = ({ size = 'medium' }) => {
  const fontSize = fontSizes[size];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {LETTERS.map((letter, i) => (
        <Text
          key={i}
          style={{ fontSize, fontWeight: '800', color: COLORS[i], letterSpacing: -0.5 }}
        >
          {letter}
        </Text>
      ))}
    </View>
  );
};
