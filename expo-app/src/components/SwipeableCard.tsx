import React, { useRef } from 'react';
import {
  Animated,
  PanResponder,
  View,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Trash2, Archive } from 'lucide-react-native';

interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  onArchive?: () => void;
  disabled?: boolean;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onDelete,
  onArchive,
  disabled = false,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, gs) => !disabled && Math.abs(gs.dx) > 10,
      onPanResponderMove: (_e, gs) => {
        if (gs.dx < 0) {
          translateX.setValue(Math.max(gs.dx, -160));
        }
      },
      onPanResponderRelease: (_e, gs) => {
        if (gs.dx < -80) {
          Animated.spring(translateX, { toValue: -160, useNativeDriver: true }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const close = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
  };

  return (
    <View className="relative mb-2 overflow-hidden rounded-2xl">
      {/* Hidden action buttons */}
      <View className="absolute right-0 top-0 bottom-0 flex-row items-center">
        {onArchive && (
          <TouchableOpacity
            className="bg-category-return w-20 h-full items-center justify-center"
            onPress={() => { close(); onArchive(); }}
          >
            <Archive size={20} color="#fff" />
            <Text className="text-white text-xs mt-1">Arkiver</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          className="bg-destructive w-20 h-full items-center justify-center"
          onPress={() => { close(); onDelete(); }}
        >
          <Trash2 size={20} color="#fff" />
          <Text className="text-white text-xs mt-1">Slett</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
};
