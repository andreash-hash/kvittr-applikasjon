import React from 'react';
import Svg, { Text, Defs, LinearGradient, Stop } from 'react-native-svg';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'splash';
}

const fontSizes: Record<string, number> = { small: 18, medium: 26, large: 36, splash: 52 };

// Approximate rendered width of "kvittr" in bold at each font size
const widths: Record<string, number> = { small: 66, medium: 95, large: 132, splash: 190 };

export const Logo: React.FC<LogoProps> = ({ size = 'medium' }) => {
  const fontSize = fontSizes[size];
  const width = widths[size];
  const height = Math.ceil(fontSize * 1.25);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="kvittr-grad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor="#4B3B8C" />
          <Stop offset="25%" stopColor="#E05C7A" />
          <Stop offset="55%" stopColor="#F4A13A" />
          <Stop offset="80%" stopColor="#5B8DD9" />
          <Stop offset="100%" stopColor="#2AB5A5" />
        </LinearGradient>
      </Defs>
      <Text
        x="0"
        y={fontSize}
        fontSize={fontSize}
        fontWeight="800"
        fill="url(#kvittr-grad)"
        letterSpacing="-0.5"
      >
        kvittr
      </Text>
    </Svg>
  );
};
