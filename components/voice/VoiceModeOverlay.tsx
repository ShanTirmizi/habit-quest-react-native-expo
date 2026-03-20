/**
 * VoiceModeOverlay — headless controller for the voice conversation loop.
 * Visual feedback is rendered inline by CompanionWidget via VoiceBorderGlow.
 */
import { useEffect, useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useVoiceMode, type VoiceState, type CloudTTSFn } from '@/hooks/use-voice-mode';
import type { Id } from '@/convex/_generated/dataModel';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface VoiceModeControllerProps {
  active: boolean;
  onDeactivate: () => void;
  userId: Id<'users'>;
  sessionId: string;
  sendMessage: (args: {
    userId: Id<'users'>;
    userMessage: string;
    sessionId: string;
  }) => Promise<string>;
  onMessageSent: (userMsg: ChatMessage, aiMsg: ChatMessage) => void;
  generateFallback: (msg: string) => string;
  /** Expose voice state to parent for animation */
  onStateChange?: (state: VoiceState) => void;
  /** Cloud TTS function — returns base64 mp3 or null to fall back to system TTS */
  cloudTTS?: CloudTTSFn;
}

const AUTO_LISTEN_DELAY = 600;

export function useVoiceModeController({
  active,
  onDeactivate,
  userId,
  sessionId,
  sendMessage,
  onMessageSent,
  generateFallback,
  onStateChange,
  cloudTTS,
}: VoiceModeControllerProps) {
  const voice = useVoiceMode();
  const isProcessingRef = useRef(false);
  const isClosingRef = useRef(false);
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  // Wire up cloud TTS when provided
  useEffect(() => {
    voice.setCloudTTS(cloudTTS ?? null);
  }, [cloudTTS]);

  // Expose state changes to parent
  useEffect(() => {
    onStateChange?.(voice.voiceState);
  }, [voice.voiceState]);

  // Start/stop listening based on active state
  useEffect(() => {
    if (active) {
      isClosingRef.current = false;
      isProcessingRef.current = false;
      const timer = setTimeout(() => {
        if (!isClosingRef.current) {
          console.log('[VoiceController] Starting initial listening');
          voiceRef.current.startListening();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      isClosingRef.current = true;
      voiceRef.current.cleanup();
    }
  }, [active]);

  // Process transcript when thinking
  useEffect(() => {
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

    console.log('[VoiceController] Processing:', text.substring(0, 50));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const reply = await sendMessage({
        userId,
        userMessage: text.trim(),
        sessionId,
      });

      console.log('[VoiceController] Got reply:', reply.substring(0, 50));

      if (isClosingRef.current) {
        isProcessingRef.current = false;
        return;
      }

      onMessageSent(
        { role: 'user', content: text.trim() },
        { role: 'assistant', content: reply },
      );

      // Speak the response (uses cloud TTS if available, falls back to system)
      await voiceRef.current.speak(reply);

      if (isClosingRef.current) {
        isProcessingRef.current = false;
        return;
      }

      // Auto-listen again
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => {
        isProcessingRef.current = false;
        if (!isClosingRef.current) {
          voiceRef.current.startListening();
        }
      }, AUTO_LISTEN_DELAY);
    } catch (error) {
      console.error('[VoiceController] Error:', error);

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

  const stop = useCallback(() => {
    isClosingRef.current = true;
    isProcessingRef.current = false;
    voiceRef.current.cleanup();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDeactivate();
  }, [onDeactivate]);

  const tapAction = useCallback(() => {
    const s = voiceRef.current.voiceState;
    if (s === 'idle' && !isProcessingRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      voiceRef.current.startListening();
    } else if (s === 'speaking') {
      voiceRef.current.stopSpeaking();
    }
  }, []);

  return {
    voiceState: voice.voiceState,
    transcript: voice.transcript,
    partialTranscript: voice.partialTranscript,
    responseText: voice.responseText,
    stop,
    tapAction,
  };
}
