import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      Toast.show({ type: 'error', text1: 'Innlogging feilet', text2: error.message });
    } else {
      router.replace('/(app)/dashboard');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-12 pb-8">
            <View className="items-center mb-10">
              <Logo size="large" />
            </View>

            <Text className="text-2xl font-bold text-foreground mb-2">Logg inn</Text>
            <Text className="text-muted-foreground mb-8">Velkommen tilbake til Kvittr</Text>

            <View className="gap-4">
              <Input
                label="E-post"
                value={email}
                onChangeText={setEmail}
                placeholder="din@epost.no"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Input
                label="Passord"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="current-password"
              />
            </View>

            <TouchableOpacity
              className="mt-3 self-end"
              onPress={() => router.push('/(auth)/reset-password')}
            >
              <Text className="text-primary text-sm">Glemt passord?</Text>
            </TouchableOpacity>

            <View className="mt-8 gap-3">
              <Button onPress={handleLogin} loading={loading} disabled={!email.trim() || !password}>
                Logg inn
              </Button>

              <View className="flex-row items-center gap-3 my-2">
                <View className="flex-1 h-px bg-border" />
                <Text className="text-muted-foreground text-sm">eller</Text>
                <View className="flex-1 h-px bg-border" />
              </View>

              <Button variant="outline" onPress={() => router.replace('/(app)/dashboard')}>
                Fortsett som gjest
              </Button>
            </View>

            <View className="flex-row justify-center mt-8">
              <Text className="text-muted-foreground">Har du ikke konto? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text className="text-primary font-medium">Registrer deg</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
