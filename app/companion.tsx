import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { FontSize, Spacing, Radius, FontFamily, Shadows, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { ChatMarkdown } from '@/components/ui/ChatMarkdown';
import { useVoiceModeController } from '@/components/voice/VoiceModeOverlay';
import { TextInput } from 'react-native';

const SPECIES_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  treant: 'leaf',
  phoenix: 'flame',
  owl: 'moon',
  keeper: 'flower',
};

function getSpeciesColor(colors: ThemeColors): Record<string, string> {
  return {
    treant: colors.categoryHealth,
    phoenix: colors.accent,
    owl: colors.categoryMind,
    keeper: colors.categoryLife,
  };
}

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊',
  content: '😌',
  sleepy: '😴',
  worried: '😟',
};

const SAGE_RESPONSE_KEYS = Array.from({ length: 10 }, (_, i) => `sageResponse.${i}`);

const TOOL_BADGE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; labelKey: string; color: string }> = {
  create_habits: { icon: 'checkmark-circle', labelKey: 'toolBadge.habit', color: '#4CAF50' },
  create_medicines: { icon: 'medkit', labelKey: 'toolBadge.medication', color: '#2196F3' },
  create_quests: { icon: 'flag', labelKey: 'toolBadge.quest', color: '#FF9800' },
  toggle_holiday_mode: { icon: 'airplane', labelKey: 'toolBadge.holiday', color: '#9C27B0' },
};

interface ToolCallInfo {
  tool: string;
  items: string[];
}

interface ChatMessage {
  _id?: string;
  role: 'user' | 'assistant';
  content: string;
  _creationTime?: number;
  toolCalls?: ToolCallInfo[];
}

/** Animated wrapper that fades-in + slides-up each chat bubble on mount.
 *  When skipAnimation is true, renders instantly (used for the initial batch
 *  of messages to avoid triggering layout changes that cause visible scroll). */
function ChatBubble({ children, skipAnimation }: { children: React.ReactNode; skipAnimation?: boolean }) {
  const progress = useSharedValue(skipAnimation ? 1 : 0);
  useEffect(() => {
    if (!skipAnimation) {
      progress.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    }
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [8, 0]) }],
  }));
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

type TabType = 'info' | 'chat';

export default function CompanionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const speciesColorMap = useMemo(() => getSpeciesColor(colors), [colors]);
  const { showToast } = useToast();
  const { t } = useTranslation('companion');

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const tabProgress = useSharedValue(1); // 0 = info, 1 = chat
  const [switcherWidth, setSwitcherWidth] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [holdToSpeakTooltip, setHoldToSpeakTooltip] = useState(false);
  const micPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const chatListRef = useRef<ScrollView>(null);
  const prevMessageCountRef = useRef(0);
  const chatReadyRef = useRef(false);
  const initialRenderRef = useRef(true);

  // Queries
  const companion = useQuery(api.companions.getCompanion, userId ? { userId } : 'skip');
  const unclaimedGifts = useQuery(api.companions.getUnclaimedGiftsCount, userId ? { userId } : 'skip');
  const sessionMessages = useQuery(
    api.chat.getSessionMessages,
    userId && activeSessionId ? { userId, sessionId: activeSessionId } : 'skip'
  );
  const chatSessions = useQuery(api.chat.getSessions, userId ? { userId } : 'skip');
  const progress = useQuery(api.progress.getProgress, userId ? { userId } : 'skip');

  const completionRate = 0; // Not critical for companion mood update; simplified
  const currentHp = progress?.currentHp ?? 100;
  const maxHp = progress?.maxHp ?? 100;

  // Mutations & Actions
  const getOrCreateMutation = useMutation(api.companions.getOrCreateCompanion);
  const updateMoodMutation = useMutation(api.companions.updateMood);
  const updateNameMutation = useMutation(api.companions.updateName);
  const claimGiftMutation = useMutation(api.companions.claimGift);
  const saveMessageMutation = useMutation(api.chat.saveMessage);
  const sendMessageAction = useAction(api.chatAction.sendMessage);
  const getOrCreateSessionMutation = useMutation(api.chat.getOrCreateSession);
  const createSessionMutation = useMutation(api.chat.createSession);
  const deleteSessionMutation = useMutation(api.chat.deleteSession);
  const ttsSynthesize = useAction(api.tts.synthesize);

  // Auto-create or resume session on mount
  useEffect(() => {
    if (!userId) return;
    getOrCreateSessionMutation({ userId }).then((sid) => {
      setActiveSessionId(sid);
    });
  }, [userId]);

  const handleNewChat = useCallback(async () => {
    if (!userId) return;
    // Don't create a new session if the current one has no messages
    if (sessionMessages !== undefined && sessionMessages.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const sid = await createSessionMutation({ userId });
    setActiveSessionId(sid);
    setLocalMessages([]);
    chatReadyRef.current = false;
    prevMessageCountRef.current = 0;
    initialRenderRef.current = true;
    setShowHistory(false);
  }, [userId, createSessionMutation, sessionMessages]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete conversation',
      'This will permanently delete this conversation and all its messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSessionMutation({ userId, sessionId });
            // If we deleted the active session, create a new one
            if (sessionId === activeSessionId) {
              const sid = await createSessionMutation({ userId });
              setActiveSessionId(sid);
              setLocalMessages([]);
            }
          },
        },
      ]
    );
  }, [userId, deleteSessionMutation, createSessionMutation, activeSessionId]);

  const handleSelectSession = useCallback((sessionId: string) => {
    Haptics.selectionAsync();
    setActiveSessionId(sessionId);
    setLocalMessages([]);
    chatReadyRef.current = false;
    prevMessageCountRef.current = 0;
    initialRenderRef.current = true;
    setShowHistory(false);
  }, []);

  // Cloud TTS
  const cloudTTS = useCallback(async (text: string): Promise<string | null> => {
    try {
      return await ttsSynthesize({ text, voice: 'nova' });
    } catch (err) {
      console.warn('[CompanionScreen] Cloud TTS error:', err);
      return null;
    }
  }, [ttsSynthesize]);

  // Voice mode controller
  const voiceController = useVoiceModeController({
    active: true,
    onDeactivate: () => {},
    userId: userId as Id<'users'>,
    sessionId: activeSessionId!,
    sendMessage: sendMessageAction,
    onMessageSent: (userMsg, aiMsg) => {
      setLocalMessages((prev) => [...prev, userMsg, aiMsg]);
    },
    generateFallback: (msg: string) => {
      const lower = msg.toLowerCase();
      if (lower.includes('help') || lower.includes('struggle')) return t('voiceFallback.helpStruggle');
      if (lower.includes('happy') || lower.includes('great')) return t('voiceFallback.happyGreat');
      if (lower.includes('tired') || lower.includes('exhausted')) return t('voiceFallback.tiredExhausted');
      return t('voiceFallback.default');
    },
    cloudTTS,
  });

  // Breathing pulse for gift indicator
  const giftScale = useSharedValue(1);
  const giftOpacity = useSharedValue(1);
  useEffect(() => {
    if (unclaimedGifts && unclaimedGifts > 0) {
      giftScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
      giftOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
    }
  }, [unclaimedGifts]);

  const giftAnimStyle = useAnimatedStyle(() => ({
    opacity: giftOpacity.value,
    transform: [{ scale: giftScale.value }],
  }));

  // Auto-update mood when screen mounts
  useEffect(() => {
    if (companion && userId) {
      const hpCritical = maxHp > 0 ? (currentHp / maxHp) <= 0.2 : false;
      updateMoodMutation({ userId, completionRate, hpCritical }).catch(() => {});
    }
  }, [companion?._id, completionRate, currentHp]);

  // NOTE: We intentionally do NOT clear localMessages when recentMessages
  // updates. The dedup logic in allMessages handles filtering out local
  // messages that have been persisted to the backend. Clearing localMessages
  // eagerly caused a full-screen flicker: messages would temporarily vanish
  // (array shrinks) then reappear (backend catches up), triggering
  // unmount/remount of all ChatBubble components.

  const contentOpacity = useSharedValue(1);

  // Called from the UI thread after fade-out completes. Swaps the tab on the
  // JS thread and waits for React to render the new content before fading in.
  // This prevents the "pop" that happens when the fade-in starts before the
  // new content has rendered.
  const applyTabSwitch = useCallback((tab: TabType) => {
    setActiveTab(tab);
    requestAnimationFrame(() => {
      contentOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
    });
  }, []);

  const switchTab = useCallback((tab: TabType) => {
    if (tab === activeTab) return;
    Haptics.selectionAsync();
    chatReadyRef.current = false;
    prevMessageCountRef.current = 0;
    tabProgress.value = withTiming(tab === 'chat' ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    contentOpacity.value = withTiming(0, { duration: 120 }, () => {
      runOnJS(applyTabSwitch)(tab);
    });
  }, [activeTab, applyTabSwitch]);

  // Pill indicator
  const pillHalf = switcherWidth > 0 ? (switcherWidth - 6) / 2 : 0;
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabProgress.value * (pillHalf + 2) }],
    width: pillHalf,
  }));

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // Scroll messages to bottom when keyboard appears
  useEffect(() => {
    const event = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(event, () => {
      if (activeTab === 'chat') {
        setTimeout(() => {
          chatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });
    return () => sub.remove();
  }, [activeTab]);

  // Stop voice on unmount
  useEffect(() => {
    return () => {
      voiceController.stop();
    };
  }, []);

  const handleBack = () => {
    voiceController.stop();
    router.back();
  };

  const handleChooseCompanion = useCallback(async () => {
    if (!userId) return;
    try {
      await getOrCreateMutation({ userId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('toast.companionJoined'), undefined, 'xp');
    } catch {
      showToast(t('toast.failedSummon'), undefined, 'error');
    }
  }, [userId, getOrCreateMutation, showToast]);

  const handleSaveName = useCallback(async () => {
    if (!newName.trim() || !userId) return;
    try {
      await updateNameMutation({ userId, name: newName.trim() });
      setEditingName(false);
      showToast(t('toast.companionRenamed'), undefined, 'xp');
    } catch {
      showToast(t('toast.failedRename'), undefined, 'error');
    }
  }, [userId, newName, updateNameMutation, showToast]);

  const handleClaimGift = useCallback(async (giftId: string) => {
    if (!userId) return;
    try {
      const result = await claimGiftMutation({ userId, giftId });
      if (result.claimed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(t('toast.giftClaimed', { giftType: result.giftType }), undefined, 'xp');
      }
    } catch {
      showToast(t('toast.failedClaimGift'), undefined, 'error');
    }
  }, [userId, claimGiftMutation, showToast]);

  const sageResponses = useMemo(() => SAGE_RESPONSE_KEYS.map((key) => t(key)), [t]);

  const generateSageResponse = useCallback((userMessage: string): string => {
    const lower = userMessage.toLowerCase();
    if (lower.includes('help') || lower.includes('struggle') || lower.includes('hard')) {
      return t('fallback.helpStruggle');
    }
    if (lower.includes('happy') || lower.includes('great') || lower.includes('awesome') || lower.includes('good')) {
      return t('fallback.happyGreat');
    }
    if (lower.includes('tired') || lower.includes('exhausted') || lower.includes('burned') || lower.includes('burnout')) {
      return t('fallback.tiredExhausted');
    }
    if (lower.includes('habit') || lower.includes('routine') || lower.includes('streak')) {
      return t('fallback.habitRoutine');
    }
    if (lower.includes('motivation') || lower.includes('motivate') || lower.includes('inspire')) {
      return t('fallback.motivation');
    }
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return t('fallback.hello');
    }
    return sageResponses[Math.floor(Math.random() * sageResponses.length)];
  }, [t, sageResponses]);

  const handleSendMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || isSending || !userId || !activeSessionId) return;

    setChatInput('');
    setIsSending(true);

    const userMsg: ChatMessage = { _id: `local-${Date.now()}-user`, role: 'user', content: text };
    setLocalMessages((prev) => [...prev, userMsg]);

    try {
      const reply = await sendMessageAction({
        userId,
        userMessage: text,
        sessionId: activeSessionId!,
      });

      const sageMsg: ChatMessage = { _id: `local-${Date.now()}-assistant`, role: 'assistant', content: reply };
      setLocalMessages((prev) => [...prev, sageMsg]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      const sageReply = generateSageResponse(text);
      const sageMsg: ChatMessage = { _id: `local-${Date.now()}-fallback`, role: 'assistant', content: sageReply };
      setLocalMessages((prev) => [...prev, sageMsg]);
      try {
        await saveMessageMutation({ userId, role: 'user', content: text, sessionId: activeSessionId! });
        await saveMessageMutation({ userId, role: 'assistant', content: sageReply, sessionId: activeSessionId! });
      } catch {}
    } finally {
      setIsSending(false);
    }
  }, [chatInput, isSending, userId, activeSessionId, sendMessageAction, saveMessageMutation, generateSageResponse]);

  // Merge backend messages with local (optimistic) ones.
  // Deduplicate: if a local message's content already appears in the last N
  // backend messages, skip it (it's been persisted and would show twice).
  const allMessages: ChatMessage[] = useMemo(() => {
    const backend = sessionMessages ?? [];
    if (localMessages.length === 0) return backend;

    // Build a set of recent backend message contents for fast lookup
    const recentBackendContents = new Set(
      backend.slice(-localMessages.length * 2).map((m) => `${m.role}:${m.content}`)
    );

    const uniqueLocal = localMessages.filter(
      (m) => !recentBackendContents.has(`${m.role}:${m.content}`)
    );

    return [...backend, ...uniqueLocal];
  }, [sessionMessages, localMessages]);

  // Scroll to bottom when isSending changes (shows/hides thinking indicator)
  useEffect(() => {
    if (isSending && chatReadyRef.current) {
      setTimeout(() => {
        chatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isSending]);

  // Loading state
  if (!userId || companion === undefined) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('headerTitle')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // No companion yet — show summon CTA
  if (companion === null) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('headerTitle')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.ctaContent}>
          <View style={styles.ctaIconCircle}>
            <Ionicons name="paw" size={40} color={colors.primary} />
          </View>
          <Text style={styles.ctaTitle}>{t('cta.title')}</Text>
          <Text style={styles.ctaSubtitle}>
            {t('cta.subtitle')}
          </Text>
          <Button
            title={t('cta.summonButton')}
            onPress={handleChooseCompanion}
            fullWidth
            size="lg"
          />
        </View>
      </View>
    );
  }

  const speciesIcon = SPECIES_ICON[companion.species] || 'paw';
  const speciesColor = speciesColorMap[companion.species] || colors.primary;
  const moodEmoji = MOOD_EMOJI[companion.mood] || '😊';

  // ---- Tab Switcher ----
  const renderTabSwitcher = () => (
    <View
      style={styles.tabSwitcher}
      onLayout={(e) => setSwitcherWidth(e.nativeEvent.layout.width)}
    >
      {pillHalf > 0 && (
        <Animated.View style={[styles.tabIndicator, indicatorStyle]} />
      )}
      <Pressable onPress={() => switchTab('info')} style={styles.tabPill}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={activeTab === 'info' ? '#fff' : colors.textSecondary}
        />
        <Text style={[styles.tabPillText, activeTab === 'info' && styles.tabPillTextActive]}>
          {t('tab.info')}
        </Text>
      </Pressable>
      <Pressable onPress={() => switchTab('chat')} style={styles.tabPill}>
        <Ionicons
          name="chatbubble-outline"
          size={16}
          color={activeTab === 'chat' ? '#fff' : colors.textSecondary}
        />
        <Text style={[styles.tabPillText, activeTab === 'chat' && styles.tabPillTextActive]}>
          {t('tab.chat')}
        </Text>
      </Pressable>
    </View>
  );

  // ---- Info Tab Content ----
  const renderInfoTab = () => (
    <ScrollView style={styles.infoScrollView} contentContainerStyle={styles.detailContent}>
      <View style={[styles.detailIcon, { borderColor: speciesColor, ...Shadows.glow(speciesColor, 0.3) }]}>
        <Ionicons name={speciesIcon} size={40} color={speciesColor} />
      </View>

      <View style={styles.detailStats}>
        <View style={styles.detailStat}>
          <Text style={styles.detailStatValue}>{companion.evolutionStage}</Text>
          <Text style={styles.detailStatLabel}>{t('info.stage')}</Text>
        </View>
        <View style={styles.detailStat}>
          <Text style={styles.detailStatValue}>{companion.totalXp}</Text>
          <Text style={styles.detailStatLabel}>{t('info.xp')}</Text>
        </View>
        <View style={styles.detailStat}>
          <Text style={styles.detailStatValue}>{moodEmoji}</Text>
          <Text style={styles.detailStatLabel}>{companion.mood}</Text>
        </View>
      </View>

      <Text style={styles.speciesLabel}>
        {t('info.speciesLabel', { stage: companion.evolutionStage, species: companion.species.charAt(0).toUpperCase() + companion.species.slice(1) })}
      </Text>

      {/* Unclaimed Gifts Banner */}
      {unclaimedGifts && unclaimedGifts > 0 ? (
        <Animated.View style={giftAnimStyle}>
          <View style={styles.giftBanner}>
            <Ionicons name="gift" size={18} color={colors.accent} />
            <Text style={styles.giftBannerText}>
              {t('info.unclaimedGifts', { count: unclaimedGifts })}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {/* Name editing */}
      {editingName ? (
        <View style={styles.nameEditRow}>
          <TextInput
            style={styles.nameInput}
            value={newName}
            onChangeText={setNewName}
            placeholder={t('info.namePlaceholder')}
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
          <Button title={t('info.save')} size="sm" onPress={handleSaveName} disabled={!newName.trim()} />
        </View>
      ) : (
        <Pressable onPress={() => { setNewName(companion.name); setEditingName(true); }}>
          <Text style={styles.editNameLink}>{t('info.renameCompanion')}</Text>
        </Pressable>
      )}

      {/* Gifts */}
      {companion.gifts && companion.gifts.length > 0 ? (
        <View style={styles.giftSection}>
          <Text style={styles.giftSectionTitle}>{t('info.unclaimedGiftsTitle')}</Text>
          {companion.gifts.filter((g: { claimed: boolean }) => !g.claimed).map((gift: { id: string; type: string; claimed: boolean }) => (
            <Pressable
              key={gift.id}
              onPress={() => handleClaimGift(gift.id)}
              style={({ pressed }) => [styles.giftItem, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
            >
              <Ionicons name="gift" size={16} color={colors.accent} />
              <Text style={styles.giftLabel}>{gift.type.replace('_', ' ')}</Text>
              <Text style={styles.giftClaim}>{t('info.claim')}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );

  // ---- Chat Message Bubble ----
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const hasToolCalls = !isUser && item.toolCalls && item.toolCalls.length > 0;
    return (
      <View>
        <View style={[styles.messageBubbleRow, isUser ? styles.messageBubbleRowUser : styles.messageBubbleRowAssistant]}>
          {!isUser && (
            <View style={[styles.chatAvatar, { borderColor: speciesColor }]}>
              <Ionicons name={speciesIcon} size={14} color={speciesColor} />
            </View>
          )}
          <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleAssistant]}>
            {isUser ? (
              <Text style={[styles.messageText, styles.messageTextUser]}>
                {item.content}
              </Text>
            ) : (
              <ChatMarkdown style={[styles.messageText, styles.messageTextAssistant]}>
                {item.content}
              </ChatMarkdown>
            )}
          </View>
        </View>
        {hasToolCalls && (
          <View style={styles.toolBadgeContainer}>
            {item.toolCalls!.map((tc, idx) => {
              const config = TOOL_BADGE_CONFIG[tc.tool];
              if (!config) return null;
              return tc.items.map((itemName, i) => (
                <View key={`${idx}-${i}`} style={[styles.toolBadge, { backgroundColor: `${config.color}15`, borderColor: `${config.color}30` }]}>
                  <Ionicons name={config.icon} size={12} color={config.color} />
                  <Text style={[styles.toolBadgeText, { color: config.color }]}>
                    {tc.tool === 'toggle_holiday_mode' ? itemName : t('toolBadge.added', { label: t(config.labelKey), item: itemName })}
                  </Text>
                </View>
              ));
            })}
          </View>
        )}
      </View>
    );
  };

  // ---- Chat Tab Content ----
  const renderChatTab = () => (
    <View style={styles.chatContainer}>
      <ScrollView
        ref={chatListRef}
        style={styles.chatMessageList}
        contentContainerStyle={styles.chatMessageListContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          const msgCount = allMessages.length;
          if (!chatReadyRef.current) {
            // First render — jump to bottom instantly
            chatListRef.current?.scrollToEnd({ animated: false });
            chatReadyRef.current = true;
            prevMessageCountRef.current = msgCount;
            initialRenderRef.current = false;
          } else if (msgCount !== prevMessageCountRef.current) {
            // Message count changed — scroll after layout settles
            prevMessageCountRef.current = msgCount;
            setTimeout(() => {
              chatListRef.current?.scrollToEnd({ animated: true });
            }, 80);
          }
        }}
      >
        {sessionMessages === undefined ? (
          <View style={styles.chatLoadingState}>
            <ActivityIndicator size="small" color={colors.textMuted} />
            <Text style={styles.chatLoadingText}>Loading conversation...</Text>
          </View>
        ) : allMessages.length === 0 ? (
          <View style={styles.chatEmptyState}>
            <View style={[styles.chatEmptyAvatar, { borderColor: speciesColor }]}>
              <Ionicons name={speciesIcon} size={28} color={speciesColor} />
            </View>
            <Text style={styles.chatEmptyTitle}>{t('chat.emptyTitle', { name: companion.name })}</Text>
            <Text style={styles.chatEmptySubtitle}>
              {t('chat.emptySubtitle')}
            </Text>
          </View>
        ) : (
          allMessages.map((msg) => (
            // Backend messages use their real _id. Local optimistic messages
            // use a generated client ID (local-{timestamp}-{role}).
            // Dedup ensures only one version is shown at a time.
            // Unlike index-based keys, _id keys are stable even when the
            // oldest message drops off a paginated query (indices would shift).
            <ChatBubble key={msg._id ?? msg.content.slice(0, 20)} skipAnimation={initialRenderRef.current}>
              {renderMessage({ item: msg })}
            </ChatBubble>
          ))
        )}
        {isSending && (
          <View style={styles.thinkingRow}>
            <View style={[styles.chatAvatar, { borderColor: speciesColor }]}>
              <Ionicons name={speciesIcon} size={14} color={speciesColor} />
            </View>
            <View style={styles.thinkingBubble}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
              <Text style={styles.thinkingText}>{t('chat.thinking', { name: companion.name })}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Voice status indicator */}
      {(voiceController.voiceState === 'listening' || voiceController.voiceState === 'thinking' || voiceController.voiceState === 'speaking') && (
        <View style={styles.voiceStatusRow}>
          <View style={[styles.voiceStatusDot, {
            backgroundColor: voiceController.voiceState === 'listening' ? colors.primary :
              voiceController.voiceState === 'thinking' ? colors.accent : '#00D4AA',
          }]} />
          <Text style={styles.voiceStatusText} numberOfLines={1}>
            {voiceController.partialTranscript ||
              (voiceController.voiceState === 'listening' ? t('voice.listening') :
               voiceController.voiceState === 'thinking' ? t('voice.thinking', { name: companion.name }) :
               t('voice.speaking', { name: companion.name }))}
          </Text>
        </View>
      )}

      {/* Hold-to-speak tooltip */}
      {holdToSpeakTooltip && (
        <View style={styles.holdTooltip}>
          <Text style={styles.holdTooltipText}>{t('chat.holdToSpeak')}</Text>
        </View>
      )}

      {/* Input bar */}
      <View style={[styles.chatInputBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <TextInput
          style={styles.chatTextInput}
          value={chatInput}
          onChangeText={setChatInput}
          placeholder={t('chat.inputPlaceholder', { name: companion.name })}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={5000}
          returnKeyType="default"
          blurOnSubmit={false}
        />
        {chatInput.trim() ? (
          <Pressable
            onPress={handleSendMessage}
            disabled={isSending}
            style={({ pressed }) => [
              styles.sendButton,
              isSending && styles.sendButtonDisabled,
              pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Ionicons
              name="send"
              size={18}
              color={isSending ? colors.textMuted : '#fff'}
            />
          </Pressable>
        ) : (
          <Pressable
            onPressIn={() => {
              micPressTimerRef.current = setTimeout(() => {
                micPressTimerRef.current = null;
              }, 250);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              voiceController.holdMic();
            }}
            onPressOut={() => {
              if (micPressTimerRef.current) {
                clearTimeout(micPressTimerRef.current);
                micPressTimerRef.current = null;
                voiceController.releaseMic();
                setHoldToSpeakTooltip(true);
                setTimeout(() => setHoldToSpeakTooltip(false), 2000);
              } else {
                voiceController.releaseMic();
              }
            }}
            style={({ pressed }) => [
              styles.micButton,
              voiceController.voiceState === 'listening' && styles.micButtonActive,
              pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] },
            ]}
          >
            <Ionicons
              name={voiceController.voiceState === 'listening' ? 'radio' : 'mic'}
              size={20}
              color="#fff"
            />
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={showHistory ? () => setShowHistory(false) : handleBack}
          style={styles.backButton}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {showHistory ? 'Chat History' : companion.name}
        </Text>
        {showHistory ? (
          <Pressable onPress={handleNewChat} style={styles.backButton} hitSlop={12}>
            <Ionicons name="add" size={22} color={colors.foreground} />
          </Pressable>
        ) : (
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowHistory(true); }}
              style={styles.headerIconBtn}
              hitSlop={8}
            >
              <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={handleNewChat}
              style={styles.headerIconBtn}
              hitSlop={8}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}
      </View>

      {showHistory ? (
        /* ── Chat History Screen ── */
        <View style={styles.historyScreen}>
          <ScrollView
            contentContainerStyle={styles.historyContent}
            showsVerticalScrollIndicator={false}
          >
            {(chatSessions ?? []).map((session) => {
              const isActive = session.sessionId === activeSessionId;
              return (
                <Pressable
                  key={session.sessionId}
                  onPress={() => handleSelectSession(session.sessionId)}
                  style={({ pressed }) => [
                    styles.historyItem,
                    isActive && styles.historyItemActive,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <View style={styles.historyItemLeft}>
                    <Ionicons
                      name="chatbubble-outline"
                      size={16}
                      color={isActive ? colors.primary : colors.textMuted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.historyItemTitle, isActive && { color: colors.primary }]}
                        numberOfLines={1}
                      >
                        {session.title || 'New conversation'}
                      </Text>
                      <Text style={styles.historyItemDate}>
                        {new Date(session.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {isActive && (
                      <View style={styles.historyActiveBadge}>
                        <Text style={styles.historyActiveBadgeText}>Active</Text>
                      </View>
                    )}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.sessionId);
                      }}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.historyDeleteBtn,
                        pressed && { opacity: 0.5 },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
            {(!chatSessions || chatSessions.length === 0) && (
              <View style={styles.historyEmpty}>
                <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
                <Text style={styles.historyEmptyText}>No previous conversations</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        /* ── Normal Chat/Info View ── */
        <>
          {renderTabSwitcher()}
          <Animated.View style={[styles.tabContent, contentAnimStyle]}>
            {activeTab === 'info' ? renderInfoTab() : renderChatTab()}
          </Animated.View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyScreen: {
    flex: 1,
  },
  historyContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  historyItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  historyItemTitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: colors.foreground,
  },
  historyItemDate: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyActiveBadge: {
    backgroundColor: `${colors.primary}18`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  historyActiveBadgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xs,
    color: colors.primary,
  },
  historyDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.md,
  },
  historyEmptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: colors.textMuted,
  },

  // Tab content
  tabContent: {
    flex: 1,
  },

  // Tab switcher
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: Radius.full,
    padding: 3,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.xl,
    gap: 2,
  },
  tabIndicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    backgroundColor: colors.primary,
    borderRadius: Radius.full,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    zIndex: 1,
  },
  tabPillText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
  },
  tabPillTextActive: {
    color: '#fff',
  },

  // CTA (no companion yet)
  ctaContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  ctaIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.extrabold,
    color: colors.foreground,
  },
  ctaSubtitle: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },

  // Detail sheet (Info tab)
  infoScrollView: {
    flex: 1,
  },
  detailContent: {
    alignItems: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  detailIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
  },
  detailStats: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  detailStat: {
    alignItems: 'center',
  },
  detailStatValue: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.extrabold,
    color: colors.foreground,
  },
  detailStatLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: colors.textMuted,
  },
  speciesLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: colors.textSecondary,
  },
  giftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.accentBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  giftBannerText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: colors.accent,
  },
  nameEditRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    width: '100%',
  },
  nameInput: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: colors.foreground,
  },
  editNameLink: {
    fontSize: FontSize.sm,
    color: colors.primary,
    fontFamily: FontFamily.semibold,
  },
  giftSection: {
    width: '100%',
    gap: Spacing.sm,
  },
  giftSectionTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  giftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.surfaceLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  giftLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: colors.foreground,
    fontFamily: FontFamily.medium,
    textTransform: 'capitalize',
  },
  giftClaim: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: colors.accent,
  },

  // ---- Chat tab ----
  chatContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  chatMessageList: {
    flex: 1,
  },
  chatMessageListContent: {
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },

  // Message bubbles
  messageBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  messageBubbleRowUser: {
    justifyContent: 'flex-end',
  },
  messageBubbleRowAssistant: {
    justifyContent: 'flex-start',
  },
  chatAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.lg,
  },
  messageBubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: Radius.xs,
  },
  messageBubbleAssistant: {
    backgroundColor: colors.surfaceLight,
    borderBottomLeftRadius: Radius.xs,
  },
  messageText: {
    fontSize: FontSize.sm,
    lineHeight: 19,
    fontFamily: FontFamily.regular,
  },
  messageTextUser: {
    color: '#fff',
  },
  messageTextAssistant: {
    color: colors.foreground,
  },

  // Thinking indicator
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderBottomLeftRadius: Radius.xs,
  },
  thinkingText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // Chat empty state
  chatLoadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.md,
  },
  chatLoadingText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: colors.textMuted,
  },
  chatEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  chatEmptyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    marginBottom: Spacing.sm,
  },
  chatEmptyTitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
    color: colors.foreground,
  },
  chatEmptySubtitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    lineHeight: 19,
  },

  // Chat input bar
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: colors.foreground,
    maxHeight: 80,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceLight,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: '#FF4444',
  },
  voiceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  voiceStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  voiceStatusText: {
    flex: 1,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: colors.textSecondary,
  },
  holdTooltip: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  holdTooltipText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: colors.textSecondary,
  },
  toolBadgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    paddingLeft: 40,
  },
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  toolBadgeText: {
    fontSize: FontSize.xs - 1,
    fontFamily: FontFamily.semibold,
  },
});
