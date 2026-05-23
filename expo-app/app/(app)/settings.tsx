import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import {
  Crown,
  Bell,
  LogOut,
  Trash2,
  ChevronRight,
  User,
  Shield,
  Bug,
  X,
  Copy,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { disablePushNotifications } from '@/hooks/usePushNotifications';
import { showCustomerCenterUI } from '@/lib/revenuecat';
import { clearGuestData } from '@/lib/guestStorage';
import { getDebugLogs, clearDebugLogs } from '@/lib/debugLog';
import { getThemePreference, setThemePreference, type ThemePreference } from '@/lib/themeStore';

function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  rightElement,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center px-4 py-4 bg-card border-b border-border"
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View className="w-8 items-center mr-4">{icon}</View>
      <View className="flex-1">
        <Text className={`text-base ${destructive ? 'text-destructive' : 'text-foreground'}`}>
          {label}
        </Text>
        {sublabel && (
          <Text className="text-muted-foreground text-sm mt-0.5">{sublabel}</Text>
        )}
      </View>
      {rightElement ?? (onPress && <ChevronRight size={18} color="#94A3B8" />)}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="px-4 pt-6 pb-2">
      <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </Text>
    </View>
  );
}

function DebugLogModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      getDebugLogs().then((lines) => {
        setLogs(lines);
        setLoading(false);
      });
    }
  }, [visible]);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(logs.join('\n'));
      Toast.show({ type: 'success', text1: 'Kopiert til utklippstavle' });
    } catch {
      // expo-clipboard not available — fall back to Share
      try {
        await Share.share({ message: logs.join('\n') });
      } catch {}
    }
  };

  const handleClear = () => {
    Alert.alert('Tøm logg', 'Er du sikker?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Tøm',
        style: 'destructive',
        onPress: async () => {
          await clearDebugLogs();
          setLogs([]);
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F1729' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#1E2A45',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
            Feilsøkingslogg
          </Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TouchableOpacity onPress={handleCopy}>
              <Copy size={20} color="#94A3B8" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClear}>
              <Trash2 size={20} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#6366F1" style={{ marginTop: 40 }} />
        ) : logs.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#64748B', fontSize: 14 }}>Ingen logger ennå</Text>
          </View>
        ) : (
          <FlatList
            data={logs}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => (
              <Text
                selectable
                style={{
                  color: item.includes('ERROR') || item.includes('error') ? '#EF4444'
                    : item.includes('WARN') || item.includes('warn') ? '#F59E0B'
                    : '#94A3B8',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  lineHeight: 18,
                  marginBottom: 2,
                }}
              >
                {item}
              </Text>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { value: 'system', label: 'System', icon: <Monitor size={16} color="#64748B" /> },
  { value: 'light', label: 'Lys', icon: <Sun size={16} color="#64748B" /> },
  { value: 'dark', label: 'Mørk', icon: <Moon size={16} color="#64748B" /> },
];

export default function SettingsScreen() {
  const { user, isAuthenticated } = useAuth();
  const { isPremium } = usePremiumStatus();
  const [signingOut, setSigningOut] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [debugLogVisible, setDebugLogVisible] = useState(false);
  const [themePref, setThemePref] = useState<ThemePreference>('system');

  useEffect(() => {
    getThemePreference().then(setThemePref);
  }, []);

  const handleThemeChange = async (pref: ThemePreference) => {
    setThemePref(pref);
    await setThemePreference(pref);
  };

  const handleSignOut = async () => {
    Alert.alert('Logg ut', 'Er du sikker på at du vil logge ut?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Logg ut',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          if (user?.id) await disablePushNotifications(user.id).catch(() => null);
          await supabase.auth.signOut();
          setSigningOut(false);
          router.replace('/(app)/dashboard');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Slett konto',
      'Dette vil permanent slette kontoen din og alle dine data. Handlingen kan ikke angres.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett konto',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.functions.invoke('delete-account');
              if (error) throw error;
              await supabase.auth.signOut();
              router.replace('/(app)/dashboard');
              Toast.show({ type: 'success', text1: 'Konto slettet' });
            } catch {
              Toast.show({ type: 'error', text1: 'Sletting feilet', text2: 'Kontakt support.' });
            }
          },
        },
      ],
    );
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    if (!value && user?.id) {
      await disablePushNotifications(user.id).catch(() => null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView>
        <View className="px-4 py-6">
          <Text className="text-2xl font-bold text-foreground">Innstillinger</Text>
        </View>

        {/* Account */}
        <SectionHeader title="Konto" />
        <View className="mx-4 rounded-2xl overflow-hidden border border-border">
          {isAuthenticated ? (
            <>
              <SettingsRow
                icon={<User size={20} color="#64748B" />}
                label={user?.email ?? 'Innlogget'}
                sublabel="E-postadresse"
              />
              {isPremium ? (
                <SettingsRow
                  icon={<Crown size={20} color="#F59E0B" />}
                  label="Premium aktiv"
                  sublabel="Administrer abonnement"
                  onPress={() => showCustomerCenterUI().catch(() => null)}
                />
              ) : (
                <SettingsRow
                  icon={<Crown size={20} color="#6366F1" />}
                  label="Oppgrader til Premium"
                  sublabel="Ubegrenset skanning og mer"
                  onPress={() => router.push('/(app)/premium')}
                />
              )}
            </>
          ) : (
            <>
              <SettingsRow
                icon={<User size={20} color="#64748B" />}
                label="Gjest"
                sublabel="Logg inn for å synkronisere data"
                onPress={() => router.push('/(auth)/login')}
              />
              <SettingsRow
                icon={<Crown size={20} color="#6366F1" />}
                label="Oppgrader til Premium"
                sublabel="Ubegrenset skanning og mer"
                onPress={() => router.push('/(app)/premium')}
              />
            </>
          )}
        </View>

        {/* Notifications */}
        <SectionHeader title="Varsler" />
        <View className="mx-4 rounded-2xl overflow-hidden border border-border">
          <SettingsRow
            icon={<Bell size={20} color="#64748B" />}
            label="Push-varsler"
            sublabel="Få beskjed før garantier utløper"
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ true: '#6366F1' }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* Appearance */}
        <SectionHeader title="Utseende" />
        <View className="mx-4 rounded-2xl overflow-hidden border border-border bg-card">
          <View className="px-4 py-4">
            <Text className="text-sm text-muted-foreground mb-3">Fargemodus</Text>
            <View className="flex-row gap-2">
              {THEME_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => handleThemeChange(opt.value)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: themePref === opt.value ? '#6366F1' : 'transparent',
                    borderColor: themePref === opt.value ? '#6366F1' : '#E2E8F0',
                  }}
                >
                  {React.cloneElement(opt.icon as React.ReactElement, {
                    color: themePref === opt.value ? '#fff' : '#64748B',
                  })}
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '500',
                      color: themePref === opt.value ? '#fff' : '#64748B',
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Legal */}
        <SectionHeader title="Juridisk" />
        <View className="mx-4 rounded-2xl overflow-hidden border border-border">
          <SettingsRow
            icon={<Shield size={20} color="#64748B" />}
            label="Personvernerklæring"
            onPress={() => {}}
          />
          <SettingsRow
            icon={<Shield size={20} color="#64748B" />}
            label="Vilkår for bruk"
            onPress={() => {}}
          />
        </View>

        {/* Developer */}
        <SectionHeader title="Utvikler" />
        <View className="mx-4 rounded-2xl overflow-hidden border border-border">
          <SettingsRow
            icon={<Bug size={20} color="#64748B" />}
            label="Vis feilsøkingslogg"
            sublabel="Teknisk logg for feilsøking"
            onPress={() => setDebugLogVisible(true)}
          />
        </View>

        {/* Account actions */}
        {isAuthenticated && (
          <>
            <SectionHeader title="Konto-handlinger" />
            <View className="mx-4 rounded-2xl overflow-hidden border border-border">
              <SettingsRow
                icon={
                  signingOut ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <LogOut size={20} color="#EF4444" />
                  )
                }
                label="Logg ut"
                onPress={handleSignOut}
                destructive
              />
              <SettingsRow
                icon={<Trash2 size={20} color="#EF4444" />}
                label="Slett konto"
                sublabel="Permanent sletting av alle data"
                onPress={handleDeleteAccount}
                destructive
              />
            </View>
          </>
        )}

        {!isAuthenticated && (
          <TouchableOpacity
            onPress={async () => {
              await clearGuestData();
              Toast.show({ type: 'success', text1: 'Lokal data slettet' });
            }}
            className="mx-4 mt-4 rounded-2xl border border-border overflow-hidden"
          >
            <SettingsRow
              icon={<Trash2 size={20} color="#EF4444" />}
              label="Slett lokal data"
              sublabel="Fjerner gjestdata fra denne enheten"
              destructive
            />
          </TouchableOpacity>
        )}

        <View className="h-8" />
      </ScrollView>

      <DebugLogModal visible={debugLogVisible} onClose={() => setDebugLogVisible(false)} />
    </SafeAreaView>
  );
}
