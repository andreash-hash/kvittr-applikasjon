import React, { useRef } from 'react';
import { View, TouchableOpacity, Text, Alert } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Trash2, Archive } from 'lucide-react-native';

interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  onArchive?: () => void;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onDelete,
  onArchive,
}) => {
  const swipeableRef = useRef<Swipeable>(null);

  const close = () => swipeableRef.current?.close();

  const handleDelete = () => {
    close();
    Alert.alert(
      'Slett kvittering',
      'Er du sikker? Dette kan ikke angres.',
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Slett', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  const renderRightActions = () => (
    <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
      {onArchive && (
        <TouchableOpacity
          style={{
            width: 80,
            backgroundColor: '#D97706',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          activeOpacity={0.8}
          onPress={() => { close(); onArchive(); }}
        >
          <Archive size={20} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>Arkiver</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={{
          width: 80,
          backgroundColor: '#EF4444',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        activeOpacity={0.8}
        onPress={handleDelete}
      >
        <Trash2 size={20} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>Slett</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ marginBottom: 12, borderRadius: 16, overflow: 'hidden' }}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        containerStyle={{ borderRadius: 16, overflow: 'hidden' }}
      >
        {children}
      </Swipeable>
    </View>
  );
};
