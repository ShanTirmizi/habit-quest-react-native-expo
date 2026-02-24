import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Colors,
  FontSize,
  Spacing,
  Radius,
  FontFamily,
  Shadows,
} from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();

  // Notification preferences
  const preferences = useQuery(api.notifications.getPreferences);
  const updatePreferences = useMutation(api.notifications.updatePreferences);

  const morningReminder = preferences?.morningReminder ?? true;
  const afternoonReminder = preferences?.afternoonReminder ?? true;
  const eveningReminder = preferences?.eveningReminder ?? true;

  // Account deletion
  const deleteAccount = useMutation(api.accountDeletion.deleteAccount);

  const handleToggle = (
    key: 'morningReminder' | 'afternoonReminder' | 'eveningReminder',
    value: boolean
  ) => {
    updatePreferences({ [key]: value });
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This will permanently delete your account and all data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This cannot be undone. Are you absolutely sure you want to delete your account?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      await signOut();
                      router.replace('/(auth)/login');
                    } catch {
                      Alert.alert(
                        'Error',
                        'Failed to delete account. Please try again.'
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const userInitial = (user?.name ?? user?.email ?? '?')[0].toUpperCase();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={12}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={Colors.foreground}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Profile Card */}
        <View style={styles.sectionCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.name ?? 'User'}
              </Text>
              <Text style={styles.profileEmail}>
                {user?.email ?? ''}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Member</Text>
            </View>
          </View>
        </View>

        {/* Section 2: Notifications */}
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.sectionCard}>
          <ToggleRow
            icon="sunny-outline"
            label="Morning reminders"
            value={morningReminder}
            onValueChange={(v) => handleToggle('morningReminder', v)}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="partly-sunny-outline"
            label="Afternoon reminders"
            value={afternoonReminder}
            onValueChange={(v) => handleToggle('afternoonReminder', v)}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="moon-outline"
            label="Evening reminders"
            value={eveningReminder}
            onValueChange={(v) => handleToggle('eveningReminder', v)}
          />
        </View>

        {/* Section 3: Legal */}
        <Text style={styles.sectionTitle}>LEGAL</Text>
        <View style={styles.sectionCard}>
          <ChevronRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => router.push('/privacy-policy')}
          />
          <View style={styles.divider} />
          <ChevronRow
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => router.push('/terms-of-service')}
          />
        </View>

        {/* Section 4: Account Actions */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.sectionCard}>
          <Pressable style={styles.row} onPress={handleSignOut}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="log-out-outline"
                size={20}
                color={Colors.danger}
              />
              <Text style={[styles.rowLabel, { color: Colors.danger }]}>
                Sign Out
              </Text>
            </View>
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.row} onPress={handleDeleteAccount}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="trash-outline"
                size={20}
                color={Colors.danger}
              />
              <Text
                style={[
                  styles.rowLabel,
                  { color: Colors.danger, fontFamily: FontFamily.semibold },
                ]}
              >
                Delete Account
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Section 6: Footer */}
        <Text style={styles.versionText}>
          HabitQuest v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </ScrollView>
    </View>
  );
}

/* ----- Sub-components ----- */

function ToggleRow({
  icon,
  label,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color={Colors.textSecondary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: Colors.surfaceHover,
          true: Colors.primaryBg,
        }}
        thumbColor={value ? Colors.primary : Colors.textSecondary}
        ios_backgroundColor={Colors.surfaceHover}
      />
    </View>
  );
}

function ChevronRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color={Colors.textSecondary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={Colors.textMuted}
      />
    </Pressable>
  );
}

/* ----- Styles ----- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.lg,
    color: Colors.foreground,
  },
  headerSpacer: {
    width: 36,
  },

  /* Scroll */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },

  /* Section */
  sectionTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.card,
  },

  /* Profile */
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  profileName: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: Colors.foreground,
  },
  profileEmail: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryBg,
  },
  badgeText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },

  /* Row */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 52,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rowLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.foreground,
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.lg + 20 + Spacing.md,
  },

  /* Footer */
  versionText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing['2xl'],
  },
});
