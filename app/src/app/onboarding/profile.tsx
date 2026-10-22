import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ProfileBars, useProfileSummary } from '@/components/profile-summary';
import { Badge, Button, Card, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { paceBand } from '@/domain/profile';
import { useI18n } from '@/i18n';
import { useApp } from '@/state/app-store';

/** S03 AI Profile: generated preference profile with edit controls. */
export default function ProfileSummaryScreen() {
  const { d } = useI18n();
  const { profile, plan } = useApp();
  const summary = useProfileSummary();
  if (!profile || !summary) return null;

  return (
    <Screen
      title={d.onboarding.profileTitle}
      footer={
        <>
          <Button
            label={d.onboarding.planJourney}
            icon="sparkles"
            onPress={() => {
              plan();
              router.replace('/journey');
            }}
          />
          <Button label={d.onboarding.edit} variant="ghost" onPress={() => router.back()} />
        </>
      }>
      <AppText variant="body" color="textSecondary">
        {d.onboarding.profileIntro}
      </AppText>
      <Card>
        <AppText variant="title">{summary.sentence}</AppText>
        <View style={styles.badges}>
          <Badge label={summary.style} tone="info" />
          <Badge label={d.bands.pace[paceBand(profile.pace)]} tone="info" />
        </View>
        <ProfileBars />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
});
