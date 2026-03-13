'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import { Button, Card, Badge } from '@/components/ui';
import { useRoomStore } from '@/stores/room-store';
import { useAuthStore } from '@/stores/auth-store';
import { getSocket, waitForConnection } from '@/lib/socket';

export default function RoomsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useAuthStore();
  const { rooms, isLoadingRooms, setRooms, setLoadingRooms } = useRoomStore();
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const joinListenersRef = useRef<(() => void) | null>(null);

  // Fetch room list — wait for socket connection
  useEffect(() => {
    let cancelled = false;

    async function fetchRooms() {
      setLoadingRooms(true);
      try {
        const socket = await waitForConnection();
        if (cancelled) return;

        const onList = (data: typeof rooms) => {
          setRooms(data);
          setLoadingRooms(false);
        };

        socket.on('room:list', onList);
        socket.emit('room:list');

        return () => {
          socket.off('room:list', onList);
        };
      } catch {
        if (!cancelled) setLoadingRooms(false);
      }
    }

    let cleanupFn: (() => void) | undefined;
    fetchRooms().then((fn) => { cleanupFn = fn; });

    return () => {
      cancelled = true;
      cleanupFn?.();
    };
  }, [setRooms, setLoadingRooms]);

  // Cleanup join listeners on unmount
  useEffect(() => {
    return () => {
      joinListenersRef.current?.();
    };
  }, []);

  const handleJoinRoom = async (roomCode: string) => {
    try {
      const socket = await waitForConnection();
      const cleanup = () => {
        socket.off('room:state', onState);
        socket.off('room:error', onError);
      };

      const onState = () => {
        cleanup();
        router.push(`/room/${roomCode}`);
      };

      const onError = () => {
        cleanup();
        // Stay on rooms page, user can try another room
      };

      socket.once('room:state', onState);
      socket.once('room:error', onError);
      socket.emit('room:join', { code: roomCode });

      // Fallback timeout — navigate anyway after 3s if no response
      setTimeout(() => {
        cleanup();
        router.push(`/room/${roomCode}`);
      }, 3000);
    } catch {
      router.push(`/room/${roomCode}`);
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim() || isJoining) return;
    setJoinError('');
    setIsJoining(true);

    try {
      const socket = await waitForConnection();
      const code = joinCode.trim().toUpperCase();

      // Clean up previous listeners
      joinListenersRef.current?.();

      const cleanup = () => {
        socket.off('room:state', onState);
        socket.off('room:error', onError);
      };

      const onState = () => {
        cleanup();
        joinListenersRef.current = null;
        setIsJoining(false);
        router.push(`/room/${code}`);
      };

      const onError = (err: { message: string }) => {
        cleanup();
        joinListenersRef.current = null;
        setIsJoining(false);
        setJoinError(err.message || t('lobby.roomNotFound'));
      };

      joinListenersRef.current = cleanup;
      socket.once('room:state', onState);
      socket.once('room:error', onError);
      socket.emit('room:join', { code });

      // Timeout fallback
      setTimeout(() => {
        if (joinListenersRef.current === cleanup) {
          cleanup();
          joinListenersRef.current = null;
          setIsJoining(false);
          setJoinError(t('lobby.roomNotFound'));
        }
      }, 5000);
    } catch {
      setIsJoining(false);
      setJoinError(t('lobby.roomNotFound'));
    }
  };

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="flex items-center gap-1 px-3"
            >
              ← {t('common.home')}
            </Button>
            <div>
              <h1 className="text-3xl font-heading font-bold text-day-text">{t('lobby.title')}</h1>
              <p className="text-day-muted mt-1">
                {t('lobby.welcome', { name: user?.username || t('common.guest') })}
              </p>
            </div>
          </div>
          <Button onClick={() => router.push('/create-room')}>
            {t('lobby.createRoom')}
          </Button>
        </div>

        {/* Join by Code */}
        <Card className="mb-6">
          <h3 className="text-sm font-semibold text-day-text mb-3">{t('lobby.joinByCode')}</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
              placeholder={t('lobby.joinByCodePlaceholder')}
              maxLength={8}
              className="flex-1 px-4 py-2.5 rounded-xl border-2 border-day-border bg-white text-day-text placeholder-day-muted focus:outline-none focus:border-primary transition-colors uppercase tracking-widest font-mono text-center"
              onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
            />
            <Button onClick={handleJoinByCode} disabled={!joinCode.trim()} isLoading={isJoining}>
              {t('lobby.join')}
            </Button>
          </div>
          {joinError && (
            <p className="text-sm text-red-500 mt-2">{joinError}</p>
          )}
        </Card>

        {/* Room List */}
        {isLoadingRooms ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : rooms.length === 0 ? (
          <Card className="text-center py-16">
            <span className="text-5xl block mb-4">🏠</span>
            <h3 className="text-xl font-heading font-semibold text-day-text mb-2">
              {t('lobby.noRooms')}
            </h3>
            <p className="text-day-muted mb-6">{t('lobby.noRoomsDesc')}</p>
            <Button onClick={() => router.push('/create-room')}>
              {t('lobby.createRoom')}
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {rooms.map((room) => (
              <Card
                key={room.id}
                hover
                className="flex items-center justify-between"
                onClick={() => handleJoinRoom(room.code)}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-heading font-semibold text-day-text">
                      {room.code}
                    </h3>
                    <Badge variant={room.status === 'waiting' ? 'success' : 'warning'}>
                      {room.status === 'waiting' ? t('lobby.waiting') : t('lobby.inGame')}
                    </Badge>
                  </div>
                  <p className="text-sm text-day-muted mt-1">
                    {t('lobby.host')}: {room.hostName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-heading font-bold text-day-text">
                    {room.playerCount}/{room.maxPlayers}
                  </p>
                  <p className="text-sm text-day-muted">{t('lobby.players')}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
