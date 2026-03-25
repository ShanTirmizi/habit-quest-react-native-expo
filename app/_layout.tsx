import React, { useEffect, useMemo } from 'react';
import { LogBox } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

// Suppress known warning from react-native-draggable-flatlist
LogBox.ignoreLogs(['ref.measureLayout must be called']);

// Also suppress in console (Metro terminal) — upstream library issue
const origConsoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('ref.measureLayout must be called')) return;
  origConsoleError(...args);
};
import { useFonts } from 'expo-font';
import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import * as SplashScreen from 'expo-splash-screen';
import type { ThemeColors } from '@/constants/theme';
import { ConvexProvider } from '@/contexts/ConvexProvider';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ThemeProvider, useTheme } from '@/contexts/theme-context';
import { ToastProvider } from '@/contexts/toast-context';
import { XpToast } from '@/components/ui/XpToast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inConsent = segments[0] === 'consent';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      if (user && !user.privacyPolicyAccepted) {
        router.replace('/consent');
      } else if (user && !user.hasCompletedOnboarding) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } else if (isAuthenticated && !inConsent && segments[0] !== 'privacy-policy' && segments[0] !== 'terms-of-service' && user && !user.privacyPolicyAccepted) {
      router.replace('/consent');
    } else if (isAuthenticated && !inOnboarding && !inConsent && user && user.privacyPolicyAccepted && !user.hasCompletedOnboarding) {
      router.replace('/onboarding');
    }
  }, [isLoading, isAuthenticated, user, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

function ThemedApp() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <AuthGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="(auth)/login"
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="consent"
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen
            name="onboarding"
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen
            name="goals"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="habit-browser"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="companion"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="personalisation"
            options={{ animation: 'slide_from_right' }}
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
  );
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexProvider>
        <AuthProvider>
          <ThemeProvider>
            <BottomSheetModalProvider>
              <SafeAreaProvider>
                <ToastProvider>
                  <ErrorBoundary>
                    <ThemedApp />
                  </ErrorBoundary>
                </ToastProvider>
              </SafeAreaProvider>
            </BottomSheetModalProvider>
          </ThemeProvider>
        </AuthProvider>
      </ConvexProvider>
    </GestureHandlerRootView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });
