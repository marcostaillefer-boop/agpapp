import { Text as RNText, type TextProps } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'title' | 'subtitle' | 'body' | 'caption' | 'label';

const sizes: Record<Variant, number> = {
  title: 24,
  subtitle: 18,
  body: 15,
  caption: 13,
  label: 12,
};

const weights: Record<Variant, TextProps['style']> = {
  title: { fontWeight: '700' },
  subtitle: { fontWeight: '600' },
  body: { fontWeight: '400' },
  caption: { fontWeight: '400' },
  label: { fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
};

export function AppText({
  variant = 'body',
  secondary,
  color,
  style,
  ...props
}: TextProps & { variant?: Variant; secondary?: boolean; color?: string }) {
  const theme = useTheme();
  return (
    <RNText
      {...props}
      style={[
        {
          fontSize: sizes[variant],
          color: color ?? (secondary ? theme.textSecondary : theme.text),
          fontFamily: Fonts?.sans,
        },
        weights[variant],
        style,
      ]}
    />
  );
}
