import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, TouchableOpacity } from 'react-native';
import { Home, ScanLine, Settings } from 'lucide-react-native';
import { useHaptics } from '@/hooks/useHaptics';
import { registerForPushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';

function TabBarButton({
  onPress,
  children,
  accessibilityState,
}: {
  onPress: () => void;
  children: React.ReactNode;
  accessibilityState?: { selected?: boolean };
}) {
  const { selection } = useHaptics();
  return (
    <TouchableOpacity
      onPress={() => {
        selection();
        onPress();
      }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      accessibilityState={accessibilityState}
    >
      {children}
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications(user.id).catch(() => null);
    }
  }, [user?.id]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          paddingBottom: 4,
          height: 60,
        },
        tabBarButton: (props) => (
          <TabBarButton onPress={props.onPress!} accessibilityState={props.accessibilityState}>
            {props.children}
          </TabBarButton>
        ),
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Hjem',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Skann',
          tabBarIcon: ({ color }) => (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#6366F1',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                shadowColor: '#6366F1',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <ScanLine size={26} color="#fff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Innstillinger',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="item/[id]" options={{ href: null }} />
      <Tabs.Screen name="premium" options={{ href: null }} />
    </Tabs>
  );
}
