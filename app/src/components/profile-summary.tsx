import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius, Spacing } from '@/constants/theme';
import { budgetBand, paceBand, rankedPreferences, styleBand } from '@/domain/profile';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useApp } from '@/state/app-store';

/** "82% Culture, 74% Spiritual, 68% Wellbeing, 41% Adventure; Slow Travel; Mid-High Budget." */
export function useProfileSummary() {
  const { profile } = useApp();
  const { d } = useI18n();
  if (!profile) return null;
  const top = rankedPreferences(profile).slice(0, 4);
  return {
    top,
    sentence: `${top.map((p) => `${p.value}% ${d.prefs[p.key]}`).join(', ')}; ${d.bands.pace[paceBand(profile.pace)]}; ${d.bands.budget[budgetBand(profile.budget)]}.`,
    style: d.bands.style[styleBand(profile.localLuxury)],
  };
}

/** Bars for every preference, strongest first. */
export function ProfileBars() {
  const theme = useTheme();
  const { profile } = useApp();
  const { d } = useI18n();
  if (!profile) return null;
  return (
    <View style={styles.bars}>
      {rankedPreferences(profile).map(({ key, value }) => (
        <View key={key} style={styles.barRow}>
          <AppText variant="caption" style={styles.barLabel} numberOfLines={1}>
            {d.prefs[key]}
          </AppText>
          <View style={[styles.track, { backgroundColor: theme.surfaceMuted }]}>
            <View style={[styles.fill, { width: `${value}%`, backgroundColor: theme.primary }]} />
          </View>
          <AppText variant="caption" style={styles.barValue}>
            {value}%
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { gap: Spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  barLabel: { width: 130 },
  track: { flex: 1, height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
  barValue: { width: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
