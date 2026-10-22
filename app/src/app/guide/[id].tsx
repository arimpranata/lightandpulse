import { useLocalSearchParams } from 'expo-router';

import { ProviderProfile } from '@/components/provider-profile';
import { EmptyState, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useApp } from '@/state/app-store';

export default function GuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d } = useI18n();
  const guide = useApp().inventory.guides.find((g) => g.id === id);
  if (!guide) {
    return (
      <Screen>
        <EmptyState icon="person" title={d.explore.empty} />
      </Screen>
    );
  }
  return <ProviderProfile kind="guide" provider={guide} />;
}
