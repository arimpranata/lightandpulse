import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BaliMap } from '@/components/bali-map';
import { DayPicker } from '@/components/controls';
import { CulturalNotes } from '@/components/cultural-notice';
import { Icon } from '@/components/icon';
import { openItem } from '@/components/inventory-card';
import { Button, EmptyState, Notice, Row, Screen, Section } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { evaluate, type RuleTarget } from '@/domain/cultural';
import type { JourneyItem } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { openInMaps } from '@/services/maps';
import { useApp } from '@/state/app-store';

/** S16 Map: the day's stops in order, with etiquette before navigation (spec §16). */
export default function MapScreen() {
  const theme = useTheme();
  const { d, f, date } = useI18n();
  const { journey, inventory } = useApp();
  const [selected, setSelected] = useState<string | null>(null);

  const day = journey?.days.find((x) => x.date === selected) ?? journey?.days[0];
  const stops = useMemo(() => (day?.items ?? []).filter((item): item is JourneyItem & { coordinates: NonNullable<JourneyItem['coordinates']> } => !!item.coordinates), [day]);
  const next = stops[0];

  const target = (item: JourneyItem): RuleTarget | null => {
    if (item.kind === 'destination') {
      const found = inventory.destinations.find((x) => x.id === item.refId);
      return found ? { kind: 'destination', item: found } : null;
    }
    if (item.kind === 'experience') {
      const found = inventory.experiences.find((x) => x.id === item.refId);
      return found ? { kind: 'experience', item: found } : null;
    }
    const found = inventory.events.find((x) => x.id === item.refId);
    return found ? { kind: 'event', item: found } : null;
  };
  const nextTarget = next ? target(next) : null;
  const etiquette = nextTarget && day ? evaluate(nextTarget, day.date, inventory).rules.filter((r) => r.severity !== 'info') : [];

  return (
    <Screen title={d.map.title} root>
      {!journey || !day ? (
        <EmptyState icon="map" title={d.journey.empty} body={d.journey.emptyBody} />
      ) : (
        <>
          <DayPicker
            days={journey.days.map((x) => ({ date: x.date, label: date(x.date) }))}
            selected={day.date}
            onSelect={setSelected}
            label={(index) => f(d.common.day, { n: index + 1 })}
          />
          <BaliMap points={stops.map((item) => ({ id: item.id, coordinates: item.coordinates }))} route selectedId={next?.id} />
          <AppText variant="caption" style={{ color: theme.textMuted }}>
            {d.map.schematic} {d.map.location}
          </AppText>

          {stops.length === 0 ? (
            <AppText variant="body" color="textSecondary">
              {d.map.noStops}
            </AppText>
          ) : (
            <View style={styles.stops}>
              {stops.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => openItem(item.kind as 'destination', item.refId)}
                  accessibilityRole="button"
                  style={[styles.stop, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={[styles.number, { backgroundColor: index === 0 ? theme.accent : theme.brand }]}>
                    <AppText variant="caption" style={styles.numberText}>
                      {index + 1}
                    </AppText>
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="heading" numberOfLines={1}>
                      {item.title}
                    </AppText>
                    <AppText variant="caption">
                      {item.start}–{item.end}
                      {item.travelMinutes > 0 ? ` · ${f(d.journey.travel, { n: item.travelMinutes })}` : ''}
                    </AppText>
                  </View>
                  <Pressable onPress={() => openInMaps(item.coordinates)} hitSlop={8} accessibilityLabel={d.common.openInMaps}>
                    <Icon name="directions" size={20} color={theme.primary} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}

          {next && (
            <Section title={d.culture.beforeYouGo}>
              {etiquette.length > 0 ? (
                <CulturalNotes rules={etiquette} />
              ) : (
                <Notice icon="respect">
                  <AppText variant="caption">{d.culture.intro}</AppText>
                </Notice>
              )}
              <Row>
                <Button label={d.map.nextStop} icon="directions" compact onPress={() => openInMaps(next.coordinates)} />
                <Button
                  label={d.map.compare}
                  icon="route"
                  variant="secondary"
                  compact
                  onPress={() => router.push({ pathname: '/route', params: { date: day.date } })}
                />
              </Row>
            </Section>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stops: { gap: Spacing.sm },
  stop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  number: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  numberText: { color: '#FFFFFF', fontWeight: '700' },
});
