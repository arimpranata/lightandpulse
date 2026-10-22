import { useLocalSearchParams } from 'expo-router';

import { ProviderProfile } from '@/components/provider-profile';
import { EmptyState, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useApp } from '@/state/app-store';

export default function DriverScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d } = useI18n();
  const driver = useApp().inventory.drivers.find((x) => x.id === id);
  if (!driver) {
    return (
      <Screen>
        <EmptyState icon="car" title={d.explore.empty} />
      </Screen>
    );
  }
  return <ProviderProfile kind="driver" provider={driver} />;
}
