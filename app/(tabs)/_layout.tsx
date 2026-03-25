import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';
import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation('common');

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.dashboard') }} />
      <Tabs.Screen name="medicines" options={{ title: t('tabs.medicines') }} />
      <Tabs.Screen name="chronicles" options={{ title: t('tabs.chronicles') }} />
      <Tabs.Screen name="quests" options={{ title: t('tabs.quests') }} />
      <Tabs.Screen name="insights" options={{ title: t('tabs.insights') }} />
    </Tabs>
  );
}
