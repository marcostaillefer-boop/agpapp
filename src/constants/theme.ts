import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#12181F',
    textSecondary: '#5B6472',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    border: '#E1E5EA',
    primary: '#0B5FA5',
    primaryText: '#FFFFFF',
    success: '#1B8A5A',
    danger: '#C23B3B',
    warning: '#B7791F',
  },
  dark: {
    text: '#F5F7FA',
    textSecondary: '#A7AEB8',
    background: '#0D1117',
    surface: '#171C24',
    border: '#2A313C',
    primary: '#3B9CE8',
    primaryText: '#08131F',
    success: '#3FBE85',
    danger: '#E5726B',
    warning: '#E0A93F',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
  web: { sans: 'system-ui, sans-serif', rounded: 'system-ui, sans-serif', mono: 'monospace' },
});

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
