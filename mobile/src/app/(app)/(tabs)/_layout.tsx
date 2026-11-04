import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useMe } from '@/features/queries';
import { id } from '@/locales/id';
import { colors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type TabIconProps = { filled: IconName; outline: IconName; focused: boolean; size: number };

/** Active vs inactive differ by filled/outline as well as color. */
function TabIcon({ filled, outline, focused, size }: TabIconProps) {
  return <Ionicons name={focused ? filled : outline} size={size} color={focused ? colors.foreground : colors.mutedForeground} />;
}

export default function TabsLayout() {
  const isAdmin = useMe().data?.role === 'admin';

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: id.nav.dashboard,
          tabBarIcon: ({ focused, size }) => <TabIcon filled="home" outline="home-outline" focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: id.nav.history,
          tabBarIcon: ({ focused, size }) => <TabIcon filled="time" outline="time-outline" focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          href: isAdmin ? undefined : null,
          title: id.nav.reports,
          tabBarIcon: ({ focused, size }) => <TabIcon filled="bar-chart" outline="bar-chart-outline" focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: id.nav.settings,
          tabBarIcon: ({ focused, size }) => <TabIcon filled="settings" outline="settings-outline" focused={focused} size={size} />,
        }}
      />
    </Tabs>
  );
}
