import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { CulturalNotes } from '@/components/cultural-notice';
import { Notice, Screen, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useContent } from '@/context/content';
import { isRuleActive } from '@/domain/cultural';
import { todayIso } from '@/domain/time';
import type { CulturalRule } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useApp } from '@/state/app-store';

/** S19 Cultural Code: contextual etiquette and restrictions, grouped by scope. */
export default function CulturalCodeScreen() {
  const { d, f } = useI18n();
  const { inventory, profile } = useApp();
  const { getCategory } = useContent();
  const date = profile && profile.startDate > todayIso() ? profile.startDate : todayIso();
  const active = inventory.rules.filter((rule) => isRuleActive(rule, date));

  const groups = new Map<string, CulturalRule[]>();
  for (const rule of active) {
    let title: string;
    if (rule.scopeType === 'global') title = d.culture.scopeAll;
    else if (rule.scopeType === 'category') title = f(d.culture.scopeCategory, { category: getCategory(rule.scopeId).label.toLowerCase() });
    else if (rule.scopeType === 'destination') title = inventory.destinations.find((x) => x.id === rule.scopeId)?.name ?? rule.scopeId;
    else if (rule.scopeType === 'experience') title = inventory.experiences.find((x) => x.id === rule.scopeId)?.title ?? rule.scopeId;
    else title = inventory.events.find((x) => x.id === rule.scopeId)?.title ?? rule.scopeId;
    groups.set(title, [...(groups.get(title) ?? []), rule]);
  }

  return (
    <Screen title={d.culture.title}>
      <AppText variant="body" color="textSecondary">
        {d.culture.intro}
      </AppText>
      {active.some((rule) => !rule.verified) && (
        <Notice icon="info" tone="demo">
          <AppText variant="caption">{d.culture.demoNote}</AppText>
        </Notice>
      )}
      <View style={styles.groups}>
        {[...groups.entries()].map(([title, rules]) => (
          <Section key={title} title={title}>
            <CulturalNotes rules={rules} showSource />
          </Section>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  groups: { gap: Spacing.xl },
});
