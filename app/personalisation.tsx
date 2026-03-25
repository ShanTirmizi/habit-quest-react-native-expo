import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useTheme } from '@/contexts/theme-context';
import { useToast } from '@/contexts/toast-context';
import { FontSize, Spacing, Radius, FontFamily, type ThemeColors } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import type { NdCondition, AdhdSubtype, DiagnosisType } from '@/types';
import { ND_CONDITION_CONFIG, ADHD_SUBTYPE_CONFIG, DIAGNOSIS_TYPE_CONFIG } from '@/types';

export default function PersonalisationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const user = useQuery(api.users.currentUser);
  const updateNdProfile = useMutation(api.users.updateNeurodivergenceProfile);
  const clearNdProfile = useMutation(api.users.clearNeurodivergenceProfile);

  const [selectedConditions, setSelectedConditions] = useState<NdCondition[]>([]);
  const [adhdSubtype, setAdhdSubtype] = useState<AdhdSubtype | undefined>(undefined);
  const [diagnosisType, setDiagnosisType] = useState<DiagnosisType | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Pre-fill from existing profile
  useEffect(() => {
    if (user?.neurodivergenceProfile && !loaded) {
      const p = user.neurodivergenceProfile;
      setSelectedConditions(p.conditions as NdCondition[]);
      setAdhdSubtype(p.adhdSubtype as AdhdSubtype | undefined);
      setDiagnosisType(p.diagnosisType as DiagnosisType | undefined);
      setLoaded(true);
    } else if (user && !user.neurodivergenceProfile && !loaded) {
      setLoaded(true);
    }
  }, [user, loaded]);

  const toggleCondition = useCallback((condition: NdCondition) => {
    Haptics.selectionAsync();
    setSelectedConditions((prev) =>
      prev.includes(condition) ? prev.filter((c) => c !== condition) : [...prev, condition]
    );
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (selectedConditions.length > 0) {
        await updateNdProfile({
          conditions: selectedConditions,
          adhdSubtype: selectedConditions.includes('adhd') ? adhdSubtype : undefined,
          diagnosisType,
        });
        showToast('Profile updated');
      } else {
        await clearNdProfile();
        showToast('Profile cleared');
      }
      router.back();
    } catch {
      showToast('Failed to save', undefined, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [selectedConditions, adhdSubtype, diagnosisType, updateNdProfile, clearNdProfile, showToast, router]);

  const handleClear = useCallback(() => {
    Alert.alert(
      'Clear profile?',
      'This will remove your neurodivergence profile. Dr. Sage will use default coaching.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearNdProfile();
            setSelectedConditions([]);
            setAdhdSubtype(undefined);
            setDiagnosisType(undefined);
            showToast('Profile cleared');
            router.back();
          },
        },
      ]
    );
  }, [clearNdProfile, showToast, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Personalisation</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, Spacing.md) + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionDesc}>
          Select any conditions that apply to you. This personalises Dr. Sage's coaching style, goal suggestions, and gamification to work with your brain, not against it.
        </Text>
        <Text style={styles.privacyNote}>
          This data is only used for AI personalisation and is never shared.
        </Text>

        {/* Condition chips */}
        <View style={styles.chipGrid}>
          {(Object.keys(ND_CONDITION_CONFIG) as NdCondition[]).map((condition) => {
            const config = ND_CONDITION_CONFIG[condition];
            const isSelected = selectedConditions.includes(condition);
            return (
              <Pressable
                key={condition}
                onPress={() => toggleCondition(condition)}
                style={({ pressed }) => [
                  styles.chip,
                  isSelected && { backgroundColor: `${config.color}18`, borderColor: config.color },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Ionicons
                  name={config.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={isSelected ? config.color : colors.textMuted}
                />
                <View style={styles.chipTextWrap}>
                  <Text style={[styles.chipLabel, isSelected && { color: config.color }]}>
                    {config.label}
                  </Text>
                  <Text style={styles.chipDesc} numberOfLines={1}>{config.description}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={18} color={config.color} />}
              </Pressable>
            );
          })}
        </View>

        {/* ADHD Subtype */}
        {selectedConditions.includes('adhd') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ADHD Type</Text>
            <View style={styles.optionList}>
              {(Object.keys(ADHD_SUBTYPE_CONFIG) as AdhdSubtype[]).map((subtype) => {
                const config = ADHD_SUBTYPE_CONFIG[subtype];
                const isSelected = adhdSubtype === subtype;
                return (
                  <Pressable
                    key={subtype}
                    onPress={() => { Haptics.selectionAsync(); setAdhdSubtype(subtype); }}
                    style={[
                      styles.optionChip,
                      isSelected && { backgroundColor: `${ND_CONDITION_CONFIG.adhd.color}18`, borderColor: ND_CONDITION_CONFIG.adhd.color },
                    ]}
                  >
                    <Text style={[styles.optionLabel, isSelected && { color: ND_CONDITION_CONFIG.adhd.color }]}>
                      {config.label}
                    </Text>
                    <Text style={styles.optionDesc}>{config.description}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Diagnosis type */}
        {selectedConditions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How would you describe this?</Text>
            <View style={styles.optionList}>
              {(Object.keys(DIAGNOSIS_TYPE_CONFIG) as DiagnosisType[]).map((dtype) => {
                const config = DIAGNOSIS_TYPE_CONFIG[dtype];
                const isSelected = diagnosisType === dtype;
                return (
                  <Pressable
                    key={dtype}
                    onPress={() => { Haptics.selectionAsync(); setDiagnosisType(dtype); }}
                    style={[
                      styles.optionChip,
                      isSelected && { backgroundColor: colors.primaryBg, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.optionLabel, isSelected && { color: colors.primary }]}>
                      {config.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Clear button */}
        {user?.neurodivergenceProfile && (
          <Pressable
            onPress={handleClear}
            style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={styles.clearBtnText}>Clear profile</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <Button
          title={isSaving ? 'Saving...' : 'Save'}
          onPress={handleSave}
          fullWidth
          disabled={isSaving}
          loading={isSaving}
        />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
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
    headerSpacer: { width: 36 },
    scrollContent: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
    },
    sectionDesc: {
      fontFamily: FontFamily.regular,
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      lineHeight: FontSize.sm * 1.6,
      marginBottom: Spacing.xs,
    },
    privacyNote: {
      fontFamily: FontFamily.medium,
      fontSize: FontSize.xs,
      color: colors.textMuted,
      marginBottom: Spacing.lg,
    },
    chipGrid: {
      gap: Spacing.sm,
    },
    chip: {
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
    chipTextWrap: {
      flex: 1,
    },
    chipLabel: {
      fontFamily: FontFamily.semibold,
      fontSize: FontSize.base,
      color: colors.foreground,
    },
    chipDesc: {
      fontFamily: FontFamily.regular,
      fontSize: FontSize.xs,
      color: colors.textMuted,
      marginTop: 1,
    },
    section: {
      marginTop: Spacing.xl,
      gap: Spacing.sm,
    },
    sectionTitle: {
      fontFamily: FontFamily.semibold,
      fontSize: FontSize.sm,
      color: colors.textSecondary,
    },
    optionList: {
      gap: Spacing.sm,
    },
    optionChip: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm + 2,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    optionLabel: {
      fontFamily: FontFamily.semibold,
      fontSize: FontSize.sm,
      color: colors.foreground,
    },
    optionDesc: {
      fontFamily: FontFamily.regular,
      fontSize: FontSize.xs,
      color: colors.textMuted,
      marginTop: 1,
    },
    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.xl,
      paddingVertical: Spacing.sm,
    },
    clearBtnText: {
      fontFamily: FontFamily.medium,
      fontSize: FontSize.sm,
      color: colors.danger,
    },
    footer: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
