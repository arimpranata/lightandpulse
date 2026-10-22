import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { PlaceArt } from '@/components/place-art';
import { Badge } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { CATEGORIES } from '@/data/places';
import type { GuardianResult } from '@/domain/cultural';
import type { RankedCandidate } from '@/domain/ranking';
import type { BaliEvent, Destination, DriverService, Experience, Guide, PreferenceKey, Reason } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

export type ItemKind = 'destination' | 'experience' | 'event' | 'guide' | 'driver';

const PREFERENCE_ART: Record<PreferenceKey, { icon: IconName; gradient: readonly [string, string] }> = {
  spiritual: { icon: 'temple', gradient: ['#7A4A2A', '#C9913F'] },
  culture: { icon: 'culture', gradient: ['#5E2D58', '#C2683A'] },
  wellbeing: { icon: 'leaf', gradient: ['#2F6F62', '#8CC7A1'] },
  adventure: { icon: 'nature', gradient: ['#1F5E3B', '#7FB069'] },
  culinary: { icon: 'food', gradient: ['#8A3B1E', '#E0A050'] },
  arts: { icon: 'palette', gradient: ['#3D3A78', '#C2683A'] },
  beach: { icon: 'beach', gradient: ['#0B4F6C', '#4FC1C9'] },
  nightlife: { icon: 'music', gradient: ['#1B1F4B', '#7C4DBB'] },
};

export function artFor(kind: ItemKind, item: Destination | Experience | BaliEvent | Guide | DriverService) {
  if (kind === 'destination') {
    const category = CATEGORIES.find((c) => c.id === (item as Destination).category) ?? CATEGORIES[0];
    return { icon: category.icon, gradient: category.gradient };
  }
  if (kind === 'guide') return { icon: 'person' as IconName, gradient: ['#0B4F6C', '#0B7A70'] as const };
  if (kind === 'driver') return { icon: 'car' as IconName, gradient: ['#24394A', '#0B4F6C'] as const };
  const categories = (item as Experience | BaliEvent).categories;
  return PREFERENCE_ART[categories[0]] ?? PREFERENCE_ART.culture;
}

export function openItem(kind: ItemKind, id: string) {
  const pathname = {
    destination: '/destination/[id]',
    experience: '/experience/[id]',
    event: '/event/[id]',
    guide: '/guide/[id]',
    driver: '/driver/[id]',
  }[kind] as '/destination/[id]';
  router.push({ pathname, params: { id } });
}

type Props = {
  kind: ItemKind;
  item: Destination | Experience | BaliEvent | Guide | DriverService;
  ranked?: Pick<RankedCandidate, 'score' | 'reasons' | 'guardian'> & { slot?: string | null };
  /** Shown when the Cultural Guardian blocks the item. */
  guardian?: GuardianResult;
  subtitle?: string;
  price?: string;
};

function titleOf(kind: ItemKind, item: Props['item']): string {
  if (kind === 'destination') return (item as Destination).name;
  if (kind === 'guide') return (item as Guide).name;
  if (kind === 'driver') return `${(item as DriverService).driverName} · ${(item as DriverService).vehicle.label}`;
  return (item as Experience | BaliEvent).title;
}

/** Search/recommendation card with the minimum critical information (spec §20). */
export function InventoryCard({ kind, item, ranked, guardian, subtitle, price }: Props) {
  const theme = useTheme();
  const { d, f, explain } = useI18n();
  const art = artFor(kind, item);
  const gate = ranked?.guardian ?? guardian;
  const blocked = gate?.decision === 'block';
  const notes = gate ? gate.rules.filter((rule) => rule.severity !== 'info').length : 0;
  const explanation = ranked ? explain(ranked.reasons as Reason[], 2) : null;
  const isDemo = 'demo' in item && item.demo;

  return (
    <Pressable
      onPress={() => openItem(kind, item.id)}
      accessibilityRole="button"
      accessibilityLabel={titleOf(kind, item)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <PlaceArt gradient={art.gradient} icon={art.icon} iconSize={64} style={styles.thumb}>
        <View style={styles.thumbIcon}>
          <Icon name={blocked ? 'blocked' : art.icon} size={26} color="#FFFFFF" />
        </View>
      </PlaceArt>
      <View style={styles.body}>
        <AppText variant="heading" numberOfLines={2} style={blocked && { color: theme.textMuted }}>
          {titleOf(kind, item)}
        </AppText>
        {subtitle && (
          <AppText variant="caption" numberOfLines={1}>
            {subtitle}
          </AppText>
        )}
        {explanation && !blocked && (
          <AppText variant="caption" numberOfLines={2} style={{ color: theme.primary }}>
            {explanation}
          </AppText>
        )}
        <View style={styles.meta}>
          {blocked && <Badge label={d.explore.blocked} tone="danger" icon="blocked" />}
          {price && !blocked && (
            <AppText variant="caption" style={[styles.price, { color: theme.text }]}>
              {price}
            </AppText>
          )}
          {notes > 0 && !blocked && <Badge label={`${notes} · ${d.detail.culture}`} tone="warning" icon="respect" />}
          {isDemo && <Badge label={d.common.demo} tone="demo" />}
          {ranked && !blocked && (
            <AppText variant="caption" style={{ color: theme.textMuted }}>
              {f(d.explore.fit, { n: Math.round(ranked.score * 100) })}
            </AppText>
          )}
        </View>
      </View>
      <Icon name="chevronRight" size={16} color={theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm + 2,
    paddingRight: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 76, height: 76, borderRadius: Radius.md },
  thumbIcon: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap', marginTop: 2 },
  price: { fontWeight: '700' },
});
