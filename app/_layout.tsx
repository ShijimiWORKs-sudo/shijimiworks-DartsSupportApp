import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SupportDatabaseProvider } from '../src/features/support/SupportDatabaseProvider';

export default function RootLayout() {
  return (
    <SupportDatabaseProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </SupportDatabaseProvider>
  );
}
