'use client';

import React from 'react';
import { useVoiceStore } from '@/stores/voice-store';
import { useGameStore } from '@/stores/game-store';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

/**
 * Voice chat controls — two icon buttons for listen and mic toggle.
 * Dead players can only listen, mic is disabled.
 */
export const VoiceControls = React.memo(function VoiceControls({
  isNight,
}: {
  isNight: boolean;
}) {
  const t = useTranslations();
  const isMicOn = useVoiceStore((s) => s.isMicOn);
  const isListening = useVoiceStore((s) => s.isListening);
  const isMicAllowed = useVoiceStore((s) => s.isMicAllowed);
  const toggleMic = useVoiceStore((s) => s.toggleMic);
  const toggleListening = useVoiceStore((s) => s.toggleListening);
  const isAlive = useGameStore((s) => s.isAlive);

  const canUseMic = isAlive && isMicAllowed;

  return (
    <div className="flex gap-1.5">
      {/* Listen toggle */}
      <button
        type="button"
        onClick={toggleListening}
        title={isListening ? t('voice.muteSound') : t('voice.unmuteSound')}
        className={cn(
          'relative w-9 h-9 rounded-lg flex items-center justify-center transition-all text-sm',
          'focus:outline-none focus:ring-1 focus:ring-primary',
          isListening
            ? isNight
              ? 'bg-night-bg/60 border border-night-border/50 text-night-text hover:bg-night-bg/80'
              : 'bg-white/60 border border-day-border/50 text-day-text hover:bg-white/80'
            : 'bg-danger/20 border border-danger/40 text-danger hover:bg-danger/30',
        )}
      >
        {isListening ? (
          // Speaker on icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        ) : (
          // Speaker off icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        )}
      </button>

      {/* Mic toggle */}
      <button
        type="button"
        onClick={canUseMic ? toggleMic : undefined}
        title={
          !isMicAllowed
            ? t('voice.micBlocked')
            : !isAlive
              ? t('voice.deadCantTalk')
              : isMicOn
                ? t('voice.muteMic')
                : t('voice.unmuteMic')
        }
        disabled={!canUseMic}
        className={cn(
          'relative w-9 h-9 rounded-lg flex items-center justify-center transition-all text-sm',
          'focus:outline-none focus:ring-1 focus:ring-primary',
          !canUseMic
            ? 'opacity-40 cursor-not-allowed bg-gray-500/20 border border-gray-500/30 text-gray-400'
            : isMicOn
              ? 'bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30'
              : isNight
                ? 'bg-night-bg/60 border border-night-border/50 text-night-muted hover:bg-night-bg/80'
                : 'bg-white/60 border border-day-border/50 text-day-muted hover:bg-white/80',
        )}
      >
        {isMicOn && canUseMic ? (
          // Mic on icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        ) : (
          // Mic off icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .67-.1 1.32-.27 1.93" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
        {/* Active mic indicator dot */}
        {isMicOn && canUseMic && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
        )}
      </button>
    </div>
  );
});
