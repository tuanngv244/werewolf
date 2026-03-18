'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';

// ─── Jitsi External API types ──────────────────────────────
interface JitsiMeetExternalAPI {
  executeCommand: (command: string, ...args: unknown[]) => void;
  addEventListener: (event: string, handler: (...args: unknown[]) => void) => void;
  removeEventListener: (event: string, handler: (...args: unknown[]) => void) => void;
  getNumberOfParticipants: () => number;
  getParticipantsInfo: () => JitsiParticipant[];
  isAudioMuted: () => Promise<boolean>;
  isVideoMuted: () => Promise<boolean>;
  dispose: () => void;
  getIFrame: () => HTMLIFrameElement;
}

export interface JitsiParticipant {
  participantId: string;
  displayName: string;
  avatarURL?: string;
}

interface JitsiMeetExternalAPIConstructor {
  new (domain: string, options: Record<string, unknown>): JitsiMeetExternalAPI;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiMeetExternalAPIConstructor;
  }
}

// ─── Script loader ──────────────────────────────
let scriptLoadPromise: Promise<void> | null = null;

function loadJitsiScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;

  if (window.JitsiMeetExternalAPI) {
    scriptLoadPromise = Promise.resolve();
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('Failed to load Jitsi Meet API'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

// ─── iframe permission helper ──────────────────────────────
// The Jitsi External API creates an iframe internally. We need the `allow`
// attribute to include camera/microphone BEFORE the iframe navigates to the
// Jitsi page, otherwise the browser blocks getUserMedia inside the cross-origin
// iframe. We use a MutationObserver to catch the iframe the instant it's added
// to the DOM and patch the attribute before it loads.
function watchForIframe(
  container: HTMLElement,
  callback: (iframe: HTMLIFrameElement) => void,
): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLIFrameElement) {
          callback(node);
          observer.disconnect();
          return;
        }
        // Also check children (Jitsi may wrap iframe in a div)
        if (node instanceof HTMLElement) {
          const iframe = node.querySelector('iframe');
          if (iframe) {
            callback(iframe);
            observer.disconnect();
            return;
          }
        }
      }
    }
  });

  observer.observe(container, { childList: true, subtree: true });
  return observer;
}

// ─── Hook ──────────────────────────────
export interface UseJitsiMeetOptions {
  roomCode: string | null;
  parentNode: HTMLDivElement | null;
  displayName?: string;
  startWithAudioMuted?: boolean;
  startWithVideoMuted?: boolean;
  onParticipantsChanged?: (count: number) => void;
}

export function useJitsiMeet({
  roomCode,
  parentNode,
  displayName,
  startWithAudioMuted = true,
  startWithVideoMuted = false,
  onParticipantsChanged,
}: UseJitsiMeetOptions) {
  const apiRef = useRef<JitsiMeetExternalAPI | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(startWithAudioMuted);
  const [isVideoMuted, setIsVideoMuted] = useState(startWithVideoMuted);
  const [participantCount, setParticipantCount] = useState(0);
  const [isJoined, setIsJoined] = useState(false);
  const user = useAuthStore((s) => s.user);

  const effectiveName = displayName || user?.username || 'Player';

  // Initialize Jitsi meeting
  useEffect(() => {
    if (!roomCode || !parentNode) return;

    let disposed = false;
    let iframeObserver: MutationObserver | null = null;

    async function init() {
      setIsLoading(true);
      setError(null);

      try {
        await loadJitsiScript();

        if (disposed || !window.JitsiMeetExternalAPI || !parentNode) return;

        // CRITICAL: Set up MutationObserver BEFORE creating the API instance.
        // This catches the iframe the moment Jitsi injects it into the DOM
        // and sets the `allow` attribute before the iframe src loads.
        // Without this, the cross-origin iframe cannot access camera/microphone.
        iframeObserver = watchForIframe(parentNode, (iframe) => {
          iframe.setAttribute(
            'allow',
            'camera *; microphone *; display-capture *; autoplay *; clipboard-write *; encrypted-media *',
          );
          // Also set sandbox permissions if not already set
          if (!iframe.getAttribute('sandbox')) {
            // Don't set sandbox — it's more restrictive. Just ensure allow is set.
          }
          iframe.style.border = 'none';
          iframe.style.borderRadius = '8px';
        });

        // Generate a unique room name scoped to the game
        const jitsiRoomName = `werewolf-game-${roomCode}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

        const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
          roomName: jitsiRoomName,
          parentNode,
          width: '100%',
          height: '100%',
          configOverwrite: {
            // Start muted to avoid permission errors on init
            startWithAudioMuted: true,
            startWithVideoMuted: true,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            disableInviteFunctions: true,
            hideConferenceSubject: true,
            hideConferenceTimer: true,
            toolbarButtons: [],  // Hide all toolbar — we provide custom controls
            notifications: [],
            enableClosePage: false,
            enableWelcomePage: false,
            disableModeratorIndicator: true,
            disableSelfView: false,
            disableSelfViewSettings: true,
            resolution: 180,
            constraints: {
              video: {
                height: { ideal: 180, max: 180, min: 90 },
                width: { ideal: 180, max: 180, min: 90 },
              },
            },
            filmstrip: {
              disableResizable: true,
              disableStageFilmstrip: true,
            },
            // Force tile view so ALL participants are visible at once
            // (not just the dominant speaker)
            tileView: {
              numberOfVisibleTiles: 16,
            },
            // Enable P2P for better latency in small rooms
            p2p: {
              enabled: true,
            },
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_CHROME_EXTENSION_BANNER: false,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            FILM_STRIP_MAX_HEIGHT: 60,
            TILE_VIEW_MAX_COLUMNS: 8,
            TOOLBAR_ALWAYS_VISIBLE: false,
            TOOLBAR_TIMEOUT: 0,
            DEFAULT_BACKGROUND: '#1a1a2e',
            DISABLE_FOCUS_INDICATOR: true,
            DISABLE_DOMINANT_SPEAKER_INDICATOR: true,
            DISABLE_VIDEO_BACKGROUND: true,
            VIDEO_LAYOUT_FIT: 'both',
            filmStripOnly: false,
            VERTICAL_FILMSTRIP: false,
          },
          userInfo: {
            displayName: effectiveName,
          },
        });

        if (disposed) {
          api.dispose();
          return;
        }

        apiRef.current = api;

        // Also ensure the allow attribute on any existing iframe
        // (in case the observer missed it)
        try {
          const iframe = api.getIFrame();
          if (iframe) {
            iframe.setAttribute(
              'allow',
              'camera *; microphone *; display-capture *; autoplay *; clipboard-write *; encrypted-media *',
            );
            iframe.style.border = 'none';
            iframe.style.borderRadius = '8px';
          }
        } catch {
          // iframe may not be ready yet — the observer will handle it
        }

        // ─── Event listeners ───────────
        api.addEventListener('videoConferenceJoined', () => {
          if (disposed) return;
          setIsJoined(true);
          setIsLoading(false);

          // Force tile view so ALL participants are visible (not speaker view)
          api.executeCommand('setTileView', true);

          // After joining, unmute based on user preferences
          // (we started muted to avoid permission errors during init)
          if (!startWithAudioMuted) {
            api.executeCommand('toggleAudio');
          }
          if (!startWithVideoMuted) {
            api.executeCommand('toggleVideo');
          }

          // Sync actual mute states
          api.isAudioMuted().then(setIsAudioMuted);
          api.isVideoMuted().then(setIsVideoMuted);
        });

        api.addEventListener('videoConferenceLeft', () => {
          if (disposed) return;
          setIsJoined(false);
        });

        api.addEventListener('audioMuteStatusChanged', (data: unknown) => {
          if (disposed) return;
          const { muted } = data as { muted: boolean };
          setIsAudioMuted(muted);
        });

        api.addEventListener('videoMuteStatusChanged', (data: unknown) => {
          if (disposed) return;
          const { muted } = data as { muted: boolean };
          setIsVideoMuted(muted);
        });

        api.addEventListener('participantJoined', () => {
          if (disposed) return;
          const count = api.getNumberOfParticipants();
          setParticipantCount(count);
          onParticipantsChanged?.(count);
        });

        api.addEventListener('participantLeft', () => {
          if (disposed) return;
          const count = api.getNumberOfParticipants();
          setParticipantCount(count);
          onParticipantsChanged?.(count);
        });
      } catch (err) {
        if (!disposed) {
          setError(err instanceof Error ? err.message : 'Failed to initialize Jitsi');
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      disposed = true;
      iframeObserver?.disconnect();
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch {
          // ignore dispose errors
        }
        apiRef.current = null;
      }
      setIsJoined(false);
      setParticipantCount(0);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, parentNode]);

  // ─── Controls ───────────
  const toggleAudio = useCallback(() => {
    apiRef.current?.executeCommand('toggleAudio');
  }, []);

  const toggleVideo = useCallback(() => {
    apiRef.current?.executeCommand('toggleVideo');
  }, []);

  const hangup = useCallback(() => {
    apiRef.current?.executeCommand('hangup');
  }, []);

  return {
    isLoading,
    error,
    isJoined,
    isAudioMuted,
    isVideoMuted,
    participantCount,
    toggleAudio,
    toggleVideo,
    hangup,
  };
}
