import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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

// Demo schedule data
const DEMO_SCHEDULE: TodayMedicineScheduleItem[] = [
  {
    medicineId: '1',
    medicineName: 'Metformin',
    dosage: '500mg',
    instructions: 'Take with food',
    scheduledTime: '08:00',
    label: 'morning',
    status: 'taken',
    takenAt: '2024-02-06T08:15:00Z',
  },
  {
    medicineId: '2',
    medicineName: 'Vitamin D3',
    dosage: '2000 IU',
    scheduledTime: '08:00',
    label: 'morning',
    status: 'taken',
    takenAt: '2024-02-06T08:15:00Z',
  },
  {
    medicineId: '3',
    medicineName: 'Omega-3',
    dosage: '1000mg',
    scheduledTime: '12:00',
    label: 'afternoon',
    status: 'pending',
  },
  {
    medicineId: '4',
    medicineName: 'Magnesium',
    dosage: '400mg',
    instructions: 'Take before bed',
    scheduledTime: '21:00',
    label: 'night',
    status: 'pending',
  },
];

const TIME_SLOT_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  morning: { icon: '☀️', label: 'Morning', color: '#F59E0B' },
  afternoon: { icon: '🌤️', label: 'Afternoon', color: '#F97316' },
  evening: { icon: '🌆', label: 'Evening', color: '#8B5CF6' },
  night: { icon: '🌙', label: 'Night', color: '#6366F1' },
};

export default function MedicinesScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('today');
  const [schedule, setSchedule] = useState(DEMO_SCHEDULE);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [medicineStreak, setMedicineStreak] = useState(5);

  const groupedSchedule = useMemo(() => {
    const groups: Record<string, TodayMedicineScheduleItem[]> = {};
    for (const item of schedule) {
      const slot = item.label || 'other';
      if (!groups[slot]) groups[slot] = [];
      groups[slot].push(item);
    }
    return groups;
  }, [schedule]);

  const stats = useMemo(() => {
    const total = schedule.length;
    const taken = schedule.filter((s) => s.status === 'taken').length;
    const pending = schedule.filter((s) => s.status === 'pending').length;
    return { total, taken, pending, percentage: total > 0 ? Math.round((taken / total) * 100) : 0 };
  }, [schedule]);

  const handleMarkTaken = useCallback((medicineId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSchedule((prev) =>
      prev.map((item) =>
        item.medicineId === medicineId
          ? { ...item, status: 'taken' as MedicineCompletionStatus, takenAt: new Date().toISOString() }
          : item
      )
    );
  }, []);

  const handleMarkSkipped = useCallback((medicineId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSchedule((prev) =>
      prev.map((item) =>
        item.medicineId === medicineId
          ? { ...item, status: 'skipped' as MedicineCompletionStatus }
          : item
      )
    );
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Medicines</Text>
          <BadgePill
            label={`🔥 ${medicineStreak} day streak`}
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'today' ? (
          schedule.length === 0 ? (
            <EmptyState
              icon="medical-outline"
              title="No medicines scheduled"
              description="Add your medications to track adherence and earn XP for staying on schedule."
              actionLabel="Add Medicine"
              onAction={() => setShowAddSheet(true)}
            />
          ) : (
            Object.entries(groupedSchedule).map(([slot, items]) => {
              const config = TIME_SLOT_CONFIG[slot] || { icon: '💊', label: slot, color: Colors.textSecondary };
              return (
                <View key={slot} style={styles.timeSlot}>
                  <View style={styles.slotHeader}>
                    <Text style={styles.slotIcon}>{config.icon}</Text>
                    <Text style={[styles.slotLabel, { color: config.color }]}>{config.label}</Text>
                    <Text style={styles.slotTime}>
                      {items[0] ? formatMedicineTime(items[0].scheduledTime) : ''}
                    </Text>
                  </View>
                  <View style={styles.medList}>
                    {items.map((item) => (
                      <MedicineCard
                        key={item.medicineId}
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
              Medicine history and adherence calendar will be available once connected to the backend.
            </Text>
          </GlassCard>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Medicine Sheet */}
      <AddMedicineSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
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

function AddMedicineSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Add Medicine">
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
        <Text style={styles.addFormNote}>
          Full medicine configuration (schedule, reminders, groups) will be available once connected to the backend.
        </Text>
        <View style={styles.addFormFooter}>
          <Button title="Cancel" variant="ghost" onPress={onClose} />
          <Button
            title="Add Medicine"
            onPress={() => {
              onClose();
              setName('');
              setDosage('');
            }}
            disabled={!name.trim() || !dosage.trim()}
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
});
