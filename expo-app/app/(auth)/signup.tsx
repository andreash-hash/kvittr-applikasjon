import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password) return;
    if (password !== confirm) {
      Toast.show({ type: 'error', text1: 'Passordene stemmer ikke' });
      return;
    }
    if (password.length < 8) {
      Toast.show({ type: 'error', text1: 'Passordet må være minst 8 tegn' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: 'kvittr://verify-success' },
    });
    setLoading(false);

    if (error) {
      Toast.show({ type: 'error', text1: 'Registrering feilet', text2: error.message });
    } else {
      Toast.show({
        type: 'success',
        text1: 'Sjekk e-posten din',
        text2: 'Vi har sendt deg en bekreftelseslenke.',
      });
      router.replace('/(auth)/login');
    }
  };

  const canSubmit = email.trim() && password && confirm && password === confirm;

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

            <Text className="text-2xl font-bold text-foreground mb-2">Opprett konto</Text>
            <Text className="text-muted-foreground mb-8">
              Lagre kvitteringene dine trygt i skyen
            </Text>

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
                placeholder="Minst 8 tegn"
                secureTextEntry
                autoComplete="new-password"
              />
              <Input
                label="Bekreft passord"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <View className="mt-8 gap-3">
              <Button onPress={handleSignup} loading={loading} disabled={!canSubmit}>
                Registrer deg
              </Button>

              <Button variant="ghost" onPress={() => router.replace('/(app)/dashboard')}>
                Fortsett som gjest
              </Button>
            </View>

            <View className="flex-row justify-center mt-8">
              <Text className="text-muted-foreground">Har du allerede konto? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text className="text-primary font-medium">Logg inn</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-muted-foreground text-center mt-6 leading-5">
              Ved å registrere deg godtar du våre{' '}
              <Text className="text-primary">vilkår</Text> og{' '}
              <Text className="text-primary">personvernerklæring</Text>.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
