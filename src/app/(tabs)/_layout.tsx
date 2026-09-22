import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const { session, loading, isSuperAdmin } = useAuth();
  const theme = useTheme();
  const { t } = useTranslation();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/portal" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="juntas"
        options={{ title: t('tabs.meetings'), tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="comunidades"
        options={{ title: t('tabs.communities'), tabBarIcon: ({ color, size }) => <Ionicons name="business-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="incidencias"
        options={{ title: t('tabs.issues'), tabBarIcon: ({ color, size }) => <Ionicons name="alert-circle-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="equipo"
        options={{
          title: t('tabs.team'),
          href: isSuperAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="key-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: t('tabs.profile'), tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
