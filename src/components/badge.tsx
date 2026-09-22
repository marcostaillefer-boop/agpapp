import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/components/text';

type Tone = 'neutral' | 'success' | 'danger' | 'warning' | 'primary';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const theme = useTheme();
  const colors: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: theme.border, fg: theme.textSecondary },
    success: { bg: theme.success + '22', fg: theme.success },
    danger: { bg: theme.danger + '22', fg: theme.danger },
    warning: { bg: theme.warning + '22', fg: theme.warning },
    primary: { bg: theme.primary + '22', fg: theme.primary },
  };
  const { bg, fg } = colors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <AppText variant="label" color={fg}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
});
