import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { Icon, type IconName } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useApp } from '@/state/app-store';

const TABS: { name: string; key: 'home' | 'explore' | 'journey' | 'map' | 'profile'; icon: IconName }[] = [
  { name: 'index', key: 'home', icon: 'home' },
  { name: 'explore', key: 'explore', icon: 'explore' },
  { name: 'journey', key: 'journey', icon: 'timeline' },
  { name: 'map', key: 'map', icon: 'map' },
  { name: 'profile', key: 'profile', icon: 'person' },
];

/** Five primary tabs (spec §6). First run goes to onboarding (spec §5). */
export default function TabLayout() {
  const theme = useTheme();
  const { d } = useI18n();
  const { loaded, profile } = useApp();

  if (!loaded) return null;
  if (!profile) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.tabBar, borderTopColor: theme.border },
        tabBarLabelStyle: { fontWeight: '600' },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: d.tabs[tab.key],
            tabBarIcon: ({ color, size }) => <Icon name={tab.icon} size={size} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
