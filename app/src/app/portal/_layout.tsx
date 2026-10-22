import { Stack } from 'expo-router';

import { PortalProvider } from '@/state/portal';

export default function PortalLayout() {
  return (
    <PortalProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PortalProvider>
  );
}
