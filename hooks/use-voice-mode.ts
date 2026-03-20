import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { File as ExpoFile, Paths } from 'expo-file-system';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';
export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

/** Function that converts text to base64-encoded mp3. Return null to fall back to system TTS. */
export type CloudTTSFn = (text: string) => Promise<string | null>;

interface UseVoiceModeReturn {
  voiceState: VoiceState;
  transcript: string;
  partialTranscript: string;
  responseText: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  cleanup: () => void;
  permissionStatus: PermissionStatus;
  requestPermission: () => Promise<boolean>;
  setCloudTTS: (fn: CloudTTSFn | null) => void;
}

/**
 * Split text into sentences for chunked TTS.
 * Splits on sentence-ending punctuation while keeping the punctuation attached.
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries: . ! ? followed by space or end of string
  const raw = text.match(/[^.!?]+[.!?]+[\s]?|[^.!?]+$/g);
  if (!raw) return [text];
  return raw.map(s => s.trim()).filter(s => s.length > 0);
}

export function useVoiceMode(): UseVoiceModeReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [responseText, setResponseText] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const isMountedRef = useRef(true);

  const stateRef = useRef<VoiceState>('idle');
  const setStateAndRef = useCallback((newState: VoiceState) => {
    stateRef.current = newState;
    setVoiceState(newState);
  }, []);

  const gotFinalResultRef = useRef(false);
  const cloudTTSRef = useRef<CloudTTSFn | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  // Flag to cancel in-progress chunked playback
  const cancelPlaybackRef = useRef(false);

  const setCloudTTS = useCallback((fn: CloudTTSFn | null) => {
    cloudTTSRef.current = fn;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    }).catch(() => {});
    checkPermissions();
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, []);

  // Speech recognition event handlers
  useSpeechRecognitionEvent('result', (event) => {
    if (!isMountedRef.current) return;
    const text = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      gotFinalResultRef.current = true;
      setTranscript(text);
      setPartialTranscript('');
      setStateAndRef('thinking');
    } else {
      setPartialTranscript(text);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (!isMountedRef.current) return;
    console.warn('[VoiceMode] Recognition error:', event.error, 'current state:', stateRef.current);
    if (stateRef.current === 'listening') {
      setStateAndRef('idle');
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (!isMountedRef.current) return;
    if (stateRef.current === 'listening' && !gotFinalResultRef.current) {
      console.log('[VoiceMode] Recognition ended without final result, going idle');
      setStateAndRef('idle');
    }
    gotFinalResultRef.current = false;
  });

  const checkPermissions = useCallback(async () => {
    try {
      const result = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      if (!isMountedRef.current) return;
      if (result.granted) {
        setPermissionStatus('granted');
      } else if (result.canAskAgain) {
        setPermissionStatus('undetermined');
      } else {
        setPermissionStatus('denied');
      }
    } catch {
      if (isMountedRef.current) setPermissionStatus('denied');
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!isMountedRef.current) return false;
      if (result.granted) {
        setPermissionStatus('granted');
        return true;
      } else {
        setPermissionStatus(result.canAskAgain ? 'undetermined' : 'denied');
        return false;
      }
    } catch {
      if (isMountedRef.current) setPermissionStatus('denied');
      return false;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    gotFinalResultRef.current = false;
    setTranscript('');
    setPartialTranscript('');
    setStateAndRef('listening');

    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      });
    } catch (e) {
      console.error('[VoiceMode] Failed to start recognition:', e);
      if (isMountedRef.current) setStateAndRef('idle');
    }
  }, [permissionStatus, requestPermission, setStateAndRef]);

  const stopListening = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
    if (isMountedRef.current) setStateAndRef('idle');
  }, [setStateAndRef]);

  // ── Speak with sentence-level pipelining ──
  // Split text into sentences → fire TTS for all in parallel → play sequentially
  // First sentence audio starts playing as soon as it's ready (while others still generating)
  const speak = useCallback(async (text: string): Promise<void> => {
    setResponseText(text);
    setStateAndRef('speaking');
    cancelPlaybackRef.current = false;

    if (cloudTTSRef.current) {
      try {
        const sentences = splitIntoSentences(text);
        console.log(`[VoiceMode] Pipelining TTS for ${sentences.length} sentence(s)`);

        // Fire ALL TTS requests in parallel — each returns a promise
        const audioPromises = sentences.map(sentence =>
          cloudTTSRef.current!(sentence).catch(() => null)
        );

        // Play each sentence as soon as its audio is ready, in order
        for (let i = 0; i < audioPromises.length; i++) {
          if (cancelPlaybackRef.current || !isMountedRef.current) break;

          const base64Audio = await audioPromises[i];
          if (!base64Audio) continue;
          if (cancelPlaybackRef.current || !isMountedRef.current) break;

          await playBase64Audio(base64Audio, /* setIdleOnFinish */ false);
        }

        // All sentences played (or cancelled)
        if (isMountedRef.current && !cancelPlaybackRef.current) {
          setStateAndRef('idle');
        }
        return;
      } catch (err) {
        console.warn('[VoiceMode] Cloud TTS pipeline failed, falling back to system:', err);
      }
    }

    // Fallback: system TTS (no pipelining possible)
    if (!isMountedRef.current) return;
    return new Promise<void>((resolve) => {
      Speech.speak(text, {
        language: 'en-US',
        rate: 0.95,
        onDone: () => {
          if (isMountedRef.current) setStateAndRef('idle');
          resolve();
        },
        onError: () => {
          if (isMountedRef.current) setStateAndRef('idle');
          resolve();
        },
      });
    });
  }, [setStateAndRef]);

  /** Play base64-encoded mp3 audio via expo-av. Resolves when playback finishes. */
  const playBase64Audio = useCallback(async (
    base64: string,
    setIdleOnFinish = true,
  ): Promise<void> => {
    const file = new ExpoFile(Paths.cache, `tts_${Date.now()}.mp3`);
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    file.write(bytes);
    const uri = file.uri;

    // Unload any previous sound
    if (soundRef.current) {
      try { await soundRef.current.unloadAsync(); } catch {}
      soundRef.current = null;
    }

    return new Promise<void>(async (resolve) => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              if (setIdleOnFinish && isMountedRef.current) setStateAndRef('idle');
              sound.unloadAsync().catch(() => {});
              soundRef.current = null;
              try { file.delete(); } catch {}
              resolve();
            }
          },
        );
        soundRef.current = sound;
      } catch (err) {
        console.error('[VoiceMode] Audio playback failed:', err);
        if (setIdleOnFinish && isMountedRef.current) setStateAndRef('idle');
        try { file.delete(); } catch {}
        resolve();
      }
    });
  }, [setStateAndRef]);

  const stopSpeaking = useCallback(() => {
    cancelPlaybackRef.current = true;
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    Speech.stop();
    if (isMountedRef.current) setStateAndRef('idle');
  }, [setStateAndRef]);

  const cleanup = useCallback(() => {
    cancelPlaybackRef.current = true;
    try { ExpoSpeechRecognitionModule.stop(); } catch {}
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    Speech.stop();
    if (isMountedRef.current) {
      setStateAndRef('idle');
      setTranscript('');
      setPartialTranscript('');
      setResponseText('');
    }
  }, [setStateAndRef]);

  return {
    voiceState,
    transcript,
    partialTranscript,
    responseText,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    cleanup,
    permissionStatus,
    requestPermission,
    setCloudTTS,
  };
}
