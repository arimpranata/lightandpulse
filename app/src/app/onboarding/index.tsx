import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { Button } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useApp, type Language } from '@/state/app-store';

/** S01 Splash / Welcome: logo, tagline, language and guest start. */
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { d } = useI18n();
  const { language, setLanguage } = useApp();

  const languages: { id: Language; label: string }[] = [
    { id: 'en', label: d.common.english },
    { id: 'id', label: d.common.indonesian },
  ];

  return (
    <LinearGradient colors={['#062D3F', '#0B4F6C', '#0B7A70']} style={styles.screen}>
      <View style={[styles.inner, { paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Icon name="sunrise" size={30} color="#FFFFFF" />
          </View>
          <AppText variant="display" style={styles.wordmark}>
            BALI LENS
          </AppText>
          <AppText variant="title" style={styles.tagline}>
            {d.onboarding.tagline}
          </AppText>
          <AppText variant="body" style={styles.intro}>
            {d.onboarding.intro}
          </AppText>
        </View>

        <View style={styles.bottom}>
          <AppText variant="label" style={styles.muted}>
            {d.onboarding.chooseLanguage}
          </AppText>
          <View style={styles.languages}>
            {languages.map((option) => {
              const active = option.id === language;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setLanguage(option.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={[styles.language, active && styles.languageActive]}>
                  <AppText variant="heading" style={{ color: active ? '#0B4F6C' : '#FFFFFF' }}>
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <Button label={d.onboarding.start} icon="chevronRight" onPress={() => router.push('/onboarding/preferences')} />
          <AppText variant="caption" style={[styles.muted, styles.center]}>
            {d.onboarding.guestNote}
          </AppText>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  brand: { gap: Spacing.md, marginTop: Spacing.xxl },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { color: '#FFFFFF', fontSize: 44, lineHeight: 50, letterSpacing: 2 },
  tagline: { color: '#BFE9E3' },
  intro: { color: 'rgba(255,255,255,0.88)', maxWidth: 420 },
  bottom: { gap: Spacing.md },
  muted: { color: 'rgba(255,255,255,0.75)' },
  center: { textAlign: 'center' },
  languages: { flexDirection: 'row', gap: Spacing.sm },
  language: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  languageActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
});
