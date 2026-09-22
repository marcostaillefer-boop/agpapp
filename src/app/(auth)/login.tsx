import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { AppText } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function Login() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { perfil } = useLocalSearchParams<{ perfil?: string }>();
  const isOwnerEntry = perfil === 'propietario';
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError(t('login.missingFields'));
      return;
    }
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setLoading(false);
    if (signInError) {
      setError(t('login.error'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <AppText variant="title">{t('login.title')}</AppText>
          <AppText secondary>{t('login.subtitle')}</AppText>
        </View>

        <View style={styles.form}>
          <TextField
            label={t('login.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="tu@email.com"
          />
          <TextField
            label={t('login.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
          {error ? <AppText color={theme.danger}>{error}</AppText> : null}
          <Button label={t('login.submit')} onPress={handleSubmit} loading={loading} />
        </View>

        {isOwnerEntry ? (
          <View style={{ gap: Spacing.xs, alignItems: 'center' }}>
            <AppText variant="caption" secondary>
              {t('login.ownerHint')}
            </AppText>
            <Pressable onPress={() => router.push('/(auth)/registro-codigo')}>
              <AppText variant="caption" color={theme.primary}>
                {t('login.ownerRegisterLink')}
              </AppText>
            </Pressable>
          </View>
        ) : (
          <AppText variant="caption" secondary style={{ textAlign: 'center' }}>
            {t('login.adminHint')}
          </AppText>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.xl },
  header: { gap: Spacing.xs, alignItems: 'center' },
  form: { gap: Spacing.md },
});
