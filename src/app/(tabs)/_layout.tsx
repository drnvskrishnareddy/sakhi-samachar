import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';
import { haptic } from '../../lib/haptics';
import { font, usePalette } from '../../theme';

function CalendarIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 22, height: 21, borderRadius: 5, borderWidth: 2, borderColor: color, overflow: 'hidden' }}>
      <View style={{ height: 5, backgroundColor: color }} />
      <View style={{ flexDirection: 'row', gap: 3, padding: 3 }}>
        <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: color }} />
        <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: color }} />
        <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: color }} />
      </View>
    </View>
  );
}
function InsightsIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 22, height: 20, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
      {[8, 15, 11, 19].map((h, i) => <View key={i} style={{ width: 3.5, height: h, borderRadius: 2, backgroundColor: color }} />)}
    </View>
  );
}
function SettingsIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

export default function TabsLayout() {
  const c = usePalette();
  return (
    <Tabs
      screenListeners={{ tabPress: () => haptic.select() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 12 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Calendar', tabBarIcon: ({ color }) => <CalendarIcon color={String(color)} /> }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: ({ color }) => <InsightsIcon color={String(color)} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <SettingsIcon color={String(color)} /> }} />
    </Tabs>
  );
}
