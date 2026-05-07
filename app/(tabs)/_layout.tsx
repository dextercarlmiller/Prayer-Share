import React from 'react';
import { Tabs } from 'expo-router';
import { TouchableOpacity, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Colors } from '@/lib/colors';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: palette.tabBar,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          paddingBottom: 4,
        },
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textLight,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerStyle: { backgroundColor: palette.background },
        headerTintColor: palette.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center',
              marginLeft: 16, borderWidth: 1, borderColor: palette.border,
            }}
          >
            <Text style={{ fontSize: 16 }}>👤</Text>
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push('/new')}
            style={{
              backgroundColor: palette.primary, width: 32, height: 32, borderRadius: 16,
              alignItems: 'center', justifyContent: 'center', marginRight: 16,
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 20, lineHeight: 22 }}>+</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'My Prayers', tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }} />
      <Tabs.Screen name="shared" options={{ title: 'Shared', tabBarIcon: ({ focused }) => <TabIcon emoji="🤝" focused={focused} /> }} />
      <Tabs.Screen name="praise" options={{ title: 'Praise', tabBarIcon: ({ focused }) => <TabIcon emoji="🌟" focused={focused} /> }} />
      <Tabs.Screen name="archive" options={{ title: 'Archive', tabBarIcon: ({ focused }) => <TabIcon emoji="✅" focused={focused} /> }} />
    </Tabs>
  );
}
