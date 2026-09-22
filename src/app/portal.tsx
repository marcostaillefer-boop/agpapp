import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { AppText } from '@/components/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function Portal() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <AppText variant="title">{t('portal.title')}</AppText>
        <AppText secondary style={{ textAlign: 'center' }}>
          {t('portal.subtitle')}
        </AppText>
      </View>

      <View style={{ gap: Spacing.sm }}>
        <Card onPress={() => router.push('/(auth)/login?perfil=admin')}>
          <AppText variant="subtitle">{t('portal.admin')}</AppText>
          <AppText secondary>{t('portal.adminDescription')}</AppText>
        </Card>
        <Card onPress={() => router.push('/(auth)/login?perfil=propietario')}>
          <AppText variant="subtitle">{t('portal.owner')}</AppText>
          <AppText secondary>{t('portal.ownerDescription')}</AppText>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.xl },
  header: { gap: Spacing.xs, alignItems: 'center' },
});
