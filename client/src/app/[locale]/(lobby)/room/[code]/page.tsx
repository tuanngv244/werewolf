'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import { useParams } from 'next/navigation';
import { Button, Card, Badge } from '@/components/ui';
import { useRoomStore } from '@/stores/room-store';
import { useAuthStore } from '@/stores/auth-store';
import { waitForConnection } from '@/lib/socket';

export default function RoomPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const roomCode = params.code as string;
  const { user } = useAuthStore();
  const { currentRoom, setCurrentRoom, leaveRoom } = useRoomStore();
  const [codeCopied, setCodeCopied] = useState(false);
  const [joinError, setJoinError] = useState('');
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    // If we already have the room data (navigated from rooms page / home page
    // which already called room:join and received room:state), skip re-joining
    if (currentRoom?.code === roomCode) {
      hasJoinedRef.current = true;
      return;
    }

    // Only emit room:join if we haven't already joined this room
    if (hasJoinedRef.current) return;

    let cancelled = false;

    async function joinRoom() {
      try {
        const socket = await waitForConnection();
        if (cancelled || hasJoinedRef.current) return;

        hasJoinedRef.current = true;

        const onState = (room: any) => {
          setCurrentRoom(room);
        };

        const onError = (err: { message: string }) => {
          setJoinError(err.message || t('lobby.roomNotFound'));
        };

        socket.on('room:state', onState);
        socket.once('room:error', onError);
        socket.emit('room:join', { code: roomCode });

        return () => {
          socket.off('room:state', onState);
          socket.off('room:error', onError);
        };
      } catch {
        if (!cancelled) {
          setJoinError(t('lobby.roomNotFound'));
        }
      }
    }

    let cleanupFn: (() => void) | undefined;
    joinRoom().then((fn) => { cleanupFn = fn; });

    return () => {
      cancelled = true;
      cleanupFn?.();
    };
  }, [roomCode, currentRoom, setCurrentRoom, t]);

  const handleLeave = async () => {
    try {
      const socket = await waitForConnection();
      socket.emit('room:leave');
    } catch {
      // ignore
    }
    leaveRoom();
    hasJoinedRef.current = false;
    router.push('/rooms');
  };

  const handleStartGame = async () => {
    try {
      const socket = await waitForConnection();
      socket.emit('game:start');
    } catch {
      // ignore
    }
  };

  const isHost = currentRoom?.hostId === user?.id;
  const canStart = currentRoom && currentRoom.players.length >= 6;

  if (joinError) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <Card className="text-center py-12 max-w-md w-full">
          <span className="text-5xl block mb-4">😕</span>
          <h3 className="text-xl font-heading font-semibold text-day-text mb-2">
            {t('lobby.roomNotFound')}
          </h3>
          <p className="text-day-muted mb-6">{joinError}</p>
          <Button onClick={() => router.push('/rooms')}>
            {t('common.back')}
          </Button>
        </Card>
      </main>
    );
  }

  if (!currentRoom) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Room Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-heading font-bold text-day-text">
                {t('lobby.room')} {currentRoom.code}
              </h1>
              <Badge variant="success">{t('lobby.waiting')}</Badge>
            </div>
            <p className="text-day-muted mt-1">
              {currentRoom.players.length}/{currentRoom.settings.maxPlayers} {t('lobby.players')}
            </p>
          </div>
          <Button variant="ghost" onClick={handleLeave}>
            {t('lobby.leave')}
          </Button>
        </div>

        {/* Player List */}
        <Card className="mb-6">
          <h2 className="text-lg font-heading font-semibold text-day-text mb-4">
            {t('lobby.players')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {currentRoom.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 p-3 bg-day-card rounded-xl"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-lg">👤</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-day-text truncate">{player.username}</p>
                  {player.id === currentRoom.hostId && (
                    <Badge variant="info">{t('lobby.host')}</Badge>
                  )}
                </div>
                {player.isReady && (
                  <span className="text-status-alive text-lg">✓</span>
                )}
              </div>
            ))}

            {/* Empty slots */}
            {Array.from(
              { length: currentRoom.settings.maxPlayers - currentRoom.players.length },
              (_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center justify-center p-3 bg-day-card/50 rounded-xl border-2 border-dashed border-day-border"
                >
                  <span className="text-day-muted text-sm">{t('lobby.emptySlot')}</span>
                </div>
              ),
            )}
          </div>
        </Card>

        {/* Invite Section */}
        <Card className="mb-6">
          <h2 className="text-lg font-heading font-semibold text-day-text mb-3 flex items-center gap-2">
            <span>📨</span> {t('lobby.invitePlayers')}
          </h2>
          <p className="text-sm text-day-muted mb-3">{t('lobby.shareCode')}</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-day-card border-2 border-day-border rounded-xl px-4 py-3 text-center">
              <span className="text-2xl font-mono font-bold tracking-[0.3em] text-day-text select-all">
                {currentRoom.code}
              </span>
            </div>
            <Button
              variant={codeCopied ? 'secondary' : 'primary'}
              onClick={() => {
                const text = currentRoom.code;
                if (navigator.clipboard?.writeText) {
                  navigator.clipboard.writeText(text).catch(() => {});
                } else {
                  // Fallback for non-HTTPS (e.g. LAN)
                  const ta = document.createElement('textarea');
                  ta.value = text;
                  ta.style.position = 'fixed';
                  ta.style.opacity = '0';
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand('copy');
                  document.body.removeChild(ta);
                }
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 2000);
              }}
            >
              {codeCopied ? t('lobby.codeCopied') : t('lobby.copyCode')}
            </Button>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          {isHost ? (
            <Button
              className="flex-1"
              size="lg"
              onClick={handleStartGame}
              disabled={!canStart}
            >
              {canStart ? t('lobby.startGame') : t('lobby.needMorePlayers')}
            </Button>
          ) : (
            <Button className="flex-1" size="lg" variant="secondary">
              {t('lobby.waitingForHost')}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
