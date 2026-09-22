import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { AppText } from '@/components/text';

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.container}>
      <AppText variant="subtitle" secondary style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="caption" secondary style={{ textAlign: 'center' }}>
          {description}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: Spacing.xl, gap: Spacing.xs, alignItems: 'center' },
});
