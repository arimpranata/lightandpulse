import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { useProfileSummary } from '@/components/profile-summary';
import { Button, Card, Notice, Row, Screen, Section } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { applyIntent, parseIntent, type IntentChange } from '@/domain/intent';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useApp } from '@/state/app-store';

/** S09 AI Journey Builder: prompt + suggestions + editable day plan. */
export default function JourneyBuilderScreen() {
  const theme = useTheme();
  const { d, f, date } = useI18n();
  const { profile, journey, saveProfile, plan } = useApp();
  const summary = useProfileSummary();
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  if (!profile) return null;

  const describe = (change: IntentChange): string => {
    switch (change.type) {
      case 'preference':
        return f(change.delta > 0 ? d.builder.change.up : d.builder.change.down, { label: d.prefs[change.key] });
      case 'pace':
        return f(change.delta > 0 ? d.builder.change.up : d.builder.change.down, { label: d.builder.change.pace });
      case 'budget':
        return f(change.delta > 0 ? d.builder.change.up : d.builder.change.down, { label: d.builder.change.budget });
      case 'style':
        return f(change.delta > 0 ? d.builder.change.up : d.builder.change.down, { label: d.builder.change.style });
      case 'days':
        return f(d.builder.change.days, { n: change.value });
    }
  };

  const run = (text: string) => {
    const changes = parseIntent(text);
    if (changes.length === 0) {
      setResult(d.builder.notUnderstood);
      return;
    }
    const next = applyIntent(profile, changes);
    saveProfile(next);
    plan(next);
    setResult(f(d.builder.applied, { changes: changes.map(describe).join(', ') }));
    setPrompt('');
  };

  const chips: { label: string; text: string }[] = [
    { label: d.builder.chips.moreCulture, text: 'more culture' },
    { label: d.builder.chips.slower, text: 'slower' },
    { label: d.builder.chips.beach, text: 'more beach' },
    { label: d.builder.chips.cheaper, text: 'cheaper' },
    { label: d.builder.chips.adventure, text: 'more adventure' },
    { label: d.builder.chips.packed, text: 'packed' },
  ];

  return (
    <Screen
      title={d.builder.title}
      footer={<Button label={d.journey.title} icon="timeline" variant="secondary" onPress={() => router.navigate('/journey')} />}>
      <AppText variant="body" color="textSecondary">
        {d.builder.intro}
      </AppText>

      {summary && (
        <Card>
          <AppText variant="heading">{summary.sentence}</AppText>
        </Card>
      )}

      <View style={[styles.prompt, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder={d.builder.placeholder}
          placeholderTextColor={theme.textMuted}
          multiline
          style={[styles.input, { color: theme.text }]}
          accessibilityLabel={d.builder.placeholder}
        />
        <Button label={d.builder.apply} icon="sparkles" compact disabled={!prompt.trim()} onPress={() => run(prompt)} />
      </View>

      <Section title={d.builder.suggestions}>
        <Row>
          {chips.map((chip) => (
            <Chip key={chip.text} label={chip.label} onPress={() => run(chip.text)} />
          ))}
        </Row>
      </Section>

      {result && (
        <Notice icon="sparkles">
          <AppText variant="caption">{result}</AppText>
        </Notice>
      )}

      {journey && (
        <Section title={d.journey.title}>
          {journey.days.map((day, index) => (
            <Card key={day.date}>
              <AppText variant="label" color="textSecondary">
                {f(d.common.day, { n: index + 1 })} · {date(day.date)}
              </AppText>
              {day.items.map((item) => (
                <Row key={item.id}>
                  <AppText variant="caption" style={styles.time}>
                    {item.start}
                  </AppText>
                  <AppText variant="body" style={styles.flex}>
                    {item.kind === 'meal' ? d.journey.lunch : item.title}
                  </AppText>
                  {item.locked && <Icon name="lock" size={12} color={theme.textMuted} />}
                </Row>
              ))}
            </Card>
          ))}
        </Section>
      )}

      <AppText variant="caption" style={{ color: theme.textMuted }}>
        {d.builder.disclaimer}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  prompt: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, alignItems: 'flex-end' },
  input: { alignSelf: 'stretch', minHeight: 64, fontSize: 16, textAlignVertical: 'top' },
  time: { width: 48, fontVariant: ['tabular-nums'] },
});
