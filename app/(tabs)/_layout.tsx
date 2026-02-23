import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize } from '@/constants/theme';

type TabIconName = keyof typeof Ionicons.glyphMap;

interface TabConfig {
  name: string;
  title: string;
  icon: TabIconName;
  iconFocused: TabIconName;
}

const TABS: TabConfig[] = [
  { name: 'index', title: 'Habits', icon: 'flame-outline', iconFocused: 'flame' },
  { name: 'medicines', title: 'Meds', icon: 'medical-outline', iconFocused: 'medical' },
  { name: 'quests', title: 'Quests', icon: 'shield-outline', iconFocused: 'shield' },
  { name: 'chronicles', title: 'Journal', icon: 'book-outline', iconFocused: 'book' },
  { name: 'insights', title: 'Insights', icon: 'bar-chart-outline', iconFocused: 'bar-chart' },
];

function TabBarIcon({
  name,
  color,
  size,
}: {
  name: TabIconName;
  color: string;
  size: number;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarBackground: () => (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: Colors.glassBorder,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
          position: 'absolute' as const,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          gap: 2,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <View style={styles.iconContainer}>
                {focused && <View style={styles.activeIndicator} />}
                <TabBarIcon
                  name={focused ? tab.iconFocused : tab.icon}
                  color={color}
                  size={22}
                />
              </View>
            ),
          }}
        />
      ))}
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ focused, color }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.activeIndicator} />}
              <TabBarIcon
                name={focused ? 'flag' : 'flag-outline'}
                color={color}
                size={22}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.primary,
  },
});
