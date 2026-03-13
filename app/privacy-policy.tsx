import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Spacing, Radius, FontFamily, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: March 13, 2026 {'\u2022'} Version 1.0</Text>

        {/* 1. Data Controller */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Controller</Text>
          <Text style={styles.sectionBody}>
            HabitQuest is the data controller responsible for your personal data. For any privacy inquiries, contact us at support@habitquest.app.
          </Text>
        </View>

        {/* 2. Legal Basis for Processing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal Basis for Processing</Text>
          <Text style={styles.sectionBody}>
            We process your data under GDPR Article 6(1)(a) — your explicit consent, which you provide when creating your account. Health-related data (medicine tracking) is processed under GDPR Article 9(2)(a) — explicit consent for special category data.{'\n\n'}You may withdraw consent at any time through Settings without affecting the lawfulness of processing performed before withdrawal.
          </Text>
        </View>

        {/* 3. Information We Collect */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information We Collect</Text>
          <Text style={styles.sectionBody}>
            We collect the following categories of data:{'\n\n'}
            {'\u2022'} Account data: email address and display name{'\n'}
            {'\u2022'} Habit data: habits, completions, streaks, goals{'\n'}
            {'\u2022'} Journal entries: gratitudes, reflections, mood{'\n'}
            {'\u2022'} Health data (special category): medicine names, dosages, adherence records{'\n'}
            {'\u2022'} AI-extracted insights: behavioral patterns extracted from your journal and coaching conversations (only with your consent){'\n'}
            {'\u2022'} Chat messages: conversations with the AI coaching feature{'\n'}
            {'\u2022'} Device data: push notification tokens, timezone
          </Text>
        </View>

        {/* 4. How We Use Your Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Use Your Data</Text>
          <Text style={styles.sectionBody}>
            Your data is used exclusively to:{'\n\n'}
            {'\u2022'} Provide and personalize the HabitQuest experience{'\n'}
            {'\u2022'} Power AI coaching and journal analysis (if enabled){'\n'}
            {'\u2022'} Extract behavioral patterns to improve coaching (if AI is enabled){'\n'}
            {'\u2022'} Track progress and generate insights{'\n'}
            {'\u2022'} Send reminders and notifications (if enabled)
          </Text>
        </View>

        {/* 5. AI Features & Data Processing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Features & Data Processing</Text>
          <Text style={styles.sectionBody}>
            HabitQuest uses Anthropic's Claude AI for:{'\n\n'}
            {'\u2022'} Journal analysis and memory extraction{'\n'}
            {'\u2022'} Personalized coaching conversations{'\n'}
            {'\u2022'} Behavioral pattern detection{'\n\n'}
            When AI features are enabled, relevant data is sent to Anthropic for processing. Your data is NOT used to train AI models. You can disable AI features at any time in Settings, which stops all data transmission to Anthropic. You can also delete all AI-extracted memories from Settings.
          </Text>
        </View>

        {/* 6. Data Sharing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sharing & Third Parties</Text>
          <Text style={styles.sectionBody}>
            We do not sell your data. Data is shared only with:{'\n\n'}
            {'\u2022'} Anthropic — AI processing (only if AI features are enabled){'\n'}
            {'\u2022'} Convex — cloud database and backend infrastructure{'\n'}
            {'\u2022'} Expo — push notification delivery{'\n\n'}
            All third-party processors are bound by data processing agreements and process data only as instructed.
          </Text>
        </View>

        {/* 7. Data Storage & Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Storage & Security</Text>
          <Text style={styles.sectionBody}>
            Your data is stored on Convex cloud infrastructure. All data is encrypted in transit (TLS) and at rest. Access is restricted to authenticated users for their own data only.
          </Text>
        </View>

        {/* 8. Your Rights (GDPR) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.sectionBody}>
            Under GDPR, you have the right to:{'\n\n'}
            {'\u2022'} Access: View all your data (Settings → Export My Data){'\n'}
            {'\u2022'} Portability: Export your data in JSON format{'\n'}
            {'\u2022'} Erasure: Delete your account and all data (Settings → Delete Account){'\n'}
            {'\u2022'} Restrict processing: Disable AI features (Settings → AI Learning toggle){'\n'}
            {'\u2022'} Withdraw consent: Disable specific processing at any time in Settings{'\n'}
            {'\u2022'} Object: Contact us to object to specific data processing{'\n'}
            {'\u2022'} Rectification: Contact us to correct inaccurate data{'\n\n'}
            To exercise any right, use the in-app Settings or contact support@habitquest.app. We will respond within 30 days.
          </Text>
        </View>

        {/* 9. Data Retention */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Retention</Text>
          <Text style={styles.sectionBody}>
            Your data is retained while your account is active. Upon account deletion, all data is permanently and immediately removed from our systems. AI-extracted memories can be deleted independently via Settings without deleting your account.
          </Text>
        </View>

        {/* 10. Children's Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Children's Privacy</Text>
          <Text style={styles.sectionBody}>
            HabitQuest is not intended for children under 16 (or 13 where applicable). We do not knowingly collect personal information from children.
          </Text>
        </View>

        {/* 11. Contact & Complaints */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact & Complaints</Text>
          <Text style={styles.sectionBody}>
            For privacy questions or to exercise your rights:{'\n\n'}support@habitquest.app{'\n\n'}
            If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.lg,
    color: colors.foreground,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  lastUpdated: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: colors.foreground,
    marginBottom: Spacing.sm,
  },
  sectionBody: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    lineHeight: FontSize.sm * 1.6,
  },
});
