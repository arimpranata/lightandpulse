import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { DayPicker } from '@/components/controls';
import { Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { Candidate } from '@/domain/ranking';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useApp } from '@/state/app-store';

/** Lets the traveller pin an item to a trip day; the planner finds a time that fits. */
export function AddToJourney({ candidate }: { candidate: Candidate }) {
  const theme = useTheme();
  const { d, f, date } = useI18n();
  const { journey, addToJourney, plan } = useApp();
  const [day, setDay] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  if (!journey) {
    return <Button label={d.journey.plan} icon="sparkles" variant="secondary" onPress={() => plan()} />;
  }

  const inJourney = journey.days.findIndex((x) => x.items.some((item) => item.refId === candidate.item.id));
  const selected = day ?? journey.days[0].date;

  return (
    <View style={styles.wrap}>
      <AppText variant="label" color="textSecondary">
        {d.detail.pickDay}
      </AppText>
      <DayPicker
        days={journey.days.map((x) => ({ date: x.date, label: date(x.date) }))}
        selected={selected}
        onSelect={setDay}
        label={(index) => f(d.common.day, { n: index + 1 })}
      />
      <Button
        label={inJourney >= 0 ? f(d.common.addedToJourney, { n: inJourney + 1 }) : d.common.addToJourney}
        icon={inJourney >= 0 ? 'checkCircle' : 'plus'}
        variant="secondary"
        disabled={inJourney >= 0}
        onPress={() => {
          const index = journey.days.findIndex((x) => x.date === selected);
          const ok = addToJourney(selected, candidate);
          setMessage({ ok, text: ok ? f(d.common.addedToJourney, { n: index + 1 }) : f(d.common.noFit, { n: index + 1 }) });
        }}
      />
      {message && !message.ok && (
        <AppText variant="caption" style={{ color: theme.warning }}>
          {message.text}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
});
