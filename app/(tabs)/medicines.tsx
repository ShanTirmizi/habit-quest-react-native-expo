import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Animated,
} from 'react-native';
import { useToast } from '@/contexts/toast-context';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { FontSize, Spacing, Radius, FontFamily, Shadows, type ThemeColors } from '@/constants/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCard } from '@/components/ui/GradientCard';
import { BadgePill } from '@/components/ui/BadgePill';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ConcentricRings } from '@/components/ui/ConcentricRings';
import { format, parseISO } from 'date-fns';
import type { TodayMedicineScheduleItem, MedicineCompletionStatus } from '@/types';
import { formatMedicineTime } from '@/types';
import type { Id } from '@/convex/_generated/dataModel';

const TIME_SLOT_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
  morning: { icon: 'sunny-outline', label: 'Morning', color: '#F59E0B' },
  afternoon: { icon: 'partly-sunny-outline', label: 'Afternoon', color: '#F97316' },
  evening: { icon: 'cloudy-night-outline', label: 'Evening', color: '#8B5CF6' },
  night: { icon: 'moon-outline', label: 'Night', color: '#6366F1' },
};

const TIME_SLOT_OPTIONS: { label: string; value: string; time: string }[] = [
  { label: 'Morning', value: 'morning', time: '08:00' },
  { label: 'Afternoon', value: 'afternoon', time: '12:00' },
  { label: 'Evening', value: 'evening', time: '18:00' },
  { label: 'Night', value: 'night', time: '21:00' },
];

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function MedicinesScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { showToast } = useToast();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState('today');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const todayDate = getTodayDateString();

  // Compute date range for history
  const fourteenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Convex queries
  const schedule = useQuery(
    api.medicines.getTodaySchedule,
    userId ? { userId, date: todayDate } : 'skip'
  );

  const medicineStats = useQuery(
    api.progress.getMedicineStats,
    userId ? { userId } : 'skip'
  );

  const medicineHistory = useQuery(
    api.medicines.getMedicineHistory,
    userId && tab === 'history' ? { userId, startDate: fourteenDaysAgo, endDate: todayDate } : 'skip'
  );

  const allMedicines = useQuery(
    api.medicines.getMedicines,
    userId && tab === 'history' ? { userId } : 'skip'
  );

  // Convex mutations
  const markTakenMutation = useMutation(api.medicines.markMedicineTaken);
  const markSkippedMutation = useMutation(api.medicines.markMedicineSkipped);
  const addMedicineMutation = useMutation(api.medicines.addMedicine);

  const isLoading = schedule === undefined || medicineStats === undefined;
  const scheduleData = schedule ?? [];
  const medicineStreak = medicineStats?.medicineStreak ?? 0;

  const groupedSchedule = useMemo(() => {
    const groups: Record<string, TodayMedicineScheduleItem[]> = {};
    for (const item of scheduleData) {
      const slot = item.label || 'other';
      if (!groups[slot]) groups[slot] = [];
      groups[slot].push(item);
    }
    return groups;
  }, [scheduleData]);

  const stats = useMemo(() => {
    const total = scheduleData.length;
    const taken = scheduleData.filter((s) => s.status === 'taken').length;
    const pending = scheduleData.filter((s) => s.status === 'pending').length;
    return { total, taken, pending, percentage: total > 0 ? Math.round((taken / total) * 100) : 0 };
  }, [scheduleData]);

  const handleMarkTaken = useCallback(
    async (medicineId: string) => {
      if (!userId) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const item = scheduleData.find((s) => s.medicineId === medicineId);
      try {
        await markTakenMutation({
          medicineId: medicineId as Id<'medicines'>,
          userId,
          scheduledTime: item?.scheduledTime ?? '08:00',
          date: todayDate,
        });
      } catch (error) {
        showToast('Failed to mark medicine as taken', undefined, 'error');
      }
    },
    [userId, scheduleData, markTakenMutation, todayDate]
  );

  const handleMarkSkipped = useCallback(
    async (medicineId: string) => {
      if (!userId) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const item = scheduleData.find((s) => s.medicineId === medicineId);
      try {
        await markSkippedMutation({
          medicineId: medicineId as Id<'medicines'>,
          userId,
          scheduledTime: item?.scheduledTime ?? '08:00',
          date: todayDate,
        });
      } catch (error) {
        showToast('Failed to mark medicine as skipped', undefined, 'error');
      }
    },
    [userId, scheduleData, markSkippedMutation, todayDate]
  );

  const handleAddMedicine = useCallback(
    async (name: string, dosage: string, timeSlotLabel: string, timeSlotTime: string) => {
      if (!userId) return;
      try {
        await addMedicineMutation({
          userId,
          name: name.trim(),
          dosage: dosage.trim(),
          scheduledTimes: [
            {
              label: timeSlotLabel,
              time: timeSlotTime,
              reminderEnabled: true,
            },
          ],
        });
        setShowAddSheet(false);
      } catch (error) {
        showToast('Failed to add medicine', undefined, 'error');
      }
    },
    [userId, addMedicineMutation]
  );

  if (!userId) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.centered]}>
        <Text style={styles.signInText}>Please sign in to view your medicines.</Text>
      </View>
    );
  }

  const takenProgress = stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 0;
  const streakProgress = Math.min(100, Math.round((medicineStreak / 30) * 100));
  const slotEntries = Object.entries(groupedSchedule);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Medicines</Text>
          <BadgePill
            label={`${medicineStreak} day streak`}
            color={colors.accent}
            size="sm"
          />
        </View>
        <Pressable
          onPress={() => setShowAddSheet(true)}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Concentric Rings Stats */}
      <View style={styles.ringsSection}>
        <ConcentricRings
          size={160}
          strokeWidth={8}
          rings={[
            { progress: stats.percentage, color: colors.primary, label: 'Adherence' },
            { progress: takenProgress, color: colors.secondary, label: 'Taken' },
            { progress: streakProgress, color: colors.accent, label: 'Streak' },
          ]}
        >
          <Text style={styles.ringsCenterNumber}>{stats.percentage}%</Text>
        </ConcentricRings>
        <View style={styles.ringsLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendLabel}>Adherence</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.secondary }]} />
            <Text style={styles.legendLabel}>Taken</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={styles.legendLabel}>Streak</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <SegmentedControl
          segments={[
            { label: 'Today', value: 'today' },
            { label: 'History', value: 'history' },
          ]}
          selectedValue={tab}
          onValueChange={setTab}
        />
      </View>

      {isLoading ? (
        <View style={[styles.centered, { gap: Spacing.sm, paddingHorizontal: Spacing.lg }]}>
          <Skeleton height={60} borderRadius={Radius.lg} />
          <Skeleton height={60} borderRadius={Radius.lg} />
          <Skeleton height={60} borderRadius={Radius.lg} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                setTimeout(() => setRefreshing(false), 1000);
              }}
              tintColor={colors.primary}
            />
          }
        >
          {tab === 'today' ? (
            scheduleData.length === 0 ? (
              <EmptyState
                icon="medical-outline"
                title="No medicines scheduled"
                description="Add your medications to track adherence and earn XP for staying on schedule."
                actionLabel="Add Medicine"
                onAction={() => setShowAddSheet(true)}
              />
            ) : (
              <View style={styles.timelineContainer}>
                {slotEntries.map(([slot, items]) => {
                  const config = TIME_SLOT_CONFIG[slot] || { icon: 'medkit-outline' as keyof typeof Ionicons.glyphMap, label: slot, color: colors.textSecondary };

                  return (
                    <View key={slot} style={styles.slotSection}>
                      <View style={styles.slotHeader}>
                        <View style={[styles.slotDot, { backgroundColor: config.color }]} />
                        <Ionicons name={config.icon} size={16} color={config.color} />
                        <Text style={[styles.slotLabel, { color: config.color }]}>
                          {config.label}
                        </Text>
                        <Text style={styles.slotTime}>
                          {items[0] ? formatMedicineTime(items[0].scheduledTime) : ''}
                        </Text>
                      </View>
                      <View style={styles.slotCards}>
                        {items.map((item) => (
                          <MedicineCard
                            key={`${item.medicineId}_${item.scheduledTime}`}
                            item={item}
                            onMarkTaken={handleMarkTaken}
                            onMarkSkipped={handleMarkSkipped}
                            colors={colors}
                            styles={styles}
                          />
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            )
          ) : (
            <MedicineHistoryView
              history={medicineHistory}
              medicines={allMedicines}
              colors={colors}
              styles={styles}
            />
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Add Medicine Sheet */}
      <AddMedicineSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAdd={handleAddMedicine}
        colors={colors}
        styles={styles}
      />
    </View>
  );
}

function MedicineCard({
  item,
  onMarkTaken,
  onMarkSkipped,
  colors,
  styles,
}: {
  item: TodayMedicineScheduleItem;
  onMarkTaken: (id: string) => void;
  onMarkSkipped: (id: string) => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const isTaken = item.status === 'taken';
  const isSkipped = item.status === 'skipped';
  const isPending = item.status === 'pending';
  const btnScale = useRef(new Animated.Value(1)).current;

  const handleTaken = useCallback(() => {
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.85, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(btnScale, { toValue: 1.15, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 0 }),
    ]).start();
    onMarkTaken(item.medicineId);
  }, [item.medicineId, onMarkTaken, btnScale]);

  return (
    <View style={[styles.medCard, isTaken && styles.medCardTaken]}>
      <View style={styles.medInfo}>
        <Text style={[styles.medName, isTaken && styles.medNameTaken]}>
          {item.medicineName}
        </Text>
        <Text style={styles.medDosage}>{item.dosage}</Text>
        {item.instructions ? (
          <Text style={styles.medInstructions}>{item.instructions}</Text>
        ) : null}
      </View>
      <View style={styles.medActions}>
        {isTaken ? (
          <View style={styles.takenBadge}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.takenText}>Taken</Text>
          </View>
        ) : isSkipped ? (
          <View style={styles.skippedBadge}>
            <Text style={styles.skippedText}>Skipped</Text>
          </View>
        ) : (
          <View style={styles.actionButtons}>
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <Pressable
                onPress={handleTaken}
                style={({ pressed }) => [styles.takeBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="checkmark" size={20} color={colors.background} />
              </Pressable>
            </Animated.View>
            <Pressable
              onPress={() => onMarkSkipped(item.medicineId)}
              style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function MedicineHistoryView({
  history,
  medicines,
  colors,
  styles,
}: {
  history: Array<{
    medicineId: Id<'medicines'>;
    date: string;
    scheduledTime: string;
    status: string;
    xpAwarded?: number;
  }> | undefined;
  medicines: Array<{ _id: Id<'medicines'>; name: string }> | undefined;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const grouped = useMemo(() => {
    if (!history) return null;
    const medicineLookup = new Map<string, string>();
    if (medicines) {
      for (const m of medicines) {
        medicineLookup.set(m._id, m.name);
      }
    }

    const byDate: Record<string, Array<{
      medicineName: string;
      time: string;
      status: string;
      xp: number;
    }>> = {};

    for (const item of history) {
      if (!byDate[item.date]) byDate[item.date] = [];
      byDate[item.date].push({
        medicineName: medicineLookup.get(item.medicineId) || 'Unknown',
        time: formatMedicineTime(item.scheduledTime),
        status: item.status,
        xp: item.xpAwarded ?? 0,
      });
    }

    return Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a));
  }, [history, medicines]);

  if (!grouped) {
    return (
      <View style={{ gap: Spacing.md }}>
        <Skeleton height={100} borderRadius={Radius.lg} />
        <Skeleton height={100} borderRadius={Radius.lg} />
        <Skeleton height={100} borderRadius={Radius.lg} />
      </View>
    );
  }

  if (grouped.length === 0) {
    return (
      <EmptyState
        icon="time-outline"
        title="No history yet"
        description="Your medicine history will appear here once you start tracking."
      />
    );
  }

  return (
    <View style={{ gap: Spacing.md }}>
      {grouped.map(([date, items]) => (
        <GradientCard key={date}>
          <Text style={styles.historyDateTitle}>
            {format(parseISO(date), 'EEEE, MMM d')}
          </Text>
          <View style={{ gap: Spacing.sm }}>
            {items.map((item, i) => (
              <View key={`${date}-${i}`} style={styles.historyRow}>
                <Ionicons
                  name={item.status === 'taken' ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={item.status === 'taken' ? colors.success : colors.danger}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyMedName}>{item.medicineName}</Text>
                  <Text style={styles.historyMedTime}>{item.time}</Text>
                </View>
                {item.xp > 0 ? (
                  <Text style={styles.historyXp}>+{item.xp} XP</Text>
                ) : null}
              </View>
            ))}
          </View>
        </GradientCard>
      ))}
    </View>
  );
}

function AddMedicineSheet({
  visible,
  onClose,
  onAdd,
  colors,
  styles,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, dosage: string, timeSlotLabel: string, timeSlotTime: string) => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOT_OPTIONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !dosage.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAdd(name, dosage, selectedSlot.value, selectedSlot.time);
      setName('');
      setDosage('');
      setSelectedSlot(TIME_SLOT_OPTIONS[0]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDosage('');
    setSelectedSlot(TIME_SLOT_OPTIONS[0]);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Add Medicine">
      <View style={styles.addForm}>
        <Input
          label="Medicine Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g., Metformin"
        />
        <Input
          label="Dosage"
          value={dosage}
          onChangeText={setDosage}
          placeholder="e.g., 500mg"
          containerStyle={{ marginTop: Spacing.md }}
        />

        {/* Time Slot Selector */}
        <Text style={styles.timeSlotLabelText}>Schedule</Text>
        <View style={styles.timeSlotRow}>
          {TIME_SLOT_OPTIONS.map((option) => {
            const isSelected = selectedSlot.value === option.value;
            const config = TIME_SLOT_CONFIG[option.value];
            return (
              <Pressable
                key={option.value}
                onPress={() => setSelectedSlot(option)}
                style={[
                  styles.timeSlotChip,
                  isSelected && { borderColor: config?.color ?? colors.primary, backgroundColor: `${config?.color ?? colors.primary}15` },
                ]}
              >
                {config && <Ionicons name={config.icon} size={14} color={isSelected ? config.color : colors.textMuted} />}
                <Text
                  style={[
                    styles.timeSlotChipText,
                    isSelected && { color: config?.color ?? colors.primary, fontFamily: FontFamily.semibold },
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={[styles.timeSlotChipTime, isSelected && { color: config?.color ?? colors.primary }]}>
                  {formatMedicineTime(option.time)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.addFormFooter}>
          <Button title="Cancel" variant="ghost" onPress={handleClose} />
          <Button
            title={isSubmitting ? 'Adding...' : 'Add Medicine'}
            onPress={handleSubmit}
            disabled={!name.trim() || !dosage.trim() || isSubmitting}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInText: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: Spacing['2xl'],
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontFamily: FontFamily.extrabold,
    color: colors.foreground,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow(colors.primaryGlow, 0.5),
  },

  // Concentric Rings Stats
  ringsSection: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  ringsCenterNumber: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.extrabold,
    color: colors.foreground,
    textAlign: 'center',
  },
  ringsLegend: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: colors.textSecondary,
  },

  // Tabs
  tabContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },

  // Time Slot Sections
  timelineContainer: {
    gap: Spacing.lg,
  },
  slotSection: {
    gap: Spacing.sm,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  slotDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  slotLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  slotTime: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    fontFamily: FontFamily.regular,
  },
  slotCards: {
    gap: Spacing.sm,
  },

  // Medicine Card
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  medCardTaken: {
    opacity: 0.6,
  },
  medInfo: {
    flex: 1,
    gap: 2,
  },
  medName: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
    color: colors.foreground,
  },
  medNameTaken: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  medDosage: {
    fontSize: FontSize.sm,
    color: colors.primary,
    fontFamily: FontFamily.medium,
  },
  medInstructions: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  medActions: {
    marginLeft: Spacing.md,
  },
  takenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  takenText: {
    fontSize: FontSize.xs,
    color: colors.success,
    fontFamily: FontFamily.semibold,
  },
  skippedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  skippedText: {
    fontSize: FontSize.xs,
    color: colors.danger,
    fontFamily: FontFamily.semibold,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  takeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // History
  historyDateTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: colors.foreground,
    marginBottom: Spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  historyMedName: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.foreground,
  },
  historyMedTime: {
    fontSize: FontSize.xs,
    color: colors.textSecondary,
  },
  historyXp: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: colors.primary,
  },

  // Add Medicine Sheet
  addForm: {
    paddingBottom: Spacing['2xl'],
  },
  addFormFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  timeSlotLabelText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.foreground,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  timeSlotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  timeSlotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  timeSlotChipText: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
  },
  timeSlotChipTime: {
    fontSize: FontSize.xs,
    color: colors.textDim,
  },
});
