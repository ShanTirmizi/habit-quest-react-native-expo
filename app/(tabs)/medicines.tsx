import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/contexts/auth-context';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { BadgePill } from '@/components/ui/BadgePill';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
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
  const [tab, setTab] = useState('today');
  const [showAddSheet, setShowAddSheet] = useState(false);

  const todayDate = getTodayDateString();

  // Convex queries
  const schedule = useQuery(
    api.medicines.getTodaySchedule,
    userId ? { userId, date: todayDate } : 'skip'
  );

  const medicineStats = useQuery(
    api.progress.getMedicineStats,
    userId ? { userId } : 'skip'
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
        Alert.alert('Error', 'Failed to mark medicine as taken. Please try again.');
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
        Alert.alert('Error', 'Failed to mark medicine as skipped. Please try again.');
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
        Alert.alert('Error', 'Failed to add medicine. Please try again.');
      }
    },
    [userId, addMedicineMutation]
  );

  if (!userId) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.centered]}>
        <Text style={styles.historyPlaceholder}>Please sign in to view your medicines.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Medicines</Text>
          <BadgePill
            label={`${medicineStreak} day streak`}
            color={Colors.accent}
            size="sm"
          />
        </View>
        <Pressable
          onPress={() => setShowAddSheet(true)}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Stats Banner */}
      <View style={styles.statsBanner}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.taken}</Text>
          <Text style={styles.statLabel}>Taken</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: Colors.accent }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: Colors.primary }]}>{stats.percentage}%</Text>
          <Text style={styles.statLabel}>Adherence</Text>
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
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading medicines...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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
              Object.entries(groupedSchedule).map(([slot, items]) => {
                const config = TIME_SLOT_CONFIG[slot] || { icon: 'medkit-outline' as keyof typeof Ionicons.glyphMap, label: slot, color: Colors.textSecondary };
                return (
                  <View key={slot} style={styles.timeSlot}>
                    <View style={styles.slotHeader}>
                      <Ionicons name={config.icon} size={18} color={config.color} />
                      <Text style={[styles.slotLabel, { color: config.color }]}>{config.label}</Text>
                      <Text style={styles.slotTime}>
                        {items[0] ? formatMedicineTime(items[0].scheduledTime) : ''}
                      </Text>
                    </View>
                    <View style={styles.medList}>
                      {items.map((item) => (
                        <MedicineCard
                          key={`${item.medicineId}_${item.scheduledTime}`}
                          item={item}
                          onMarkTaken={handleMarkTaken}
                          onMarkSkipped={handleMarkSkipped}
                        />
                      ))}
                    </View>
                  </View>
                );
              })
            )
          ) : (
            <GlassCard>
              <Text style={styles.historyPlaceholder}>
                Medicine history and adherence calendar coming soon. Total medicines taken: {medicineStats?.totalMedicinesTaken ?? 0}. Today's XP earned: {medicineStats?.todayMedicineXp ?? 0}.
              </Text>
            </GlassCard>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Add Medicine Sheet */}
      <AddMedicineSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAdd={handleAddMedicine}
      />
    </View>
  );
}

function MedicineCard({
  item,
  onMarkTaken,
  onMarkSkipped,
}: {
  item: TodayMedicineScheduleItem;
  onMarkTaken: (id: string) => void;
  onMarkSkipped: (id: string) => void;
}) {
  const isTaken = item.status === 'taken';
  const isSkipped = item.status === 'skipped';
  const isPending = item.status === 'pending';

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
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <Text style={styles.takenText}>Taken</Text>
          </View>
        ) : isSkipped ? (
          <View style={styles.skippedBadge}>
            <Text style={styles.skippedText}>Skipped</Text>
          </View>
        ) : (
          <View style={styles.actionButtons}>
            <Pressable
              onPress={() => onMarkTaken(item.medicineId)}
              style={({ pressed }) => [styles.takeBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="checkmark" size={20} color={Colors.background} />
            </Pressable>
            <Pressable
              onPress={() => onMarkSkipped(item.medicineId)}
              style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="close" size={16} color={Colors.textMuted} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function AddMedicineSheet({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, dosage: string, timeSlotLabel: string, timeSlotTime: string) => void;
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
        <Text style={styles.timeSlotLabel}>Schedule</Text>
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
                  isSelected && { borderColor: config?.color ?? Colors.primary, backgroundColor: `${config?.color ?? Colors.primary}15` },
                ]}
              >
                {config && <Ionicons name={config.icon} size={14} color={isSelected ? config.color : Colors.textMuted} />}
                <Text
                  style={[
                    styles.timeSlotChipText,
                    isSelected && { color: config?.color ?? Colors.primary, fontWeight: '600' },
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={[styles.timeSlotChipTime, isSelected && { color: config?.color ?? Colors.primary }]}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.foreground,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBanner: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.success,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  tabContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  timeSlot: {
    gap: Spacing.sm,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  slotIcon: {
    fontSize: 16,
  },
  slotLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  slotTime: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  medList: {
    gap: Spacing.sm,
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
  },
  medCardTaken: {
    opacity: 0.7,
  },
  medInfo: {
    flex: 1,
    gap: 2,
  },
  medName: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.foreground,
  },
  medNameTaken: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  medDosage: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  medInstructions: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
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
    color: Colors.success,
    fontWeight: '600',
  },
  skippedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  skippedText: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  takeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyPlaceholder: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: Spacing['2xl'],
  },
  addForm: {
    paddingBottom: Spacing['2xl'],
  },
  addFormNote: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
  addFormFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  timeSlotLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.foreground,
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
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.surface,
  },
  timeSlotChipText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  timeSlotChipTime: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
});
