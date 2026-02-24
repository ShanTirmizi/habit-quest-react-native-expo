import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '@/constants/theme';
import { ConvexProvider } from '@/contexts/ConvexProvider';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { XpToast } from '@/components/ui/XpToast';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Check if user needs onboarding
      if (user && !user.hasCompletedOnboarding) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } else if (isAuthenticated && !inOnboarding && user && !user.hasCompletedOnboarding) {
      router.replace('/onboarding');
    }
  }, [isLoading, isAuthenticated, user, segments]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <ConvexProvider>
        <AuthProvider>
          <SafeAreaProvider>
            <ToastProvider>
              <View style={styles.container}>
                <StatusBar style="light" backgroundColor={Colors.background} />
                <AuthGate>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: Colors.background },
                      animation: 'fade',
                    }}
                  >
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen
                      name="(auth)/login"
                      options={{ presentation: 'modal' }}
                    />
                    <Stack.Screen
                      name="onboarding"
                      options={{ animation: 'fade', gestureEnabled: false }}
                    />
                    <Stack.Screen
                      name="settings"
                      options={{ animation: 'slide_from_right' }}
                    />
                    <Stack.Screen
                      name="privacy-policy"
                      options={{ animation: 'slide_from_right' }}
                    />
                    <Stack.Screen
                      name="terms-of-service"
                      options={{ animation: 'slide_from_right' }}
                    />
                  </Stack>
                </AuthGate>
                <XpToast />
              </View>
            </ToastProvider>
          </SafeAreaProvider>
        </AuthProvider>
      </ConvexProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
