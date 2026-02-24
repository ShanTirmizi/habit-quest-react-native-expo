import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, Radius, FontFamily } from '@/constants/theme';

const LAST_UPDATED = 'February 24, 2026';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.foreground} />
        </Pressable>
        <Text style={styles.title}>Terms of Service</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: {LAST_UPDATED}</Text>

        <Section title="1. Acceptance of Terms">
          <P>
            By downloading, installing, or using HabitQuest, you agree to be bound by these Terms
            of Service. If you do not agree to these terms, please do not use the app.
          </P>
        </Section>

        <Section title="2. Description of Service">
          <P>
            HabitQuest is a habit tracking application with gamification elements, AI-powered
            coaching, and medicine tracking features. The app is designed to help you build
            positive habits, track your progress, and stay motivated through game-like mechanics.
          </P>
        </Section>

        <Section title="3. Account Registration">
          <P>
            When creating an account, you must provide accurate and complete information. You are
            solely responsible for maintaining the security of your account credentials and for all
            activities that occur under your account.
          </P>
          <Bullet text="You must provide accurate information during registration" />
          <Bullet text="You are responsible for keeping your login credentials secure" />
          <Bullet text="You must notify us immediately of any unauthorized access to your account" />
        </Section>

        <Section title="4. Acceptable Use">
          <P>You agree not to:</P>
          <Bullet text="Use the app for any unlawful or unauthorized purpose" />
          <Bullet text="Use automated systems, bots, or scraping tools to access the app" />
          <Bullet text="Share your account credentials with others or allow others to use your account" />
          <Bullet text="Attempt to interfere with or disrupt the app's functionality or infrastructure" />
          <Bullet text="Reverse engineer, decompile, or disassemble any part of the app" />
        </Section>

        <Section title="5. Health & Medicine Disclaimer">
          <P>
            HabitQuest is NOT a medical application. The medicine tracking feature is provided
            solely for personal convenience and organizational purposes.
          </P>
          <Bullet text="Medicine tracking does not replace professional medical advice, diagnosis, or treatment" />
          <Bullet text="Always consult your healthcare provider before making any changes to your medication" />
          <Bullet text="Do not rely on the app for critical medication reminders or dosage information" />
          <Bullet text="We are not responsible for any health outcomes related to use of the medicine tracking feature" />
        </Section>

        <Section title="6. AI Features Disclaimer">
          <P>
            HabitQuest includes AI-powered coaching features. Please be aware of the following:
          </P>
          <Bullet text="AI coaching is for informational and motivational purposes only" />
          <Bullet text="AI-generated content is not a substitute for professional advice of any kind" />
          <Bullet text="AI can make mistakes and may not always provide accurate or applicable responses" />
          <Bullet text="Do not rely on AI coaching for medical, psychological, or other professional decisions" />
        </Section>

        <Section title="7. Intellectual Property">
          <P>
            HabitQuest, including its design, code, graphics, gamification systems, and all
            associated content, is the intellectual property of HabitQuest and is protected by
            applicable intellectual property laws. You may not copy, modify, distribute, or create
            derivative works without our prior written permission.
          </P>
          <P>
            Any content you create within the app (such as journal entries, habit names, and notes)
            remains your property. By using the app, you grant us a limited license to store and
            process your content solely to provide the service.
          </P>
        </Section>

        <Section title="8. Limitation of Liability">
          <P>
            HabitQuest is provided "as is" and "as available" without warranties of any kind,
            whether express or implied. We do not warrant that the app will be uninterrupted,
            error-free, or secure.
          </P>
          <P>
            To the maximum extent permitted by law, we shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages arising from your use of or
            inability to use the app.
          </P>
        </Section>

        <Section title="9. Account Termination">
          <P>
            We reserve the right to suspend or terminate accounts that violate these Terms of
            Service, at our sole discretion and without prior notice.
          </P>
          <P>
            You may delete your account at any time through the app's Settings. Upon deletion, your
            data will be removed in accordance with our Privacy Policy.
          </P>
        </Section>

        <Section title="10. Changes to Terms">
          <P>
            We may update these Terms of Service from time to time. We will notify you of
            significant changes through the app. Your continued use of HabitQuest after any
            changes constitutes your acceptance of the updated terms.
          </P>
        </Section>

        <Section title="11. Contact">
          <P>
            If you have any questions or concerns about these Terms of Service, please contact us
            at:
          </P>
          <P>support@habitquest.app</P>
        </Section>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>{'  \u2022  '}</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bold,
    color: Colors.foreground,
  },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  lastUpdated: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
  },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  paragraph: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  bulletRow: { flexDirection: 'row', paddingRight: Spacing.lg, marginBottom: 4 },
  bulletDot: { fontSize: FontSize.sm, color: Colors.textSecondary },
  bulletText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
