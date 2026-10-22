import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Chip } from '@/components/chip';
import { PreferenceSlider, Stepper } from '@/components/controls';
import { Button, Card, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { defaultProfile } from '@/domain/profile';
import { PREFERENCE_KEYS, type LanguageCode, type TravellerProfile } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useApp } from '@/state/app-store';

const BASE_REGIONS = ['ubud', 'south', 'east', 'highlands', 'north', 'west'] as const;
const GUIDE_LANGUAGES: { id: LanguageCode; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'id', label: 'Indonesia' },
  { id: 'ja', label: '日本語' },
  { id: 'de', label: 'Deutsch' },
  { id: 'fr', label: 'Français' },
  { id: 'zh', label: '中文' },
  { id: 'es', label: 'Español' },
];

/** S02 Experience Onboarding: preference sliders, trip duration, budget, travel party. */
export default function PreferencesScreen() {
  const theme = useTheme();
  const { d, region } = useI18n();
  const { profile: saved, saveProfile } = useApp();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [profile, setProfile] = useState<TravellerProfile>(() => saved ?? defaultProfile());
  const [dateText, setDateText] = useState(profile.startDate);
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(dateText) && !Number.isNaN(Date.parse(dateText));

  const update = (patch: Partial<TravellerProfile>) => setProfile((current) => ({ ...current, ...patch }));

  const submit = () => {
    if (!dateValid) return;
    saveProfile({ ...profile, startDate: dateText });
    if (mode === 'edit') router.back();
    else router.push('/onboarding/profile');
  };

  return (
    <Screen
      title={d.onboarding.prefsTitle}
      footer={<Button label={mode === 'edit' ? d.common.save : d.onboarding.seeProfile} onPress={submit} disabled={!dateValid} />}>
      <AppText variant="body" color="textSecondary">
        {d.onboarding.prefsSubtitle}
      </AppText>

      <Card>
        {PREFERENCE_KEYS.map((key) => (
          <PreferenceSlider
            key={key}
            label={d.prefs[key]}
            hint={d.prefHints[key]}
            value={profile.preferences[key]}
            onChange={(value) => update({ preferences: { ...profile.preferences, [key]: value } })}
          />
        ))}
      </Card>

      <Card>
        <AppText variant="title">{d.onboarding.styleTitle}</AppText>
        <PreferenceSlider
          label={`${d.onboarding.localLuxury[0]} ↔ ${d.onboarding.localLuxury[1]}`}
          ends={d.onboarding.localLuxury as [string, string]}
          value={profile.localLuxury}
          onChange={(localLuxury) => update({ localLuxury })}
        />
        <PreferenceSlider
          label={`${d.onboarding.pace[0]} ↔ ${d.onboarding.pace[1]}`}
          ends={d.onboarding.pace as [string, string]}
          value={profile.pace}
          onChange={(pace) => update({ pace })}
        />
        <PreferenceSlider
          label={`${d.onboarding.budget[0]} ↔ ${d.onboarding.budget[1]}`}
          ends={d.onboarding.budget as [string, string]}
          value={profile.budget}
          onChange={(budget) => update({ budget })}
        />
      </Card>

      <Card>
        <AppText variant="title">{d.onboarding.tripTitle}</AppText>
        <View style={styles.field}>
          <AppText variant="label" color="textSecondary">
            {d.onboarding.firstDay}
          </AppText>
          <TextInput
            value={dateText}
            onChangeText={setDateText}
            placeholder="2027-03-02"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            accessibilityLabel={d.onboarding.firstDay}
            style={[styles.input, { color: theme.text, borderColor: dateValid ? theme.border : theme.danger }]}
          />
          {!dateValid && (
            <AppText variant="caption" style={{ color: theme.danger }}>
              {d.onboarding.invalidDate}
            </AppText>
          )}
        </View>
        <Stepper label={d.onboarding.days} value={profile.tripDays} min={1} max={14} onChange={(tripDays) => update({ tripDays })} />
        <Stepper
          label={d.onboarding.adults}
          value={profile.party.adults}
          min={1}
          onChange={(adults) => update({ party: { ...profile.party, adults } })}
        />
        <Stepper
          label={d.onboarding.children}
          value={profile.party.children}
          onChange={(children) => update({ party: { ...profile.party, children } })}
        />
        <View style={styles.field}>
          <AppText variant="label" color="textSecondary">
            {d.onboarding.stayingIn}
          </AppText>
          <View style={styles.chips}>
            {BASE_REGIONS.map((id) => (
              <Chip key={id} label={region(id)} selected={profile.baseRegion === id} onPress={() => update({ baseRegion: id })} />
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <AppText variant="label" color="textSecondary">
            {d.onboarding.guideLanguages}
          </AppText>
          <View style={styles.chips}>
            {GUIDE_LANGUAGES.map((option) => {
              const selected = profile.languages.includes(option.id);
              return (
                <Chip
                  key={option.id}
                  label={option.label}
                  selected={selected}
                  onPress={() =>
                    update({
                      languages: selected
                        ? profile.languages.filter((l) => l !== option.id).length > 0
                          ? profile.languages.filter((l) => l !== option.id)
                          : profile.languages
                        : [...profile.languages, option.id],
                    })
                  }
                />
              );
            })}
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 46,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
