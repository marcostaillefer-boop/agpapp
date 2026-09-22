import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/components/text';

export function VoteBar({
  label,
  percent,
  color,
}: {
  label: string;
  percent: number;
  color: string;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <AppText variant="caption" secondary>
          {label}
        </AppText>
        <AppText variant="caption" secondary>
          {clamped.toFixed(1)}%
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.xs / 2 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 10, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
});
