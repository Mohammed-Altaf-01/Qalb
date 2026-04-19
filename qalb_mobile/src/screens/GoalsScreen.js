/**
 * GoalsScreen — Post-Ramadan reading goals.
 * Mirrors web app /goals page.js.
 * All goal data stored in AsyncStorage.
 */

import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import storage, { STORAGE_KEYS } from '../lib/storage';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../theme';

const GOAL_TEMPLATES = [
  { title: 'Daily Verse', target: 1, unit: 'verse/day', icon: '📖', color: COLORS.primary },
  { title: 'Weekly Surah', target: 1, unit: 'surah/week', icon: '📜', color: '#5b8fd4' },
  { title: 'Complete Quran', target: 114, unit: 'surahs', icon: '🏆', color: COLORS.accent },
  { title: 'Morning Dhikr', target: 5, unit: 'min/day', icon: '🌅', color: '#b07cc6' },
];

function GoalCard({ goal, onDelete, onToggleDay }) {
  const today = new Date().toDateString();
  const doneToday = goal.completedDates?.includes(today);
  const progress = Math.min((goal.completedDates?.length ?? 0) / (goal.targetDays ?? 30), 1);

  return (
    <View style={styles.goalCard}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalIcon}>{goal.icon ?? '◆'}</Text>
        <View style={styles.goalInfo}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.goalSubtitle}>
            {goal.completedDates?.length ?? 0} / {goal.targetDays ?? 30} days
          </Text>
        </View>
        <TouchableOpacity onPress={() => onDelete(goal.id)}>
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>

      <View style={styles.goalFooter}>
        <Text style={styles.progressPct}>{Math.round(progress * 100)}% complete</Text>
        <TouchableOpacity
          style={[styles.checkInBtn, doneToday && styles.checkInBtnDone]}
          onPress={() => onToggleDay(goal.id, today)}
        >
          <Text style={[styles.checkInText, doneToday && styles.checkInTextDone]}>
            {doneToday ? '✓ Done today' : 'Mark done'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function GoalsScreen() {
  const [goals, setGoals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customTarget, setCustomTarget] = useState('30');

  const loadGoals = useCallback(async () => {
    const g = (await storage.get(STORAGE_KEYS.GOALS)) ?? [];
    setGoals(g);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals]),
  );

  const saveGoals = async (newGoals) => {
    setGoals(newGoals);
    await storage.set(STORAGE_KEYS.GOALS, newGoals);
  };

  const addGoalFromTemplate = async (template) => {
    const newGoal = {
      id: Date.now().toString(),
      title: template.title,
      unit: template.unit,
      icon: template.icon,
      color: template.color,
      targetDays: 30,
      completedDates: [],
      createdAt: Date.now(),
    };
    await saveGoals([...goals, newGoal]);
  };

  const addCustomGoal = async () => {
    if (!customTitle.trim()) return;
    const newGoal = {
      id: Date.now().toString(),
      title: customTitle.trim(),
      icon: '◆',
      color: COLORS.primary,
      targetDays: parseInt(customTarget, 10) || 30,
      completedDates: [],
      createdAt: Date.now(),
    };
    await saveGoals([...goals, newGoal]);
    setCustomTitle('');
    setCustomTarget('30');
    setShowModal(false);
  };

  const deleteGoal = (id) => {
    Alert.alert('Delete Goal', 'Delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => saveGoals(goals.filter((g) => g.id !== id)),
      },
    ]);
  };

  const toggleDay = async (id, date) => {
    const updated = goals.map((g) => {
      if (g.id !== id) return g;
      const dates = g.completedDates ?? [];
      const alreadyDone = dates.includes(date);
      return {
        ...g,
        completedDates: alreadyDone ? dates.filter((d) => d !== date) : [...dates, date],
      };
    });
    await saveGoals(updated);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Goals</Text>
          <Text style={styles.subtitle}>Build your Quran habit</Text>
        </View>

        {/* Active goals */}
        {goals.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Your Goals</Text>
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onDelete={deleteGoal}
                onToggleDay={toggleDay}
              />
            ))}
          </>
        )}

        {/* Goal templates */}
        <Text style={styles.sectionLabel}>
          {goals.length === 0 ? 'Start with a goal' : 'Add another'}
        </Text>
        <View style={styles.templatesGrid}>
          {GOAL_TEMPLATES.map((t) => (
            <TouchableOpacity
              key={t.title}
              style={[styles.templateCard, { borderColor: `${t.color}40` }]}
              onPress={() => addGoalFromTemplate(t)}
              activeOpacity={0.8}
            >
              <Text style={styles.templateIcon}>{t.icon}</Text>
              <Text style={styles.templateTitle}>{t.title}</Text>
              <Text style={styles.templateUnit}>{t.unit}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.customBtn}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.customBtnText}>+ Custom Goal</Text>
        </TouchableOpacity>

        {goals.length === 0 && (
          <View style={styles.motivationCard}>
            <Text style={styles.motivationArabic}>وَمَن يَتَّقِ اللَّهَ</Text>
            <Text style={styles.motivationTranslation}>
              "And whoever has taqwa of Allah, He will make for him a way out." — 65:2
            </Text>
          </View>
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>

      {/* Custom goal modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Custom Goal</Text>
            <TextInput
              style={styles.modalInput}
              value={customTitle}
              onChangeText={setCustomTitle}
              placeholder="Goal name…"
              placeholderTextColor={COLORS.textFaint}
              maxLength={60}
            />
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Target days</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputSmall]}
                value={customTarget}
                onChangeText={setCustomTarget}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, !customTitle.trim() && styles.modalConfirmDisabled]}
                onPress={addCustomGoal}
                disabled={!customTitle.trim()}
              >
                <Text style={styles.modalConfirmText}>Add Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.md },

  header: { marginBottom: SPACING.lg },
  title: { color: COLORS.text, fontSize: FONT_SIZE.xxl + 4, fontWeight: '800', letterSpacing: 1 },
  subtitle: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: 4 },

  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },

  goalCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  goalIcon: { fontSize: 24 },
  goalInfo: { flex: 1 },
  goalTitle: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '700' },
  goalSubtitle: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs, marginTop: 2 },
  deleteIcon: { color: COLORS.textFaint, fontSize: 14, padding: 4 },

  progressTrack: {
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.muted,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressFill: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full },

  goalFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressPct: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs },
  checkInBtn: {
    backgroundColor: COLORS.primaryDim,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  checkInBtnDone: { backgroundColor: COLORS.accentDim, borderColor: `${COLORS.accent}40` },
  checkInText: { color: COLORS.primary, fontSize: FONT_SIZE.xs, fontWeight: '600' },
  checkInTextDone: { color: COLORS.accent },

  templatesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  templateCard: {
    width: '47%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  templateIcon: { fontSize: 22 },
  templateTitle: { color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  templateUnit: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs },

  customBtn: {
    marginTop: SPACING.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: `${COLORS.primary}50`,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
    backgroundColor: COLORS.primaryDim,
  },
  customBtnText: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: '600' },

  motivationCard: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: `${COLORS.accent}30`,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  motivationArabic: {
    fontSize: 22,
    color: COLORS.accent,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 38,
  },
  motivationTranslation: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  modalInput: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    backgroundColor: COLORS.muted,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalInputSmall: { width: 80, textAlign: 'center' },
  modalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, paddingTop: SPACING.sm },
  modalCancel: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  modalConfirm: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  modalConfirmDisabled: { opacity: 0.45 },
  modalConfirmText: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: '700' },
});
