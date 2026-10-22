import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onPress: () => void;
};

export function Chip({ label, icon, selected = false, onPress }: Props) {
  const theme = useTheme();
  const foreground = selected ? theme.primaryText : theme.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      {icon && <Icon name={icon} size={16} color={foreground} />}
      <AppText variant="caption" style={[styles.label, { color: foreground }]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { fontWeight: '600' },
});
