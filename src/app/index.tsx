import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { loadStoredLanguage } from '@/i18n';

export default function Index() {
  const { session, loading } = useAuth();
  const theme = useTheme();
  const [languageChecked, setLanguageChecked] = useState(false);
  const [hasLanguage, setHasLanguage] = useState(false);

  useEffect(() => {
    loadStoredLanguage().then((stored) => {
      setHasLanguage(stored !== null);
      setLanguageChecked(true);
    });
  }, []);

  if (loading || !languageChecked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!hasLanguage) {
    return <Redirect href="/welcome" />;
  }

  return <Redirect href={session ? '/(tabs)' : '/portal'} />;
}
