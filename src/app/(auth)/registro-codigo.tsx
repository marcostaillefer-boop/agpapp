import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { AppText } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { savePendingRegistration } from '@/lib/pending-registration';
import { supabase } from '@/lib/supabase';

export default function RegistroConCodigo() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!codigo.trim() || !nombre.trim() || !email.trim() || !password) {
      setError(t('registro.missingFields'));
      return;
    }
    setError(null);
    setInfo(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError || !data.user) {
      setLoading(false);
      setError(t('registro.genericError'));
      return;
    }

    if (!data.session) {
      await savePendingRegistration(email, { nombre: nombre.trim(), apellidos: apellidos.trim(), codigo: codigo.trim() });
      setLoading(false);
      setInfo(t('registro.confirmEmail'));
      return;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      email: email.trim(),
      rol: 'propietario',
    });

    if (profileError) {
      setLoading(false);
      setError(t('registro.genericError'));
      return;
    }

    const { error: rpcError } = await supabase.rpc('redimir_codigo_acceso', { codigo_input: codigo.trim() });
    setLoading(false);

    if (rpcError) {
      setError(t('registro.invalidCode'));
      return;
    }

    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: true, title: t('registro.title') }} />
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
        <AppText secondary>{t('registro.subtitle')}</AppText>

        <TextField label={t('registro.code')} value={codigo} onChangeText={setCodigo} autoCapitalize="characters" />
        <TextField label={t('registro.name')} value={nombre} onChangeText={setNombre} />
        <TextField label={t('registro.surname')} value={apellidos} onChangeText={setApellidos} />
        <TextField
          label={t('registro.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextField label={t('registro.password')} value={password} onChangeText={setPassword} secureTextEntry />

        {error ? <AppText color={theme.danger}>{error}</AppText> : null}
        {info ? (
          <View>
            <AppText color={theme.success}>{info}</AppText>
          </View>
        ) : null}

        <Button label={t('registro.submit')} onPress={submit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
