import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const Container = scroll ? ScrollView : View;
  return (
    <Container
      style={[styles.base, { backgroundColor: theme.background }, style]}
      contentContainerStyle={scroll ? styles.scrollContent : undefined}
    >
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
});
