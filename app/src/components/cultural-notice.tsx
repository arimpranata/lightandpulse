import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { Badge } from '@/components/ui';
import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import type { CulturalRule, RuleSeverity } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

const SEVERITY_ICON: Record<RuleSeverity, IconName> = {
  info: 'info',
  warning: 'respect',
  restricted: 'alert',
  prohibited: 'blocked',
};

export function severityColor(severity: RuleSeverity, theme: ThemeColors): string {
  if (severity === 'prohibited') return theme.danger;
  if (severity === 'restricted') return theme.warning;
  if (severity === 'warning') return theme.accent;
  return theme.brand;
}

/** One cultural rule with its severity, verification state and source (spec §16). */
export function CulturalRuleCard({ rule, showSource = false }: { rule: CulturalRule; showSource?: boolean }) {
  const theme = useTheme();
  const { d, f, language } = useI18n();
  const color = severityColor(rule.severity, theme);
  return (
    <View style={[styles.rule, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.surfaceMuted }]}>
        <Icon name={SEVERITY_ICON[rule.severity]} size={16} color={color} />
      </View>
      <View style={styles.body}>
        <View style={styles.badges}>
          <AppText variant="label" style={{ color }}>
            {d.severity[rule.severity]}
          </AppText>
          {!rule.verified && <Badge label={d.common.notVerified} tone="demo" />}
        </View>
        <AppText variant="body">{(language === 'id' && rule.text.id) || rule.text.en}</AppText>
        {showSource && (
          <AppText variant="caption" style={{ color: theme.textMuted }}>
            {f(d.culture.source, { owner: rule.sourceOwner, version: rule.version })}
          </AppText>
        )}
      </View>
    </View>
  );
}

export function CulturalNotes({ rules, showSource }: { rules: CulturalRule[]; showSource?: boolean }) {
  if (rules.length === 0) return null;
  return (
    <View style={styles.list}>
      {rules.map((rule) => (
        <CulturalRuleCard key={rule.id} rule={rule} showSource={showSource} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
  rule: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
});
