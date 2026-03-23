'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useVideoMeet } from '@/hooks/useVideoMeet';
import { useRoomStore } from '@/stores/room-store';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui';

// ─── Types ──────────────────────────────
interface VideoMeetPanelProps {
  /** Room code for the meeting */
  roomCode: string | null;
  /** Display name for the current user */
  displayName?: string;
  /** Use night theme styling */
  isNight?: boolean;
}

// ─── Video Tile ──────────────────────────────
function VideoTile({
  stream,
  label,
  isMuted,
  isSelf,
  isNight,
  isSoundMuted,
  isVideoOff,
}: {
  stream: MediaStream | null;
  label: string;
  isMuted?: boolean;
  isSelf?: boolean;
  isNight: boolean;
  isSoundMuted?: boolean;
  isVideoOff?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) {
      setHasVideoTrack(false);
      return;
    }
    video.srcObject = stream;

    const checkTracks = () => {
      const active = stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');
      setHasVideoTrack(active);
    };
    checkTracks();

    // Use track events instead of polling — much more efficient
    const onTrackEvent = () => checkTracks();
    stream.addEventListener('addtrack', onTrackEvent);
    stream.addEventListener('removetrack', onTrackEvent);

    // Listen for track mute/unmute events (covers enabled toggle)
    const videoTracks = stream.getVideoTracks();
    for (const track of videoTracks) {
      track.addEventListener('mute', onTrackEvent);
      track.addEventListener('unmute', onTrackEvent);
      track.addEventListener('ended', onTrackEvent);
    }

    // Single slower fallback interval (2s instead of 500ms) for edge cases only
    const interval = setInterval(checkTracks, 2000);

    return () => {
      video.srcObject = null;
      stream.removeEventListener('addtrack', onTrackEvent);
      stream.removeEventListener('removetrack', onTrackEvent);
      for (const track of videoTracks) {
        track.removeEventListener('mute', onTrackEvent);
        track.removeEventListener('unmute', onTrackEvent);
        track.removeEventListener('ended', onTrackEvent);
      }
      clearInterval(interval);
    };
  }, [stream]);

  const showVideo = hasVideoTrack && !isVideoOff;

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden',
        isNight ? 'bg-night-bg/80' : 'bg-gray-800',
      )}
      style={{ width: 80, height: 80 }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf || isSoundMuted || isMuted}
        className={cn('w-full h-full object-cover', !showVideo && 'hidden')}
      />
      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
              isNight ? 'bg-night-border/50 text-night-text' : 'bg-gray-600 text-white',
            )}
          >
            {label.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
        <span className="text-[8px] text-white truncate block leading-tight">
          {isSelf ? 'You' : label}
        </span>
      </div>
      {isMuted && (
        <div className="absolute top-0.5 right-0.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="red"
            strokeWidth="2.5"
            className="w-2.5 h-2.5"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────
export const JitsiMeetPanel = React.memo(function JitsiMeetPanel({
  roomCode,
  displayName,
  isNight = false,
}: VideoMeetPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const players = useRoomStore((s) => s.currentRoom?.players ?? []);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const currentUsername = displayName || useAuthStore((s) => s.user?.username) || 'You';

  // Video meeting
  const {
    localStream,
    remoteStreams,
    isAudioMuted,
    isVideoMuted,
    isSoundMuted,
    isJoined,
    error,
    join,
    toggleAudio,
    toggleVideo,
    toggleSound,
    hangup,
  } = useVideoMeet(roomCode);

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Handle join button
  const handleJoin = useCallback(() => {
    join();
  }, [join]);

  // Build participant list
  const participants = players.map((p) => ({
    id: p.id,
    username: p.username,
    isSelf: p.id === currentUserId,
    stream: p.id === currentUserId ? localStream : (remoteStreams.get(p.id) ?? null),
    isConnected: p.isConnected,
  }));

  const maxCols = 4;
  const tileSize = 80;
  const gap = 4;
  const cols = Math.min(Math.max(1, participants.length), maxCols);
  const gridWidthPx = cols * tileSize + (cols - 1) * gap;

  return (
    <div className="relative pointer-events-auto" ref={panelRef}>
      {/* Toggle button — styled like RoleListButton */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all backdrop-blur-xl border',
          isNight
            ? 'bg-night-card/70 border-night-border/50 text-night-text hover:bg-night-card/90'
            : 'bg-white/70 border-day-border/50 text-day-text hover:bg-white/90',
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3.5 h-3.5"
        >
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
        <span>Meeting</span>
        {isJoined && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
        <Badge variant={isNight ? 'warning' : 'info'}>{participants.length}</Badge>
        <span className="text-[10px]">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div
            className={cn(
              'absolute top-full mt-2 left-0 z-50 rounded-xl border backdrop-blur-xl shadow-xl',
              isNight
                ? 'bg-night-card/95 border-night-border/60 text-night-text'
                : 'bg-white/95 border-day-border/60 text-day-text',
            )}
            style={{ width: Math.max(gridWidthPx + 16, 160) }}
          >
            {/* Error banner */}
            {error && (
              <div className="px-2 py-1 bg-red-500/10 border-b border-red-500/20 rounded-t-xl">
                <span className="text-[9px] text-red-400">{error}</span>
              </div>
            )}

            {/* Join button — shown when not yet joined */}
            {!isJoined && (
              <div className="p-3 flex flex-col items-center gap-2">
                <p
                  className={cn(
                    'text-[10px] text-center',
                    isNight ? 'text-night-muted' : 'text-gray-500',
                  )}
                >
                  Join to voice/video chat
                </p>
                <button
                  onClick={handleJoin}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    'bg-green-500/80 text-white hover:bg-green-600',
                  )}
                >
                  🎤 Join Meeting
                </button>
              </div>
            )}

            {/* Video grid — only shown when joined */}
            {isJoined && (
              <>
                <div
                  className={cn('p-2 overflow-y-auto')}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, ${tileSize}px)`,
                    gap: `${gap}px`,
                    maxHeight: 3 * tileSize + 2 * gap + 16,
                  }}
                >
                  {participants.map((p) => (
                    <VideoTile
                      key={p.id}
                      stream={p.stream}
                      label={p.isSelf ? currentUsername : p.username}
                      isMuted={p.isSelf ? isAudioMuted : false}
                      isSelf={p.isSelf}
                      isNight={isNight}
                      isSoundMuted={!p.isSelf && isSoundMuted}
                      isVideoOff={p.isSelf ? isVideoMuted : false}
                    />
                  ))}
                </div>

                {/* Controls */}
                <div
                  className={cn(
                    'flex items-center justify-center gap-2 px-2 py-1.5 border-t rounded-b-xl',
                    isNight
                      ? 'bg-night-bg/40 border-night-border/30'
                      : 'bg-gray-100/60 border-day-border/30',
                  )}
                >
                  {/* Mic toggle */}
                  <button
                    onClick={toggleAudio}
                    disabled={!isJoined}
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center transition-all',
                      !isJoined
                        ? 'opacity-30 cursor-not-allowed'
                        : isAudioMuted
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30',
                    )}
                    title={isAudioMuted ? 'Unmute mic' : 'Mute mic'}
                  >
                    {isAudioMuted ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .67-.1 1.32-.27 1.93" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    )}
                  </button>

                  {/* Sound toggle */}
                  <button
                    onClick={toggleSound}
                    disabled={!isJoined}
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center transition-all',
                      !isJoined
                        ? 'opacity-30 cursor-not-allowed'
                        : isSoundMuted
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30',
                    )}
                    title={isSoundMuted ? 'Unmute sound' : 'Mute sound'}
                  >
                    {isSoundMuted ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                    )}
                  </button>

                  {/* Camera toggle */}
                  <button
                    onClick={toggleVideo}
                    disabled={!isJoined}
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center transition-all',
                      !isJoined
                        ? 'opacity-30 cursor-not-allowed'
                        : isVideoMuted
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30',
                    )}
                    title={isVideoMuted ? 'Turn on camera' : 'Turn off camera'}
                  >
                    {isVideoMuted ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                    )}
                  </button>

                  {/* Hang up */}
                  <button
                    onClick={() => {
                      hangup();
                      setIsOpen(false);
                    }}
                    disabled={!isJoined}
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center transition-all',
                      !isJoined
                        ? 'opacity-30 cursor-not-allowed'
                        : 'bg-red-500/80 text-white hover:bg-red-600',
                    )}
                    title="Leave meeting"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3.5 h-3.5"
                    >
                      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 2.59 3.4z" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
});
