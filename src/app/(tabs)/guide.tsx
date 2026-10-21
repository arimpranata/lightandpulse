import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { CurrencyConverter } from '@/components/currency-converter';
import { Icon } from '@/components/icon';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { EMERGENCY, ESSENTIALS, ETIQUETTE, PHRASES, type GuideTip } from '@/data/guide';
import { useTheme } from '@/hooks/use-theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="title">{title}</AppText>
      {children}
    </View>
  );
}

function TipList({ tips }: { tips: readonly GuideTip[] }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {tips.map((tip, index) => (
        <View
          key={tip.title}
          style={[
            styles.tip,
            index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
          ]}>
          <View style={[styles.tipIcon, { backgroundColor: theme.surfaceMuted }]}>
            <Icon name={tip.icon} size={18} color={theme.primary} />
          </View>
          <View style={styles.tipText}>
            <AppText variant="heading">{tip.title}</AppText>
            <AppText variant="caption">{tip.body}</AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function GuideScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.header}>
        <AppText variant="display">Travel guide</AppText>
        <AppText variant="body" color="textSecondary">
          Practical know-how for a respectful, stress-free trip.
        </AppText>
      </View>

      <Section title="Money">
        <CurrencyConverter />
      </Section>

      <Section title="Essentials">
        <TipList tips={ESSENTIALS} />
      </Section>

      <Section title="Etiquette">
        <TipList tips={ETIQUETTE} />
      </Section>

      <Section title="Useful phrases">
        <View style={styles.phrases}>
          {PHRASES.map((item) => (
            <View
              key={item.phrase}
              style={[styles.phrase, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <AppText variant="heading" color="primary">
                {item.phrase}
              </AppText>
              <AppText variant="caption">{item.meaning}</AppText>
              {item.note && (
                <AppText variant="caption" style={{ color: theme.textMuted }}>
                  {item.note}
                </AppText>
              )}
            </View>
          ))}
        </View>
      </Section>

      <Section title="Emergency">
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {EMERGENCY.map((contact, index) => (
            <Pressable
              key={contact.number}
              onPress={() => Linking.openURL(`tel:${contact.number}`)}
              accessibilityRole="button"
              accessibilityLabel={`Call ${contact.label}, ${contact.number}`}
              style={({ pressed }) => [
                styles.tip,
                styles.center,
                index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                { opacity: pressed ? 0.7 : 1 },
              ]}>
              <View style={[styles.tipIcon, { backgroundColor: theme.surfaceMuted }]}>
                <Icon name={contact.icon} size={18} color={theme.danger} />
              </View>
              <AppText variant="body" style={styles.tipText}>
                {contact.label}
              </AppText>
              <AppText variant="heading" style={{ color: theme.danger }}>
                {contact.number}
              </AppText>
            </Pressable>
          ))}
        </View>
        <AppText variant="caption" style={{ color: theme.textMuted }}>
          Save your hotel’s address and your embassy’s number before heading out.
        </AppText>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { gap: Spacing.xs },
  section: { gap: Spacing.md },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  tip: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg },
  center: { alignItems: 'center' },
  tipIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tipText: { flex: 1, gap: 2 },
  phrases: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  phrase: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 2,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
