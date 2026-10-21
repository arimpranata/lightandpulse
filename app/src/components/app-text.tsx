import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'caption' | 'label';

type Props = TextProps & {
  variant?: Variant;
  color?: keyof ThemeColors;
};

export function AppText({ variant = 'body', color, style, ...rest }: Props) {
  const theme = useTheme();
  const defaultColor = variant === 'caption' ? theme.textSecondary : theme.text;
  return (
    <Text style={[styles[variant], { color: color ? theme[color] : defaultColor }, style]} {...rest} />
  );
}

const styles = StyleSheet.create({
  display: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 38, fontWeight: '700' },
  title: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
});
