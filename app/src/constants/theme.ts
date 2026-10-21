import { Platform } from 'react-native';

/**
 * A warm palette drawn from Bali: jungle greens, temple stone, sunset
 * terracotta and frangipani gold. Every colour is defined for light and dark.
 */
export const Colors = {
  light: {
    text: '#1E1B16',
    textSecondary: '#6B645A',
    textMuted: '#9A9286',
    background: '#FBF7F0',
    surface: '#FFFFFF',
    surfaceMuted: '#F2ECE1',
    border: '#E6DED0',
    primary: '#1F6B52',
    primaryText: '#FFFFFF',
    accent: '#D9622B',
    gold: '#C8932E',
    danger: '#C0392B',
    tabBar: '#FFFFFF',
    shadow: '#3B2F1E',
  },
  dark: {
    text: '#F5EFE6',
    textSecondary: '#BDB4A6',
    textMuted: '#8C8478',
    background: '#14120F',
    surface: '#1F1C18',
    surfaceMuted: '#2A2620',
    border: '#3A342C',
    primary: '#4FB28C',
    primaryText: '#0D1F18',
    accent: '#F08A55',
    gold: '#E2B457',
    danger: '#E86A5C',
    tabBar: '#1A1814',
    shadow: '#000000',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const Fonts = {
  display: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia, "Times New Roman", serif',
  }),
};

export const MaxContentWidth = 720;
