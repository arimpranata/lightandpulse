import { Platform } from 'react-native';

/**
 * BALI LENS palette (spec §36): sea/ocean blue brand family, teal for actions,
 * warm earth and gold accents, generous whitespace. Defined for light and dark.
 */
export const Colors = {
  light: {
    text: '#0F1E26',
    textSecondary: '#4B5E68',
    textMuted: '#7D8E97',
    background: '#F5F8F9',
    surface: '#FFFFFF',
    surfaceMuted: '#EAF1F3',
    border: '#D8E3E7',
    brand: '#0B4F6C',
    brandText: '#FFFFFF',
    primary: '#0B7A70',
    primaryText: '#FFFFFF',
    accent: '#B5683A',
    gold: '#C29127',
    danger: '#B42318',
    warning: '#9A6400',
    success: '#11734B',
    tabBar: '#FFFFFF',
    shadow: '#0B2530',
  },
  dark: {
    text: '#EAF2F5',
    textSecondary: '#A9BBC3',
    textMuted: '#7E929B',
    background: '#0A1419',
    surface: '#122028',
    surfaceMuted: '#1A2C35',
    border: '#24394299',
    brand: '#5BB4D9',
    brandText: '#062330',
    primary: '#39C2B2',
    primaryText: '#04201C',
    accent: '#E2965F',
    gold: '#E4B755',
    danger: '#F2726A',
    warning: '#E8B45A',
    success: '#4CC38A',
    tabBar: '#0F1B21',
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
