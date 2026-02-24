import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, Radius, FontFamily } from '@/constants/theme';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: February 24, 2026</Text>

        {/* 1. Information We Collect */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information We Collect</Text>
          <Text style={styles.sectionBody}>
            We collect the following information to provide and improve HabitQuest:{'\n\n'}
            {'\u2022'} Email address and display name{'\n'}
            {'\u2022'} Habit data (habits you create, completions, streaks){'\n'}
            {'\u2022'} Journal entries{'\n'}
            {'\u2022'} Medicine and supplement information{'\n'}
            {'\u2022'} Usage analytics (feature usage, session duration)
          </Text>
        </View>

        {/* 2. How We Use Your Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Use Your Data</Text>
          <Text style={styles.sectionBody}>
            Your data is used to:{'\n\n'}
            {'\u2022'} Personalize your HabitQuest experience{'\n'}
            {'\u2022'} Power AI coaching features (powered by Anthropic Claude){'\n'}
            {'\u2022'} Track your progress and generate insights{'\n'}
            {'\u2022'} Send relevant notifications and reminders
          </Text>
        </View>

        {/* 3. Data Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Storage</Text>
          <Text style={styles.sectionBody}>
            Your data is stored securely on Convex cloud infrastructure. All data is encrypted in
            transit and at rest to ensure your information remains protected.
          </Text>
        </View>

        {/* 4. AI Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Features</Text>
          <Text style={styles.sectionBody}>
            HabitQuest uses Anthropic's Claude AI to power journal analysis and personalized
            coaching features. When you use these features, relevant data is sent to Anthropic for
            processing. Your data is not used to train Anthropic's models.
          </Text>
        </View>

        {/* 5. Data Sharing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sharing</Text>
          <Text style={styles.sectionBody}>
            We do not sell your data. Your information is only shared with the following third
            parties as necessary to provide our services:{'\n\n'}
            {'\u2022'} Anthropic — for AI-powered features (journal analysis, coaching){'\n'}
            {'\u2022'} Notification services — for delivering push notifications
          </Text>
        </View>

        {/* 6. Your Rights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.sectionBody}>
            You have the right to:{'\n\n'}
            {'\u2022'} View and export your data{'\n'}
            {'\u2022'} Delete your account and all associated data{'\n'}
            {'\u2022'} Opt out of AI-powered features{'\n'}
            {'\u2022'} Disable notifications
          </Text>
        </View>

        {/* 7. Data Retention */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Retention</Text>
          <Text style={styles.sectionBody}>
            Your data is kept for as long as your account is active. If you choose to delete your
            account, all associated data will be permanently removed within 30 days of account
            deletion.
          </Text>
        </View>

        {/* 8. Children's Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Children's Privacy</Text>
          <Text style={styles.sectionBody}>
            HabitQuest is not intended for children under the age of 13. We do not knowingly collect
            personal information from children under 13.
          </Text>
        </View>

        {/* 9. Contact Us */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.sectionBody}>
            If you have any questions or concerns about this Privacy Policy, please contact us
            at:{'\n\n'}support@habitquest.app
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    color: Colors.foreground,
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
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  sectionBody: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: FontSize.sm * 1.6,
  },
});
