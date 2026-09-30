import React from 'react';
import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => (
  <View
    className={`rounded-2xl bg-card shadow-sm ${className ?? ''}`}
    style={{ elevation: 2 }}
    {...props}
  >
    {children}
  </View>
);

export const CardContent: React.FC<CardProps> = ({ children, className, ...props }) => (
  <View className={`p-4 ${className ?? ''}`} {...props}>
    {children}
  </View>
);

export const CardHeader: React.FC<CardProps> = ({ children, className, ...props }) => (
  <View className={`px-4 pt-4 pb-2 ${className ?? ''}`} {...props}>
    {children}
  </View>
);
