import { Link, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Spacing } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
  action?: { label: string; href: Href };
};

export function SectionHeader({ title, subtitle, action }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText variant="title">{title}</AppText>
        {subtitle && <AppText variant="caption">{subtitle}</AppText>}
      </View>
      {action && (
        <Link href={action.href}>
          <AppText variant="caption" color="primary" style={styles.action}>
            {action.label}
          </AppText>
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  text: { flex: 1, gap: 2 },
  action: { fontWeight: '700' },
});
