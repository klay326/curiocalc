import { useRouter } from 'expo-router';
import { Tabs } from 'expo-router';
import { Platform, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../../lib/auth';

import type { ColorValue } from 'react-native';

function TabIconText({ color, label }: { focused: boolean; color: ColorValue; label: string }) {
  return <Text style={{ color: color as string, fontSize: 20, marginTop: 2 }}>{label}</Text>;
}

export default function TabLayout() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#09090b' },
        headerTintColor: '#fafafa',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        tabBarStyle: {
          backgroundColor: '#18181b',
          borderTopColor: '#27272a',
          paddingBottom: Platform.OS === 'ios' ? 0 : 4,
          height: Platform.OS === 'ios' ? 82 : 60,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#71717a',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'CurioCalc',
          headerRight: () =>
            !user ? (
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                style={{ marginRight: 16 }}
              >
                <Text style={{ color: '#3b82f6', fontWeight: '600', fontSize: 15 }}>
                  Sign In
                </Text>
              </TouchableOpacity>
            ) : null,
          tabBarIcon: ({ focused, color }) => (
            <TabIconText focused={focused} color={color} label="⊞" />
          ),
          tabBarLabel: 'Browse',
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'My Collection',
          tabBarIcon: ({ focused, color }) => (
            <TabIconText focused={focused} color={color} label="★" />
          ),
          tabBarLabel: 'Collection',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <TabIconText focused={focused} color={color} label="●" />
          ),
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}
