import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FieldProps = Omit<TextInputProps, 'style'> & { label: string; hint?: string; error?: string | null };

/** Labelled text input with an optional hint or error line. */
export function Field({ label, hint, error, multiline, ...input }: FieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
      <TextInput
        {...input}
        multiline={multiline}
        accessibilityLabel={label}
        placeholderTextColor={theme.textMuted}
        style={[styles.input, multiline && styles.multiline, { color: theme.text, borderColor: error ? theme.danger : theme.border }]}
      />
      {(error || hint) && (
        <AppText variant="caption" style={error ? { color: theme.danger } : undefined}>
          {error ?? hint}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.xs },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, minHeight: 46, fontSize: 16 },
  multiline: { paddingVertical: Spacing.sm, minHeight: 90, textAlignVertical: 'top' },
});
