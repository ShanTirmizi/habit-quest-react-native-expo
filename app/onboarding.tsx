import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  Dimensions,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '@/convex/_generated/api';
import { useTheme } from '@/contexts/theme-context';
import { FontSize, Spacing, Radius, FontFamily, Shadows, type ThemeColors } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import type { NdCondition, AdhdSubtype, DiagnosisType } from '@/types';
import { ND_CONDITION_CONFIG, ADHD_SUBTYPE_CONFIG, DIAGNOSIS_TYPE_CONFIG } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation('onboarding');
  const styles = useMemo(() => createStyles(colors), [colors]);

  const SLIDES = useMemo(() => [
    {
      id: '1',
      icon: 'flame' as const,
      iconColor: colors.accent,
      title: t('slide1.title'),
      description: t('slide1.description'),
    },
    {
      id: '2',
      icon: 'trophy' as const,
      iconColor: colors.primary,
      title: t('slide2.title'),
      description: t('slide2.description'),
    },
    {
      id: '3',
      icon: 'compass' as const,
      iconColor: colors.secondary,
      title: t('slide3.title'),
      description: t('slide3.description'),
    },
  ], [colors, t]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNdStep, setShowNdStep] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ND profile state
  const [selectedConditions, setSelectedConditions] = useState<NdCondition[]>([]);
  const [adhdSubtype, setAdhdSubtype] = useState<AdhdSubtype | undefined>(undefined);
  const [diagnosisType, setDiagnosisType] = useState<DiagnosisType | undefined>(undefined);

  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const updateNdProfile = useMutation(api.users.updateNeurodivergenceProfile);
  const featureFlags = useQuery(api.featureFlags.getFlags);
  const ndEnabled = featureFlags?.neurodivergenceSupport ?? false;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleComplete = useCallback(async () => {
    await completeOnboarding();
    router.replace('/(tabs)');
  }, [completeOnboarding, router]);

  const handleNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else if (ndEnabled) {
      // After last slide, show the ND personalisation step (when feature is enabled)
      setShowNdStep(true);
    } else {
      handleComplete();
    }
  }, [currentIndex, SLIDES.length, ndEnabled, handleComplete]);

  const handleSaveNdProfile = useCallback(async () => {
    if (selectedConditions.length > 0) {
      await updateNdProfile({
        conditions: selectedConditions,
        adhdSubtype: selectedConditions.includes('adhd') ? adhdSubtype : undefined,
        diagnosisType,
      });
    }
    await handleComplete();
  }, [selectedConditions, adhdSubtype, diagnosisType, updateNdProfile, handleComplete]);

  const toggleCondition = useCallback((condition: NdCondition) => {
    Haptics.selectionAsync();
    setSelectedConditions((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition]
    );
  }, []);

  const isLastSlide = currentIndex === SLIDES.length - 1;

  const renderSlide = ({ item }: { item: (typeof SLIDES)[number] }) => (
    <View style={styles.slide}>
      <View style={styles.iconCircle}>
        <Ionicons name={item.icon} size={52} color={item.iconColor} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  // ── ND Personalisation Step ──
  if (showNdStep) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Pressable onPress={handleComplete} style={styles.skipButton}>
            <Text style={styles.skipText}>{t('skip')}</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.ndContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.ndHeader}>
            <View style={[styles.iconCircle, { width: 80, height: 80, borderRadius: 40, marginBottom: Spacing.lg }]}>
              <Ionicons name="accessibility-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.ndTitle}>{t('ndStep.title')}</Text>
            <Text style={styles.ndSubtitle}>
              {t('ndStep.subtitle')}
            </Text>
            <Text style={styles.ndPrivacy}>
              {t('ndStep.privacy')}
            </Text>
          </View>

          {/* Condition chips */}
          <View style={styles.ndChipGrid}>
            {(Object.keys(ND_CONDITION_CONFIG) as NdCondition[]).map((condition) => {
              const config = ND_CONDITION_CONFIG[condition];
              const isSelected = selectedConditions.includes(condition);
              return (
                <Pressable
                  key={condition}
                  onPress={() => toggleCondition(condition)}
                  style={({ pressed }) => [
                    styles.ndChip,
                    isSelected && { backgroundColor: `${config.color}18`, borderColor: config.color },
                    pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <Ionicons
                    name={config.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={isSelected ? config.color : colors.textMuted}
                  />
                  <View style={styles.ndChipTextWrap}>
                    <Text style={[styles.ndChipLabel, isSelected && { color: config.color }]}>
                      {t(`nd.${condition}`)}
                    </Text>
                    <Text style={styles.ndChipDesc} numberOfLines={1}>
                      {t(`nd.${condition}.description`)}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color={config.color} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* ADHD Subtype — conditional */}
          {selectedConditions.includes('adhd') && (
            <View style={styles.ndSection}>
              <Text style={styles.ndSectionTitle}>{t('adhdType.title')}</Text>
              <View style={styles.ndOptionRow}>
                {(Object.keys(ADHD_SUBTYPE_CONFIG) as AdhdSubtype[]).map((subtype) => {
                  const config = ADHD_SUBTYPE_CONFIG[subtype];
                  const isSelected = adhdSubtype === subtype;
                  return (
                    <Pressable
                      key={subtype}
                      onPress={() => { Haptics.selectionAsync(); setAdhdSubtype(subtype); }}
                      style={[
                        styles.ndOptionChip,
                        isSelected && { backgroundColor: `${ND_CONDITION_CONFIG.adhd.color}18`, borderColor: ND_CONDITION_CONFIG.adhd.color },
                      ]}
                    >
                      <Text style={[styles.ndOptionLabel, isSelected && { color: ND_CONDITION_CONFIG.adhd.color }]}>
                        {t(`adhdType.${subtype}`)}
                      </Text>
                      <Text style={styles.ndOptionDesc} numberOfLines={2}>
                        {t(`adhdType.${subtype}.description`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Diagnosis type — conditional on any selection */}
          {selectedConditions.length > 0 && (
            <View style={styles.ndSection}>
              <Text style={styles.ndSectionTitle}>{t('diagnosisType.title')}</Text>
              <View style={styles.ndOptionRow}>
                {(Object.keys(DIAGNOSIS_TYPE_CONFIG) as DiagnosisType[]).map((dtype) => {
                  const config = DIAGNOSIS_TYPE_CONFIG[dtype];
                  const isSelected = diagnosisType === dtype;
                  return (
                    <Pressable
                      key={dtype}
                      onPress={() => { Haptics.selectionAsync(); setDiagnosisType(dtype); }}
                      style={[
                        styles.ndOptionChip,
                        isSelected && { backgroundColor: colors.primaryBg, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.ndOptionLabel, isSelected && { color: colors.primary }]}>
                        {t(`diagnosisType.${dtype}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.bottom}>
          <Button
            title={selectedConditions.length > 0 ? t('ndStep.continue') : t('ndStep.skipNone')}
            onPress={handleSaveNdProfile}
            size="lg"
            fullWidth
            style={{ ...Shadows.glow(colors.primary) }}
          />
        </View>
      </View>
    );
  }

  // ── Standard Onboarding Slides ──
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable onPress={handleComplete} style={styles.skipButton}>
          <Text style={styles.skipText}>{t('skip')}</Text>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      <View style={styles.bottom}>
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === currentIndex ? colors.primary : colors.surfaceRaised,
                },
              ]}
            />
          ))}
        </View>

        <Button
          title={t('next')}
          onPress={handleNext}
          size="lg"
          fullWidth
          style={{ ...Shadows.glow(colors.primary) }}
        />
      </View>
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
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  skipButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  skipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: colors.textSecondary,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontFamily: FontFamily.extrabold,
    fontSize: FontSize['3xl'],
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: FontSize.base * 1.6,
  },
  bottom: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ── ND Step ──
  ndContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  ndHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  ndTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  ndSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: FontSize.sm * 1.6,
    maxWidth: 300,
  },
  ndPrivacy: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  ndChipGrid: {
    gap: Spacing.sm,
  },
  ndChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ndChipTextWrap: {
    flex: 1,
  },
  ndChipLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: colors.foreground,
  },
  ndChipDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  ndSection: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  ndSectionTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: colors.textSecondary,
  },
  ndOptionRow: {
    gap: Spacing.sm,
  },
  ndOptionChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ndOptionLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: colors.foreground,
  },
  ndOptionDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
});
