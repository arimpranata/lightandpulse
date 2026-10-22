import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { BackButton } from '@/components/back-button';
import { Icon, type IconName } from '@/components/icon';
import { PlaceArt } from '@/components/place-art';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';

type Props = {
  gradient: readonly [string, string];
  icon: IconName;
  eyebrow: string;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
};

export function DetailHero({ gradient, icon, eyebrow, title, subtitle, badges }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <PlaceArt gradient={gradient} icon={icon} iconSize={240} style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
      <BackButton />
      <View style={styles.text}>
        <View style={styles.eyebrow}>
          <Icon name={icon} size={13} color="#FFFFFF" />
          <AppText variant="caption" style={styles.onArt}>
            {eyebrow}
          </AppText>
        </View>
        <AppText variant="display" style={styles.onArt}>
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="body" style={styles.onArtMuted}>
            {subtitle}
          </AppText>
        )}
        {badges && <View style={styles.badges}>{badges}</View>}
      </View>
    </PlaceArt>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 300,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    justifyContent: 'space-between',
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  text: { gap: Spacing.xs, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  onArt: { color: '#FFFFFF' },
  onArtMuted: { color: 'rgba(255,255,255,0.9)' },
  badges: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginTop: Spacing.xs },
});
