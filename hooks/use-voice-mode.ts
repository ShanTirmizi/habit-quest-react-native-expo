import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import * as Speech from 'expo-speech';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';
export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

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
}

export function useVoiceMode(): UseVoiceModeReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [responseText, setResponseText] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const isMountedRef = useRef(true);

  // Use a ref to track the current state so event handlers avoid stale closures
  const stateRef = useRef<VoiceState>('idle');
  const setStateAndRef = useCallback((newState: VoiceState) => {
    stateRef.current = newState;
    setVoiceState(newState);
  }, []);

  // Track whether we got a final result (to prevent 'end' event from resetting to idle)
  const gotFinalResultRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
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
    // Only reset to idle if we're still in listening state
    if (stateRef.current === 'listening') {
      setStateAndRef('idle');
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (!isMountedRef.current) return;
    // Only reset to idle if we didn't get a final result
    // (the 'end' event fires after 'result' with isFinal=true, but we've already moved to 'thinking')
    if (stateRef.current === 'listening' && !gotFinalResultRef.current) {
      console.log('[VoiceMode] Recognition ended without final result, going idle');
      setStateAndRef('idle');
    }
    // Reset the flag for next recognition session
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

  const speak = useCallback(async (text: string): Promise<void> => {
    setResponseText(text);
    setStateAndRef('speaking');

    return new Promise<void>((resolve) => {
      Speech.speak(text, {
        language: 'en-US',
        rate: 0.95,
        onDone: () => {
          if (isMountedRef.current) {
            setStateAndRef('idle');
          }
          resolve();
        },
        onError: () => {
          if (isMountedRef.current) {
            setStateAndRef('idle');
          }
          resolve();
        },
      });
    });
  }, [setStateAndRef]);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    if (isMountedRef.current) setStateAndRef('idle');
  }, [setStateAndRef]);

  const cleanup = useCallback(() => {
    try { ExpoSpeechRecognitionModule.stop(); } catch {}
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
  };
}
