import { Stack } from 'expo-router';

import { id } from '@/locales/id';
import { colors } from '@/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ title: id.auth.forgotTitle }} />
    </Stack>
  );
}
