import React, { useEffect, useCallback, useRef } from 'react';
import { Modal, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/theme-context';
import { useVoiceMode } from '@/hooks/use-voice-mode';
import { VoiceOrb } from './VoiceOrb';
import type { Id } from '@/convex/_generated/dataModel';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface VoiceModeOverlayProps {
  visible: boolean;
  onClose: () => void;
  userId: Id<'users'>;
  sessionId: string;
  companionName: string;
  speciesColor: string;
  sendMessage: (args: {
    userId: Id<'users'>;
    userMessage: string;
    sessionId: string;
  }) => Promise<string>;
  onMessageSent: (userMsg: ChatMessage, aiMsg: ChatMessage) => void;
  generateFallback: (msg: string) => string;
}

const AUTO_LISTEN_DELAY = 600;

export function VoiceModeOverlay({
  visible,
  onClose,
  userId,
  sessionId,
  companionName,
  speciesColor,
  sendMessage,
  onMessageSent,
  generateFallback,
}: VoiceModeOverlayProps) {
  const { colors, isDark } = useTheme();
  const voice = useVoiceMode();
  const isProcessingRef = useRef(false);
  const isClosingRef = useRef(false);

  // Store latest voice functions in refs to avoid stale closures
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  // Start listening when overlay becomes visible
  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      isProcessingRef.current = false;
      const timer = setTimeout(() => {
        if (!isClosingRef.current) {
          console.log('[VoiceOverlay] Starting initial listening');
          voiceRef.current.startListening();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }, 400);
      return () => clearTimeout(timer);
    } else {
      voiceRef.current.cleanup();
    }
  }, [visible]);

  // When voice state transitions to 'thinking' with a transcript, send it
  useEffect(() => {
    console.log('[VoiceOverlay] State change:', voice.voiceState, 'transcript:', voice.transcript?.substring(0, 30), 'processing:', isProcessingRef.current);

    if (voice.voiceState === 'thinking' && voice.transcript && !isProcessingRef.current) {
      isProcessingRef.current = true;
      processTranscript(voice.transcript);
    }
  }, [voice.voiceState, voice.transcript]);

  const processTranscript = async (text: string) => {
    if (!text.trim() || isClosingRef.current) {
      isProcessingRef.current = false;
      if (!isClosingRef.current) {
        voiceRef.current.startListening();
      }
      return;
    }

    console.log('[VoiceOverlay] Processing transcript:', text.substring(0, 50));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const reply = await sendMessage({
        userId,
        userMessage: text.trim(),
        sessionId,
      });

      console.log('[VoiceOverlay] Got reply:', reply.substring(0, 50));

      if (isClosingRef.current) {
        isProcessingRef.current = false;
        return;
      }

      // Add messages to chat history
      onMessageSent(
        { role: 'user', content: text.trim() },
        { role: 'assistant', content: reply },
      );

      // Speak the response
      console.log('[VoiceOverlay] Starting TTS');
      await voiceRef.current.speak(reply);

      if (isClosingRef.current) {
        isProcessingRef.current = false;
        return;
      }

      // Auto-listen again after a brief delay
      console.log('[VoiceOverlay] TTS done, will auto-listen');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => {
        isProcessingRef.current = false;
        if (!isClosingRef.current) {
          voiceRef.current.startListening();
        }
      }, AUTO_LISTEN_DELAY);
    } catch (error) {
      console.error('[VoiceOverlay] Send message failed:', error);

      if (isClosingRef.current) {
        isProcessingRef.current = false;
        return;
      }

      const fallback = generateFallback(text.trim());
      onMessageSent(
        { role: 'user', content: text.trim() },
        { role: 'assistant', content: fallback },
      );

      await voiceRef.current.speak(fallback);

      setTimeout(() => {
        isProcessingRef.current = false;
        if (!isClosingRef.current) {
          voiceRef.current.startListening();
        }
      }, AUTO_LISTEN_DELAY);
    }
  };

  const handleClose = useCallback(() => {
    isClosingRef.current = true;
    isProcessingRef.current = false;
    voiceRef.current.cleanup();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const handleOrbPress = useCallback(() => {
    const currentState = voiceRef.current.voiceState;
    if (currentState === 'idle' && !isProcessingRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      voiceRef.current.startListening();
    } else if (currentState === 'speaking') {
      voiceRef.current.stopSpeaking();
    }
  }, []);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={handleOrbPress}>
        <VoiceOrb
          state={voice.voiceState}
          colors={colors}
          isDark={isDark}
          companionName={companionName}
          speciesColor={speciesColor}
          transcript={voice.transcript}
          partialTranscript={voice.partialTranscript}
          responseText={voice.responseText}
          onClose={handleClose}
        />
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
  },
});
