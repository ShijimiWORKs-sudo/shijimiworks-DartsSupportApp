import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const isPcWeb = Platform.OS === 'web' && width >= 1024;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0f766e',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarPosition: isPcWeb ? 'left' : 'bottom',
        tabBarStyle: isPcWeb ? { width: 220, paddingTop: 12 } : undefined,
      }}
    >
      <Tabs.Screen name="today" options={{ title: '今日' }} />
      <Tabs.Screen name="training" options={{ title: '練習ゲーム' }} />
      <Tabs.Screen name="form" options={{ title: 'フォーム' }} />
      <Tabs.Screen name="improvements" options={{ title: '改善' }} />
      <Tabs.Screen name="analysis" options={{ title: 'PC分析' }} />
      <Tabs.Screen name="backup" options={{ title: 'バックアップ' }} />
    </Tabs>
  );
}
