import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useTheme } from '@/contexts/theme-context';
import {
  FontSize,
  Spacing,
  Radius,
  FontFamily,
  Shadows,
  type ThemeColors,
} from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, LOCALE_DISPLAY_NAMES, type SupportedLocale } from '@/lib/i18n';
import i18n from '@/lib/i18n';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const { t } = useTranslation('settings');
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Feature flags
  const featureFlags = useQuery(api.featureFlags.getFlags);

  // Notification preferences
  const preferences = useQuery(api.notifications.getPreferences);
  const updatePreferences = useMutation(api.notifications.updatePreferences);

  const morningReminder = preferences?.morningReminder ?? true;
  const afternoonReminder = preferences?.afternoonReminder ?? true;
  const eveningReminder = preferences?.eveningReminder ?? true;

  // Privacy controls
  const updateAiProcessing = useMutation(api.users.updateAiProcessing);
  const deleteAiMemories = useMutation(api.users.deleteAllAiMemories);
  const [exportRequested, setExportRequested] = useState(false);
  const exportData = useQuery(api.users.exportUserData, exportRequested ? {} : "skip");
  const aiEnabled = user?.aiProcessingEnabled !== false; // defaults to true

  // Locale
  const updateLocale = useMutation(api.users.updateLocale);

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
    // AuthGate in _layout.tsx handles navigation to login screen
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('account.deleteAccountTitle'),
      t('account.deleteAccountMessage'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('common:delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('account.finalConfirmationTitle'),
              t('account.finalConfirmationMessage'),
              [
                { text: t('common:cancel'), style: 'cancel' },
                {
                  text: t('account.deleteForever'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      await signOut();
                    } catch {
                      Alert.alert(
                        t('common:error'),
                        t('account.deleteError'),
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
            color={colors.foreground}
          />
        </Pressable>
        <Text style={styles.headerTitle}>{t('title')}</Text>
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
                {user?.name ?? t('profile.defaultName')}
              </Text>
              <Text style={styles.profileEmail}>
                {user?.email ?? ''}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('profile.badge')}</Text>
            </View>
          </View>
        </View>

        {/* Section 2: Notifications */}
        <Text style={styles.sectionTitle}>{t('sections.notifications')}</Text>
        <View style={styles.sectionCard}>
          <ToggleRow
            icon="sunny-outline"
            label={t('notifications.morning')}
            value={morningReminder}
            onValueChange={(v) => handleToggle('morningReminder', v)}
            colors={colors}
            styles={styles}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="partly-sunny-outline"
            label={t('notifications.afternoon')}
            value={afternoonReminder}
            onValueChange={(v) => handleToggle('afternoonReminder', v)}
            colors={colors}
            styles={styles}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="moon-outline"
            label={t('notifications.evening')}
            value={eveningReminder}
            onValueChange={(v) => handleToggle('eveningReminder', v)}
            colors={colors}
            styles={styles}
          />
        </View>

        {/* Section: Appearance */}
        <Text style={styles.sectionTitle}>{t('sections.appearance')}</Text>
        <View style={styles.sectionCard}>
          <ToggleRow
            icon={isDark ? 'moon' : 'sunny'}
            label={isDark ? t('appearance.darkMode') : t('appearance.lightMode')}
            value={isDark}
            onValueChange={() => toggleTheme()}
            colors={colors}
            styles={styles}
          />
        </View>

        {/* Section: Language */}
        <Text style={styles.sectionTitle}>{t('sections.language')}</Text>
        <View style={styles.sectionCard}>
          {SUPPORTED_LOCALES.map((locale, index) => (
            <React.Fragment key={locale}>
              {index > 0 && <View style={styles.divider} />}
              <Pressable
                style={styles.row}
                onPress={() => {
                  i18n.changeLanguage(locale);
                  updateLocale({ locale });
                }}
              >
                <View style={styles.rowLeft}>
                  <Ionicons
                    name="globe-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.rowLabel}>
                    {LOCALE_DISPLAY_NAMES[locale]}
                  </Text>
                </View>
                {i18n.language === locale && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={colors.primary}
                  />
                )}
              </Pressable>
            </React.Fragment>
          ))}
        </View>

        {/* Section: Personalisation (behind feature flag) */}
        {featureFlags?.neurodivergenceSupport && (
          <>
            <Text style={styles.sectionTitle}>{t('sections.personalisation')}</Text>
            <View style={styles.sectionCard}>
              <ChevronRow
                icon="accessibility-outline"
                label={t('personalisation.neurodivergence')}
                onPress={() => router.push('/personalisation')}
                colors={colors}
                styles={styles}
              />
            </View>
          </>
        )}

        {/* Section: Privacy & Data */}
        <Text style={styles.sectionTitle}>{t('sections.privacy')}</Text>
        <View style={styles.sectionCard}>
          <ToggleRow
            icon="sparkles-outline"
            label={t('privacy.aiLearning')}
            value={aiEnabled}
            onValueChange={(v) => updateAiProcessing({ enabled: v })}
            colors={colors}
            styles={styles}
          />
          <View style={styles.divider} />
          <Pressable
            style={styles.row}
            onPress={() => {
              Alert.alert(
                t('privacy.deleteAiMemoriesTitle'),
                t('privacy.deleteAiMemoriesMessage'),
                [
                  { text: t('common:cancel'), style: 'cancel' },
                  {
                    text: t('common:delete'),
                    style: 'destructive',
                    onPress: async () => {
                      const result = await deleteAiMemories();
                      Alert.alert(
                        t('privacy.deleteAiMemoriesDone'),
                        t('privacy.deleteAiMemoriesDoneMessage', { count: result.deleted }),
                      );
                    },
                  },
                ]
              );
            }}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.rowLabel}>{t('privacy.deleteAiMemories')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.row}
            onPress={async () => {
              if (!exportRequested) {
                setExportRequested(true);
                Alert.alert(t('privacy.exportPreparing'), t('privacy.exportPreparingMessage'));
                return;
              }
              if (!exportData) {
                Alert.alert(t('privacy.exportLoading'), t('privacy.exportLoadingMessage'));
                return;
              }
              try {
                const json = JSON.stringify(exportData, null, 2);
                await Share.share({
                  message: json,
                  title: t('privacy.exportTitle'),
                });
              } catch {
                Alert.alert(t('common:error'), t('privacy.exportError'));
              }
            }}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="download-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.rowLabel}>{t('privacy.exportData')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Section 3: Legal */}
        <Text style={styles.sectionTitle}>{t('sections.legal')}</Text>
        <View style={styles.sectionCard}>
          <ChevronRow
            icon="shield-checkmark-outline"
            label={t('legal.privacyPolicy')}
            onPress={() => router.push('/privacy-policy')}
            colors={colors}
            styles={styles}
          />
          <View style={styles.divider} />
          <ChevronRow
            icon="document-text-outline"
            label={t('legal.termsOfService')}
            onPress={() => router.push('/terms-of-service')}
            colors={colors}
            styles={styles}
          />
        </View>

        {/* Section 4: Account Actions */}
        <Text style={styles.sectionTitle}>{t('sections.account')}</Text>
        <View style={styles.sectionCard}>
          <Pressable style={styles.row} onPress={handleSignOut}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="log-out-outline"
                size={20}
                color={colors.danger}
              />
              <Text style={[styles.rowLabel, { color: colors.danger }]}>
                {t('account.signOut')}
              </Text>
            </View>
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.row} onPress={handleDeleteAccount}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="trash-outline"
                size={20}
                color={colors.danger}
              />
              <Text
                style={[
                  styles.rowLabel,
                  { color: colors.danger, fontFamily: FontFamily.semibold },
                ]}
              >
                {t('account.deleteAccount')}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Section 6: Footer */}
        <Text style={styles.versionText}>
          {t('version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
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
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color={colors.textSecondary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: colors.surfaceHover,
          true: colors.primaryBg,
        }}
        thumbColor={value ? colors.primary : colors.textSecondary}
        ios_backgroundColor={colors.surfaceHover}
      />
    </View>
  );
}

function ChevronRow({
  icon,
  label,
  onPress,
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color={colors.textSecondary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.textMuted}
      />
    </Pressable>
  );
}

/* ----- Styles ----- */

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.lg,
    color: colors.foreground,
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
    color: colors.textSecondary,
    letterSpacing: 1.2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.primary,
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
    color: colors.foreground,
  },
  profileEmail: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: colors.primaryBg,
  },
  badgeText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: colors.primary,
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
    color: colors.foreground,
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: Spacing.lg + 20 + Spacing.md,
  },

  /* Footer */
  versionText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing['2xl'],
  },
});
