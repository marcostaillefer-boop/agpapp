import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { AppText } from '@/components/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { setLanguage, type SupportedLanguage } from '@/i18n';

const LANGUAGES: { code: SupportedLanguage; flag: string; label: string }[] = [
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
];

export default function Welcome() {
  const router = useRouter();
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  const chooseLanguage = async (code: SupportedLanguage) => {
    await setLanguage(code);
    router.replace('/portal');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <AppText variant="title">{t('welcome.title')}</AppText>
        <AppText secondary style={{ textAlign: 'center' }}>
          {t('welcome.subtitle')}
        </AppText>
      </View>

      <View style={{ gap: Spacing.sm }}>
        <AppText variant="caption" secondary style={{ textAlign: 'center' }}>
          {t('welcome.chooseLanguage')}
        </AppText>
        {LANGUAGES.map((lang) => (
          <Button
            key={lang.code}
            label={`${lang.flag}  ${lang.label}`}
            variant={i18n.language === lang.code ? 'primary' : 'secondary'}
            onPress={() => chooseLanguage(lang.code)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.xl },
  header: { gap: Spacing.xs, alignItems: 'center' },
});
