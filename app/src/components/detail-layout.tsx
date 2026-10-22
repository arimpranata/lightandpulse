import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Scrollable detail page: hero, body sections and an optional sticky footer. */
export function DetailLayout({ hero, children, footer }: { hero: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {hero}
        <View style={styles.body}>{children}</View>
      </ScrollView>
      {footer && (
        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.footerInner}>{footer}</View>
        </View>
      )}
    </View>
  );
}

/** Icon + label + value tile used for key facts. */
export function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.fact, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Icon name={icon} size={18} color={theme.accent} />
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="body" style={styles.factValue}>
        {value}
      </AppText>
    </View>
  );
}

export function Facts({ children }: { children: ReactNode }) {
  return <View style={styles.facts}>{children}</View>;
}

export function Bullets({ items, icon = 'leaf' }: { items: string[]; icon?: IconName }) {
  const theme = useTheme();
  return (
    <View style={styles.bullets}>
      {items.map((item) => (
        <View key={item} style={styles.bullet}>
          <Icon name={icon} size={16} color={theme.primary} style={styles.bulletIcon} />
          <AppText variant="body" style={styles.flex}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  scroll: { paddingBottom: Spacing.xxl, gap: Spacing.xl },
  body: { gap: Spacing.xl, paddingHorizontal: Spacing.lg, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md, paddingHorizontal: Spacing.lg },
  footerInner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.sm },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  fact: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  factValue: { fontWeight: '600' },
  bullets: { gap: Spacing.sm },
  bullet: { flexDirection: 'row', gap: Spacing.sm },
  bulletIcon: { marginTop: 3 },
});
