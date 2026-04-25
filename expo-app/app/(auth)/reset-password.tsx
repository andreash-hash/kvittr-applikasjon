import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'kvittr://reset-password',
    });
    setLoading(false);
    if (error) {
      Toast.show({ type: 'error', text1: 'Feil', text2: error.message });
    } else {
      setSent(true);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 px-6 pt-12 pb-8">
          <TouchableOpacity onPress={() => router.back()} className="mb-8">
            <Text className="text-primary text-base">← Tilbake</Text>
          </TouchableOpacity>

          <Text className="text-2xl font-bold text-foreground mb-2">Glemt passord?</Text>

          {sent ? (
            <View className="flex-1 justify-center items-center">
              <Text style={{ fontSize: 60 }}>📧</Text>
              <Text className="text-xl font-bold text-foreground mt-6 text-center">
                Sjekk e-posten din
              </Text>
              <Text className="text-muted-foreground text-center mt-3 leading-6">
                Vi har sendt en tilbakestillingslenke til {email}. Sjekk spam-mappen hvis du ikke
                ser den.
              </Text>
              <Button
                variant="outline"
                onPress={() => router.replace('/(auth)/login')}
                className="mt-8 w-full"
              >
                Tilbake til innlogging
              </Button>
            </View>
          ) : (
            <>
              <Text className="text-muted-foreground mb-8 leading-6">
                Skriv inn e-postadressen din, så sender vi deg en lenke for å tilbakestille
                passordet.
              </Text>

              <Input
                label="E-post"
                value={email}
                onChangeText={setEmail}
                placeholder="din@epost.no"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Button
                onPress={handleReset}
                loading={loading}
                disabled={!email.trim()}
                className="mt-6"
              >
                Send tilbakestillingslenke
              </Button>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
