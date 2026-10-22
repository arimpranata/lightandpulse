import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Chip } from '@/components/chip';
import { Icon, type IconName } from '@/components/icon';
import { ProfileBars, useProfileSummary } from '@/components/profile-summary';
import { Button, Card, Row, Screen, Section } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { partySize } from '@/domain/profile';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { isRemote } from '@/services/backend';
import { useApp } from '@/state/app-store';

function LinkRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.link, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Icon name={icon} size={20} color={theme.brand} />
      <AppText variant="heading" style={styles.flex}>
        {label}
      </AppText>
      <Icon name="chevronRight" size={16} color={theme.textMuted} />
    </Pressable>
  );
}

/** Profile tab: traveller profile, preferences, wallet and settings. */
export default function ProfileScreen() {
  const theme = useTheme();
  const { d, f, date, region } = useI18n();
  const { profile, language, setLanguage, resetAll, session } = useApp();
  const summary = useProfileSummary();
  const [confirmReset, setConfirmReset] = useState(false);
  if (!profile || !summary) return null;

  return (
    <Screen title={d.profile.title} root>
      <Section
        title={d.profile.baliProfile}
        action={
          <Button
            label={d.profile.edit}
            variant="ghost"
            compact
            onPress={() => router.push({ pathname: '/onboarding/preferences', params: { mode: 'edit' } })}
          />
        }>
        <Card>
          <AppText variant="heading">{summary.sentence}</AppText>
          <ProfileBars />
        </Card>
        <AppText variant="caption">
          {f(d.profile.tripSummary, {
            days: profile.tripDays,
            date: date(profile.startDate),
            people: partySize(profile),
            region: region(profile.baseRegion),
          })}
        </AppText>
      </Section>

      <Section title={d.profile.language}>
        <Row>
          <Chip label={d.common.english} selected={language === 'en'} onPress={() => setLanguage('en')} />
          <Chip label={d.common.indonesian} selected={language === 'id'} onPress={() => setLanguage('id')} />
        </Row>
      </Section>

      {isRemote && (
        <Section title={d.profile.account}>
          <AppText variant="caption">
            {session && !session.user.guest ? f(d.profile.signedInAs, { email: session.user.email ?? '' }) : d.profile.guestAccount}
          </AppText>
          {(!session || session.user.guest) && (
            <Button label={d.account.register} variant="secondary" icon="person" onPress={() => router.push('/account')} />
          )}
        </Section>
      )}

      <View style={styles.links}>
        <LinkRow icon="wallet" label={d.profile.wallet} onPress={() => router.push('/wallet')} />
        <LinkRow icon="respect" label={d.profile.culturalCode} onPress={() => router.push('/cultural-code')} />
        <LinkRow icon="guide" label={d.profile.essentials} onPress={() => router.push('/essentials')} />
        <LinkRow icon="cart" label={d.cart.title} onPress={() => router.push('/cart')} />
        {isRemote && <LinkRow icon="shield" label={d.profile.portal} onPress={() => router.push('/portal')} />}
      </View>

      <Section title={d.profile.about}>
        <AppText variant="caption">{isRemote ? d.profile.aboutRemote : d.profile.aboutBody}</AppText>
        {confirmReset ? (
          <Card style={{ borderColor: theme.danger }}>
            <AppText variant="heading">{d.profile.resetTitle}</AppText>
            <AppText variant="caption">{d.profile.resetBody}</AppText>
            <Row>
              <Button
                label={d.profile.reset}
                variant="danger"
                compact
                onPress={() => {
                  resetAll();
                  router.replace('/onboarding');
                }}
              />
              <Button label={d.common.cancel} variant="secondary" compact onPress={() => setConfirmReset(false)} />
            </Row>
          </Card>
        ) : (
          <Button label={d.profile.reset} variant="danger" icon="trash" onPress={() => setConfirmReset(true)} />
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  links: { gap: Spacing.sm },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
