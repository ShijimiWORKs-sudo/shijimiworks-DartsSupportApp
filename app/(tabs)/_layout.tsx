import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0f766e',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="today" options={{ title: '今日' }} />
      <Tabs.Screen name="training" options={{ title: '練習ゲーム' }} />
      <Tabs.Screen name="form" options={{ title: 'フォーム' }} />
      <Tabs.Screen name="improvements" options={{ title: '改善' }} />
      <Tabs.Screen name="backup" options={{ title: 'バックアップ' }} />
    </Tabs>
  );
}
