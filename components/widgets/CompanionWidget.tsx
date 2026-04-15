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
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
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
import { GlassCard } from '@/components/ui/GlassCard';
import { BottomSheet, BottomSheetTextInput as TextInput } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ChatMarkdown } from '@/components/ui/ChatMarkdown';
import { useToast } from '@/contexts/toast-context';
import { useTranslation } from 'react-i18next';
import { useVoiceModeController } from '@/components/voice/VoiceModeOverlay';

// Fixed snap point prevents the sheet from resizing when switching between
// Info and Chat tabs (which have different content heights). This eliminates
// the jitter that enableDynamicSizing causes on content changes.
const COMPANION_SNAP_POINTS = ['92%'];

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

// Translation keys for Dr. Sage responses — resolved inside the component where t() is available
const SAGE_RESPONSE_KEYS = Array.from({ length: 10 }, (_, i) => `sageResponse.${i}`);

/** Animated wrapper that fades-in + slides-up each chat bubble on mount.
 *  When `skipAnimation` is true, renders children immediately (used for
 *  initial batch of messages to avoid triggering layout changes that make
 *  the ScrollView visibly scroll). */
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

const TOOL_BADGE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; labelKey: string; color: string }> = {
  create_habits: { icon: 'checkmark-circle', labelKey: 'toolBadge.habit', color: '#4CAF50' },
  create_medicines: { icon: 'medkit', labelKey: 'toolBadge.medication', color: '#2196F3' },
  create_quests: { icon: 'flag', labelKey: 'toolBadge.quest', color: '#FF9800' },
  toggle_holiday_mode: { icon: 'airplane', labelKey: 'toolBadge.holiday', color: '#9C27B0' },
};

// ── Memoized chat input bar ──
// Extracted to prevent re-renders from voice state, message list, etc. from
// resetting the BottomSheetTextInput cursor position while the user is typing.
interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onMicPressIn: () => void;
  onMicPressOut: () => void;
  isSending: boolean;
  placeholder: string;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}

const ChatInputBar = React.memo(function ChatInputBar({
  value,
  onChangeText,
  onSend,
  onMicPressIn,
  onMicPressOut,
  isSending,
  placeholder,
  colors,
  styles,
}: ChatInputBarProps) {
  return (
    <View style={styles.chatInputBar}>
      <TextInput
        style={styles.chatTextInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={5000}
        returnKeyType="default"
        blurOnSubmit={false}
      />
      {value.trim() ? (
        <Pressable
          onPress={onSend}
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
          onPressIn={onMicPressIn}
          onPressOut={onMicPressOut}
          style={({ pressed }) => [
            styles.micButton,
            pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
          ]}
        >
          <Ionicons name="mic" size={20} color="#fff" />
        </Pressable>
      )}
    </View>
  );
});

interface CompanionWidgetProps {
  userId: Id<'users'>;
  completionRate: number;
  currentHp: number;
  maxHp: number;
  /** When provided, the parent controls sheet visibility externally (e.g. from top bar avatar) */
  externalVisible?: boolean;
  onExternalClose?: () => void;
}

export function CompanionWidget({
  userId,
  completionRate,
  currentHp,
  maxHp,
  externalVisible,
  onExternalClose,
}: CompanionWidgetProps) {
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
  const initialRenderRef = useRef(true);
  // True only on initial sheet open — used to trigger content fade-in after
  // scroll is positioned. Not set during tab switches since switchTab handles that.
  const needsRevealRef = useRef(false);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [holdToSpeakTooltip, setHoldToSpeakTooltip] = useState(false);
  const micPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const chatListRef = useRef<ScrollView>(null);
  const prevMessageCountRef = useRef(0);
  const chatReadyRef = useRef(false);

  const companion = useQuery(api.companions.getCompanion, { userId });
  const unclaimedGifts = useQuery(api.companions.getUnclaimedGiftsCount, { userId });
  const sessionMessages = useQuery(
    api.chat.getSessionMessages,
    activeSessionId ? { userId, sessionId: activeSessionId } : 'skip'
  );

  const getOrCreateMutation = useMutation(api.companions.getOrCreateCompanion);
  const updateMoodMutation = useMutation(api.companions.updateMood);
  const updateNameMutation = useMutation(api.companions.updateName);
  const claimGiftMutation = useMutation(api.companions.claimGift);
  const saveMessageMutation = useMutation(api.chat.saveMessage);
  const sendMessageAction = useAction(api.chatAction.sendMessage);
  const getOrCreateSessionMutation = useMutation(api.chat.getOrCreateSession);
  const ttsSynthesize = useAction(api.tts.synthesize);

  // Cloud TTS function — calls Convex action which hits OpenAI TTS API
  const cloudTTS = useCallback(async (text: string): Promise<string | null> => {
    try {
      return await ttsSynthesize({ text, voice: 'nova' });
    } catch (err) {
      if (__DEV__) console.warn('[CompanionWidget] Cloud TTS error:', err);
      return null;
    }
  }, [ttsSynthesize]);

  // Voice mode controller — always active, hold-to-speak
  const voiceController = useVoiceModeController({
    active: true,
    onDeactivate: () => {},
    userId,
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

  // Breathing pulse for gift indicator (scale + subtle opacity)
  const giftScale = useSharedValue(1);
  const giftOpacity = useSharedValue(1);
  // Cleanup tooltip timer on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

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

  // Auto-update mood when widget mounts
  useEffect(() => {
    if (companion) {
      const hpCritical = maxHp > 0 ? (currentHp / maxHp) <= 0.2 : false;
      updateMoodMutation({ userId, completionRate, hpCritical }).catch(() => {});
    }
  }, [companion?._id, completionRate, currentHp]);

  // NOTE: We intentionally do NOT clear localMessages when sessionMessages
  // updates. The dedup logic in allMessages handles filtering out local
  // messages that have been persisted to the backend. Clearing eagerly
  // caused a full-screen flicker: messages temporarily vanished then
  // reappeared, triggering unmount/remount of all ChatBubble components.

  // Use external visibility when provided
  const isVisible = externalVisible ?? false;

  const contentOpacity = useSharedValue(1);

  const switchTab = useCallback((tab: TabType) => {
    if (tab === activeTab) return;
    Haptics.selectionAsync();
    // Mark as initial render so chat messages skip animation + scroll instantly
    if (tab === 'chat') {
      initialRenderRef.current = true;
      chatReadyRef.current = false;
      prevMessageCountRef.current = 0;
    }
    // Animate indicator
    tabProgress.value = withTiming(tab === 'chat' ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    // Fade out → swap → fade in
    contentOpacity.value = withTiming(0, { duration: 100 }, () => {
      runOnJS(setActiveTab)(tab);
      contentOpacity.value = withTiming(1, { duration: 150 });
    });
  }, [activeTab]);

  // Pill indicator: half the switcher inner width, slides between pills
  const pillHalf = switcherWidth > 0 ? (switcherWidth - 6) / 2 : 0; // 6 = padding*2 (3+3)
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabProgress.value * (pillHalf + 2) }], // +2 for gap
    width: pillHalf,
  }));

  // Content fade wrapper
  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // Scroll messages to bottom when keyboard appears so the input stays visible
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

  // When switching to chat tab via setActiveTab (triggered by switchTab's runOnJS),
  // the scroll refs are already reset in switchTab() before the fade animation.

  // Get or create session when the sheet opens
  useEffect(() => {
    if (isVisible) {
      getOrCreateSessionMutation({ userId }).then((sid) => {
        setActiveSessionId(sid);
      });
      chatReadyRef.current = false;
      prevMessageCountRef.current = 0;
      initialRenderRef.current = true;
      needsRevealRef.current = true;
      contentOpacity.value = 0;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [isVisible]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingName(false);
    setActiveTab('chat');
    tabProgress.value = 1;
    contentOpacity.value = 1;
    setChatInput('');
    setLocalMessages([]);
    chatReadyRef.current = false;
    prevMessageCountRef.current = 0;
    initialRenderRef.current = true;
    needsRevealRef.current = false;
    // Stop any active voice playback/listening
    voiceController.stop();
    onExternalClose?.();
  };

  const handleChooseCompanion = useCallback(async () => {
    try {
      await getOrCreateMutation({ userId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('toast.companionJoined'), undefined, 'xp');
    } catch {
      showToast(t('toast.failedSummon'), undefined, 'error');
    }
  }, [userId, getOrCreateMutation, showToast]);

  const handleSaveName = useCallback(async () => {
    if (!newName.trim()) return;
    try {
      await updateNameMutation({ userId, name: newName.trim() });
      setEditingName(false);
      showToast(t('toast.companionRenamed'), undefined, 'xp');
    } catch {
      showToast(t('toast.failedRename'), undefined, 'error');
    }
  }, [userId, newName, updateNameMutation, showToast]);

  const handleClaimGift = useCallback(async (giftId: string) => {
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
    // Pick a contextual response based on simple keyword matching, or random fallback
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
    // Random fallback
    return sageResponses[Math.floor(Math.random() * sageResponses.length)];
  }, [t, sageResponses]);

  // Use a ref for chatInput so handleSendMessage doesn't depend on it.
  // This prevents the send callback from changing on every keystroke, which would
  // defeat React.memo on ChatInputBar and cause cursor jumping.
  const chatInputRef = useRef(chatInput);
  chatInputRef.current = chatInput;
  const isSendingRef = useRef(isSending);
  isSendingRef.current = isSending;

  const handleSendMessage = useCallback(async () => {
    const text = chatInputRef.current.trim();
    if (!text || isSendingRef.current || !activeSessionId) return;

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

      // Save locally generated messages
      try {
        await saveMessageMutation({
          userId,
          role: 'user',
          content: text,
          sessionId: activeSessionId!,
        });
        await saveMessageMutation({
          userId,
          role: 'assistant',
          content: sageReply,
          sessionId: activeSessionId!,
        });
      } catch {}
    } finally {
      setIsSending(false);
    }
  }, [userId, activeSessionId, sendMessageAction, saveMessageMutation, generateSageResponse]);

  // Stable mic callbacks — extracted so ChatInputBar doesn't re-render on voice state changes
  const handleMicPressIn = useCallback(() => {
    micPressTimerRef.current = setTimeout(() => {
      micPressTimerRef.current = null;
    }, 250);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    voiceController.holdMic();
  }, [voiceController.holdMic]);

  const handleMicPressOut = useCallback(() => {
    if (micPressTimerRef.current) {
      clearTimeout(micPressTimerRef.current);
      micPressTimerRef.current = null;
      voiceController.releaseMic();
      setHoldToSpeakTooltip(true);
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = setTimeout(() => {
        setHoldToSpeakTooltip(false);
        tooltipTimerRef.current = null;
      }, 2000);
    } else {
      voiceController.releaseMic();
    }
  }, [voiceController.releaseMic]);

  // Scroll to bottom when isSending changes (shows/hides thinking indicator)
  useEffect(() => {
    if (isSending && chatReadyRef.current) {
      setTimeout(() => {
        chatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isSending]);

  // Merge backend messages with local (optimistic) ones.
  // Deduplicate: if a local message's content already appears in the last N
  // backend messages, skip it (it's been persisted and would show twice).
  const allMessages: ChatMessage[] = useMemo(() => {
    const backend = sessionMessages ?? [];
    if (localMessages.length === 0) return backend;

    const recentBackendContents = new Set(
      backend.slice(-localMessages.length * 2).map((m) => `${m.role}:${m.content}`)
    );

    const uniqueLocal = localMessages.filter(
      (m) => !recentBackendContents.has(`${m.role}:${m.content}`)
    );

    return [...backend, ...uniqueLocal];
  }, [sessionMessages, localMessages]);

  // ---- Copy message handler (long-press to copy full message) ----
  // NOTE: This hook MUST be before any early returns to satisfy React's rules of hooks.
  const handleCopyMessage = useCallback(async (content: string) => {
    await Clipboard.setStringAsync(content);
    showToast(t('toast.messageCopied'), undefined, 'xp');
  }, [showToast]);

  // No companion yet -- show summon CTA in the sheet
  if (companion === null) {
    return (
      <BottomSheet visible={isVisible} onClose={handleClose} title={t('headerTitle')}>
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
      </BottomSheet>
    );
  }

  // Loading
  if (companion === undefined) return null;

  const speciesIcon = SPECIES_ICON[companion.species] || 'paw';
  const speciesColor = speciesColorMap[companion.species] || colors.primary;
  const moodEmoji = MOOD_EMOJI[companion.mood] || '😊';

  // ---- Tab Switcher ----
  const renderTabSwitcher = () => (
    <View
      style={styles.tabSwitcher}
      onLayout={(e) => setSwitcherWidth(e.nativeEvent.layout.width)}
    >
      {/* Sliding indicator */}
      {pillHalf > 0 && (
        <Animated.View style={[styles.tabIndicator, indicatorStyle]} />
      )}
      <Pressable
        onPress={() => switchTab('info')}
        style={styles.tabPill}
      >
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={activeTab === 'info' ? '#fff' : colors.textSecondary}
        />
        <Text style={[styles.tabPillText, activeTab === 'info' && styles.tabPillTextActive]}>
          {t('tab.info')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => switchTab('chat')}
        style={styles.tabPill}
      >
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
    <View style={styles.detailContent}>
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
          {companion.gifts.filter((g: any) => !g.claimed).map((gift: any) => (
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
    </View>
  );

  // ---- Chat Message Bubble ----
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const hasToolCalls = !isUser && item.toolCalls && item.toolCalls.length > 0;
    return (
      <View>
        <Pressable
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleCopyMessage(item.content);
          }}
          delayLongPress={400}
          style={[styles.messageBubbleRow, isUser ? styles.messageBubbleRowUser : styles.messageBubbleRowAssistant]}
        >
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
              <ChatMarkdown
                selectable
                style={[styles.messageText, styles.messageTextAssistant]}
              >
                {item.content}
              </ChatMarkdown>
            )}
          </View>
        </Pressable>
        {/* Tool call badges — below the message row */}
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
      {/* Messages list */}
      <ScrollView
        ref={chatListRef}
        style={styles.chatMessageList}
        contentContainerStyle={styles.chatMessageListContent}
        contentOffset={{ x: 0, y: 99999 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        onContentSizeChange={() => {
          const msgCount = allMessages.length;

          if (!chatReadyRef.current) {
            chatListRef.current?.scrollToEnd({ animated: false });
            chatReadyRef.current = true;
            prevMessageCountRef.current = msgCount;
            initialRenderRef.current = false;
            if (needsRevealRef.current) {
              needsRevealRef.current = false;
              contentOpacity.value = withTiming(1, { duration: 200 });
            }
          } else if (msgCount > prevMessageCountRef.current) {
            // New message arrived — scroll after a brief delay so layout
            // has fully settled (prevents scrolling short of the true end)
            prevMessageCountRef.current = msgCount;
            setTimeout(() => {
              chatListRef.current?.scrollToEnd({ animated: true });
            }, 50);
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
            <ChatBubble key={msg._id ?? msg.content.slice(0, 20)} skipAnimation={initialRenderRef.current}>
              {renderMessage({ item: msg })}
            </ChatBubble>
          ))
        )}
        {/* Thinking indicator — inside ScrollView so it doesn't push input below keyboard */}
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

      {/* Input bar — memoized to prevent cursor jumping from voice state re-renders */}
      <ChatInputBar
        value={chatInput}
        onChangeText={setChatInput}
        onSend={handleSendMessage}
        onMicPressIn={handleMicPressIn}
        onMicPressOut={handleMicPressOut}
        isSending={isSending}
        placeholder={t('chat.inputPlaceholder', { name: companion.name })}
        colors={colors}
        styles={styles}
      />
    </View>
  );

  return (
    <BottomSheet visible={isVisible} onClose={handleClose} title={companion.name} snapPoints={COMPANION_SNAP_POINTS}>
      {renderTabSwitcher()}
      <Animated.View style={contentAnimStyle}>
        {activeTab === 'info' ? renderInfoTab() : renderChatTab()}
      </Animated.View>
    </BottomSheet>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  // Tab switcher
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: Radius.full,
    padding: 3,
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing['2xl'],
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
    alignItems: 'center',
    gap: Spacing.lg,
    paddingBottom: Spacing['3xl'],
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
  detailContent: {
    alignItems: 'center',
    gap: Spacing.lg,
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
    paddingBottom: Spacing.md,
  },
  chatMessageList: {
    maxHeight: 350,
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
    marginTop: Spacing.sm,
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
    marginTop: Spacing.xs,
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
    paddingLeft: 40,  // align with assistant bubble (avatar 28 + gap 8 + small pad)
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
