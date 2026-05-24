import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#09090b' },
          headerTintColor: '#fafafa',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#09090b' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Sign In', presentation: 'modal' }} />
        <Stack.Screen name="(auth)/register" options={{ title: 'Create Account', presentation: 'modal' }} />
        <Stack.Screen name="calculators/[id]" options={{ title: '' }} />
      </Stack>
    </AuthProvider>
  );
}
