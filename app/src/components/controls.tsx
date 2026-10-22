import Slider from '@react-native-community/slider';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SliderProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  /** Labels for the two ends of a bipolar slider (e.g. Slow ↔ Packed). */
  ends?: [string, string];
};

/** 0–100 preference slider (spec §5). */
export function PreferenceSlider({ label, value, onChange, hint, ends }: SliderProps) {
  const theme = useTheme();
  return (
    <View style={styles.slider}>
      <View style={styles.sliderHeader}>
        <View style={styles.flex}>
          <AppText variant="heading">{label}</AppText>
          {hint && <AppText variant="caption">{hint}</AppText>}
        </View>
        {!ends && (
          <AppText variant="heading" style={[styles.value, { color: theme.primary }]}>
            {value}%
          </AppText>
        )}
      </View>
      <Slider
        value={value}
        onValueChange={(next) => onChange(Math.round(next))}
        minimumValue={0}
        maximumValue={100}
        step={5}
        minimumTrackTintColor={theme.primary}
        maximumTrackTintColor={theme.border}
        thumbTintColor={theme.primary}
        accessibilityLabel={label}
        style={styles.track}
      />
      {ends && (
        <View style={styles.ends}>
          <AppText variant="caption">{ends[0]}</AppText>
          <AppText variant="caption">{ends[1]}</AppText>
        </View>
      )}
    </View>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 20,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const theme = useTheme();
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));
  return (
    <View style={styles.stepper}>
      <AppText variant="body" style={styles.flex}>
        {label}
      </AppText>
      <Pressable
        onPress={() => step(-1)}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel={`${label} −`}
        style={[styles.stepButton, { borderColor: theme.border, opacity: value <= min ? 0.4 : 1 }]}>
        <Icon name="minus" size={16} color={theme.text} />
      </Pressable>
      <AppText variant="heading" style={styles.stepValue}>
        {value}
      </AppText>
      <Pressable
        onPress={() => step(1)}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel={`${label} +`}
        style={[styles.stepButton, { borderColor: theme.border, opacity: value >= max ? 0.4 : 1 }]}>
        <Icon name="plus" size={16} color={theme.text} />
      </Pressable>
    </View>
  );
}

/** Horizontal chooser of trip days. */
export function DayPicker({
  days,
  selected,
  onSelect,
  label,
}: {
  days: { date: string; label: string }[];
  selected: string;
  onSelect: (date: string) => void;
  label: (index: number) => string;
}) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
      {days.map((day, index) => {
        const active = day.date === selected;
        return (
          <Pressable
            key={day.date}
            onPress={() => onSelect(day.date)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.day,
              { backgroundColor: active ? theme.brand : theme.surface, borderColor: active ? theme.brand : theme.border },
            ]}>
            <AppText variant="label" style={{ color: active ? theme.brandText : theme.textSecondary }}>
              {label(index)}
            </AppText>
            <AppText variant="caption" style={{ color: active ? theme.brandText : theme.text }}>
              {day.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  slider: { gap: 2 },
  sliderHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md },
  value: { minWidth: 48, textAlign: 'right', fontVariant: ['tabular-nums'] },
  track: { width: '100%', height: 36 },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { minWidth: 24, textAlign: 'center', fontVariant: ['tabular-nums'] },
  days: { gap: Spacing.sm },
  day: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 72,
  },
});
