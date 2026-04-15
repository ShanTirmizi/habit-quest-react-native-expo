/**
 * VoiceModeOverlay — headless controller for voice conversation.
 * Push-to-talk: hold mic to speak, release to send.
 * If AI is speaking when you hold mic, TTS stops and listening begins.
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
  onStateChange?: (state: VoiceState) => void;
  cloudTTS?: CloudTTSFn;
}

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

  // Wire up cloud TTS
  useEffect(() => {
    voice.setCloudTTS(cloudTTS ?? null);
  }, [cloudTTS]);

  // Expose state changes
  useEffect(() => {
    onStateChange?.(voice.voiceState);
  }, [voice.voiceState]);

  // Activate/deactivate
  useEffect(() => {
    if (active) {
      isClosingRef.current = false;
      isProcessingRef.current = false;
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
      return;
    }

    if (__DEV__) console.log('[VoiceController] Processing:', text.substring(0, 50));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const reply = await sendMessage({
        userId,
        userMessage: text.trim(),
        sessionId,
      });

      if (__DEV__) console.log('[VoiceController] Got reply:', reply.substring(0, 50));

      if (isClosingRef.current) {
        isProcessingRef.current = false;
        return;
      }

      onMessageSent(
        { role: 'user', content: text.trim() },
        { role: 'assistant', content: reply },
      );

      // Speak the response — user can interrupt by holding mic again
      await voiceRef.current.speak(reply);
      isProcessingRef.current = false;

    } catch (error) {
      if (__DEV__) console.error('[VoiceController] Error:', error);

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
      isProcessingRef.current = false;
    }
  };

  // Hold mic → stop TTS + start listening
  const holdMic = useCallback(() => {
    if (isClosingRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    voiceRef.current.holdToSpeak();
  }, []);

  // Release mic → stop listening, process
  const releaseMic = useCallback(() => {
    if (isClosingRef.current) return;
    voiceRef.current.releaseToSend();
  }, []);

  const stop = useCallback(() => {
    isClosingRef.current = true;
    isProcessingRef.current = false;
    voiceRef.current.cleanup();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDeactivate();
  }, [onDeactivate]);

  return {
    voiceState: voice.voiceState,
    transcript: voice.transcript,
    partialTranscript: voice.partialTranscript,
    responseText: voice.responseText,
    holdMic,
    releaseMic,
    stop,
  };
}
