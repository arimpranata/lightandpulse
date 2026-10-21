import { Tabs } from 'expo-router/js-tabs';

import { Icon, type IconName } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Discover', icon: 'home' },
  { name: 'explore', title: 'Explore', icon: 'explore' },
  { name: 'saved', title: 'Saved', icon: 'saved' },
  { name: 'guide', title: 'Guide', icon: 'guide' },
];

export default function TabLayout() {
  const theme = useTheme();
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
            title: tab.title,
            tabBarIcon: ({ color, size }) => <Icon name={tab.icon} size={size} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
