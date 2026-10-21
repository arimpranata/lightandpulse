import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { Radius, Spacing } from '@/constants/theme';
import { CURRENCIES } from '@/data/guide';
import { useTheme } from '@/hooks/use-theme';

function parseNumber(text: string): number {
  const value = Number(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(value) ? value : 0;
}

function format(value: number, maximumFractionDigits: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits });
}

export function CurrencyConverter() {
  const theme = useTheme();
  const [code, setCode] = useState<string>(CURRENCIES[0].code);
  const [rates, setRates] = useState<Record<string, string>>(() =>
    Object.fromEntries(CURRENCIES.map((currency) => [currency.code, String(currency.perUnitIdr)])),
  );
  const [amount, setAmount] = useState('50');
  const [toIdr, setToIdr] = useState(true);

  const rate = parseNumber(rates[code]);
  const value = parseNumber(amount);
  const converted = toIdr ? value * rate : rate > 0 ? value / rate : 0;

  const from = toIdr ? code : 'IDR';
  const to = toIdr ? 'IDR' : code;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {CURRENCIES.map((currency) => (
          <Chip
            key={currency.code}
            label={currency.code}
            selected={currency.code === code}
            onPress={() => setCode(currency.code)}
          />
        ))}
      </ScrollView>

      <View style={styles.row}>
        <View style={[styles.field, { backgroundColor: theme.surfaceMuted }]}>
          <AppText variant="label" color="textSecondary">
            {from}
          </AppText>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            style={[styles.amount, { color: theme.text }]}
            accessibilityLabel={`Amount in ${from}`}
            selectTextOnFocus
          />
        </View>
        <Pressable
          onPress={() => setToIdr(!toIdr)}
          accessibilityRole="button"
          accessibilityLabel="Swap currencies"
          style={({ pressed }) => [styles.swap, { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 }]}>
          <Icon name="exchange" size={18} color={theme.primaryText} />
        </Pressable>
        <View style={[styles.field, { backgroundColor: theme.surfaceMuted }]}>
          <AppText variant="label" color="textSecondary">
            {to}
          </AppText>
          <AppText style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
            {format(converted, toIdr ? 0 : 2)}
          </AppText>
        </View>
      </View>

      <View style={styles.rateRow}>
        <AppText variant="caption" style={styles.rateLabel}>
          1 {code} =
        </AppText>
        <TextInput
          value={rates[code]}
          onChangeText={(text) => setRates((current) => ({ ...current, [code]: text }))}
          keyboardType="number-pad"
          style={[styles.rateInput, { color: theme.text, borderColor: theme.border }]}
          accessibilityLabel={`Exchange rate, rupiah per ${code}`}
        />
        <AppText variant="caption">IDR</AppText>
      </View>
      <AppText variant="caption" style={{ color: theme.textMuted }}>
        Rates are indicative — edit to match your money changer. Use authorised changers and count your cash
        before leaving the counter.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chips: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  field: { flex: 1, gap: 2, padding: Spacing.md, borderRadius: Radius.md },
  amount: { fontSize: 22, fontWeight: '700', padding: 0 },
  swap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rateLabel: { flexShrink: 0 },
  rateInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
  },
});
