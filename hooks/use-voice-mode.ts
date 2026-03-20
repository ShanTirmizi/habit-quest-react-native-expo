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
  /** Call on press-in: stops TTS if playing, starts listening */
  holdToSpeak: () => void;
  /** Call on press-out: stops listening, triggers processing */
  releaseToSend: () => void;
  startListening: () => Promise<void>;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  cleanup: () => void;
  permissionStatus: PermissionStatus;
  requestPermission: () => Promise<boolean>;
  setCloudTTS: (fn: CloudTTSFn | null) => void;
}

function splitIntoSentences(text: string): string[] {
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
  const cancelPlaybackRef = useRef(false);
  const speakResolveRef = useRef<(() => void) | null>(null);

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

  // Speech recognition events
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
    console.warn('[VoiceMode] Recognition error:', event.error);
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
      if (result.granted) setPermissionStatus('granted');
      else if (result.canAskAgain) setPermissionStatus('undetermined');
      else setPermissionStatus('denied');
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
      }
      setPermissionStatus(result.canAskAgain ? 'undetermined' : 'denied');
      return false;
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
        continuous: true,  // Keep listening until we explicitly stop
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
    // Don't set idle here — the 'result' event with isFinal will set 'thinking'
    // If no final result comes, the 'end' event handler sets idle
  }, []);

  // ── Hold-to-speak: press in ──
  // Stops any TTS, starts listening
  const holdToSpeak = useCallback(() => {
    console.log('[VoiceMode] Hold to speak — stopping TTS, starting listening');

    // Stop TTS if playing
    if (stateRef.current === 'speaking') {
      cancelPlaybackRef.current = true;
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      Speech.stop();
      if (speakResolveRef.current) {
        speakResolveRef.current();
        speakResolveRef.current = null;
      }
    }

    // Start listening
    startListening();
  }, [startListening]);

  // ── Hold-to-speak: press out ──
  // Stops listening — the STT final result triggers thinking state
  const releaseToSend = useCallback(() => {
    console.log('[VoiceMode] Released — stopping recognition');
    if (stateRef.current === 'listening') {
      stopListening();
    }
  }, [stopListening]);

  // ── Speak with sentence pipelining ──
  const speak = useCallback(async (text: string): Promise<void> => {
    setResponseText(text);
    setStateAndRef('speaking');
    cancelPlaybackRef.current = false;

    return new Promise<void>(async (resolve) => {
      speakResolveRef.current = resolve;

      if (cloudTTSRef.current) {
        try {
          const sentences = splitIntoSentences(text);
          console.log(`[VoiceMode] Pipelining TTS for ${sentences.length} sentence(s)`);

          const audioPromises = sentences.map(sentence =>
            cloudTTSRef.current!(sentence).catch(() => null)
          );

          for (let i = 0; i < audioPromises.length; i++) {
            if (cancelPlaybackRef.current || !isMountedRef.current) break;

            const base64Audio = await audioPromises[i];
            if (!base64Audio) continue;
            if (cancelPlaybackRef.current || !isMountedRef.current) break;

            await playBase64Audio(base64Audio, false);
          }

          if (isMountedRef.current && !cancelPlaybackRef.current) {
            setStateAndRef('idle');
          }

          speakResolveRef.current = null;
          resolve();
          return;
        } catch (err) {
          console.warn('[VoiceMode] Cloud TTS failed, falling back to system:', err);
        }
      }

      // Fallback: system TTS
      if (!isMountedRef.current) { resolve(); return; }
      Speech.speak(text, {
        language: 'en-US',
        rate: 0.95,
        onDone: () => {
          if (isMountedRef.current) setStateAndRef('idle');
          speakResolveRef.current = null;
          resolve();
        },
        onError: () => {
          if (isMountedRef.current) setStateAndRef('idle');
          speakResolveRef.current = null;
          resolve();
        },
      });
    });
  }, [setStateAndRef]);

  const playBase64Audio = useCallback(async (
    base64: string,
    setIdleOnFinish = true,
  ): Promise<void> => {
    const file = new ExpoFile(Paths.cache, `tts_${Date.now()}.mp3`);
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    file.write(bytes);
    const uri = file.uri;

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
    if (speakResolveRef.current) {
      speakResolveRef.current();
      speakResolveRef.current = null;
    }
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
    if (speakResolveRef.current) {
      speakResolveRef.current();
      speakResolveRef.current = null;
    }
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
    holdToSpeak,
    releaseToSend,
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
