import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { MaxContentWidth, Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ---------------------------------------------------------------------------
// Button

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, compact, style }: ButtonProps) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.primary, fg: theme.primaryText, border: theme.primary },
    secondary: { bg: theme.surface, fg: theme.text, border: theme.border },
    ghost: { bg: 'transparent', fg: theme.primary, border: 'transparent' },
    danger: { bg: theme.surface, fg: theme.danger, border: theme.danger },
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: inactive ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        icon && <Icon name={icon} size={compact ? 15 : 18} color={palette.fg} />
      )}
      <AppText variant="heading" style={[{ color: palette.fg }, compact && styles.compactLabel]}>
        {label}
      </AppText>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Badge

export type BadgeTone = 'neutral' | 'demo' | 'verified' | 'pending' | 'info' | 'warning' | 'danger' | 'success';

function toneColors(tone: BadgeTone, theme: ThemeColors) {
  switch (tone) {
    case 'demo':
      return { fg: theme.gold, bg: theme.surfaceMuted };
    case 'verified':
    case 'success':
      return { fg: theme.success, bg: theme.surfaceMuted };
    case 'pending':
    case 'warning':
      return { fg: theme.warning, bg: theme.surfaceMuted };
    case 'danger':
      return { fg: theme.danger, bg: theme.surfaceMuted };
    case 'info':
      return { fg: theme.brand, bg: theme.surfaceMuted };
    default:
      return { fg: theme.textSecondary, bg: theme.surfaceMuted };
  }
}

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: BadgeTone; icon?: IconName }) {
  const theme = useTheme();
  const colors = toneColors(tone, theme);
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      {icon && <Icon name={icon} size={12} color={colors.fg} />}
      <AppText variant="caption" style={[styles.badgeText, { color: colors.fg }]}>
        {label}
      </AppText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen scaffold for stack screens

type ScreenProps = {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  headerRight?: ReactNode;
  /** Hides the back button (tab roots). */
  root?: boolean;
  scroll?: boolean;
};

export function Screen({ title, children, footer, headerRight, root, scroll = true }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const body = (
    <View style={styles.content}>
      {children}
    </View>
  );
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerInner}>
          {!root && (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={[styles.back, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Icon name="back" size={18} color={theme.text} />
            </Pressable>
          )}
          {title && (
            <AppText variant={root ? 'display' : 'title'} style={styles.headerTitle} numberOfLines={2}>
              {title}
            </AppText>
          )}
          {headerRight}
        </View>
      </View>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Spacing.xxl + (footer ? 0 : insets.bottom) }]} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{body}</View>
      )}
      {footer && (
        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.footerInner}>{footer}</View>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Card, section, empty state, notice

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>{children}</View>;
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="title" style={styles.flex}>
          {title}
        </AppText>
        {action}
      </View>
      {children}
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: theme.surfaceMuted }]}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.surface }]}>
        <Icon name={icon} size={28} color={theme.brand} />
      </View>
      <AppText variant="heading" style={styles.center}>
        {title}
      </AppText>
      {body && (
        <AppText variant="caption" style={styles.center}>
          {body}
        </AppText>
      )}
      {action}
    </View>
  );
}

export function Notice({ icon = 'info', tone = 'info', children }: { icon?: IconName; tone?: BadgeTone; children: ReactNode }) {
  const theme = useTheme();
  const colors = toneColors(tone, theme);
  return (
    <View style={[styles.notice, { backgroundColor: colors.bg }]}>
      <Icon name={icon} size={16} color={colors.fg} style={styles.noticeIcon} />
      <View style={styles.flex}>{children}</View>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  screen: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headerTitle: { flex: 1 },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.xl },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md, paddingHorizontal: Spacing.lg },
  footerInner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.sm },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: 50,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  buttonCompact: { minHeight: 36, paddingHorizontal: Spacing.md, gap: Spacing.xs },
  compactLabel: { fontSize: 14 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: { fontWeight: '700', fontSize: 12 },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.lg, gap: Spacing.md },
  section: { gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md },
  empty: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.xl, borderRadius: Radius.lg },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md },
  noticeIcon: { marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
});
