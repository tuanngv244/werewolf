'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import { useParams } from 'next/navigation';
import { Button, Card, Badge } from '@/components/ui';
import { useRoomStore } from '@/stores/room-store';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import { waitForConnection, getSocket } from '@/lib/socket';
import { GAME_CONFIG, DEFAULT_ROLES } from '@shared/constants/game-config';
import { Role, Team } from '@shared/types/game.types';
import { ROLE_DEFINITIONS } from '@shared/constants/roles';

// ─── Role emoji mapping ────────────────────────
const ROLE_EMOJI: Record<string, string> = {
  villager: '🏘️', doctor: '💊', gunner: '🔫', seer: '🔮', aura_seer: '✨',
  medium: '👻', witch: '🧙', avenger: '⚔️', beast_hunter: '🪤', cursed: '🌑',
  bodyguard: '🛡️', priest: '✝️', elder: '👴', baker: '🍞', drunk: '🍺',
  mayor: '🎩', pacifist: '☮️', sleepwalker: '😴', hermit: '🏔️', apprentice_seer: '🌟',
  vigilante: '🔫', spy: '🕵️', jailer: '🔒', grave_robber: '⚰️',
  monk: '🙏', lycan: '🌕', vampire: '🧛', cult_leader: '📿',
  werewolf: '🐺', werewolf_shaman: '🐺', alpha_werewolf: '🐺', werewolf_seer: '🐺',
  nightmare_wolf: '🐺', shadow_wolf: '🐺', blood_moon_wolf: '🐺', howler_wolf: '🐺',
  lone_wolf: '🐺', venom_wolf: '🐺', infector_wolf: '🐺', stalker_wolf: '🐺', cursed_wolf: '🐺',
  snow_wolf: '🐺', vegetarian_wolf: '🐺', wolf_fang: '🐺',
  headhunter: '🎯', fool: '🃏', bomber: '💣', serial_killer: '🔪', cupid: '💘',
  arsonist: '🔥', survivor: '🦺', amnesiac: '❓', doppelganger: '🪞', jester: '🤡',
  pirate: '🏴‍☠️', plague_doctor: '🩺', corruptor: '😈',
};

// ─── Group roles by team ────────────────────────
const ALL_ROLES = Object.values(Role);
const VILLAGE_ROLES = ALL_ROLES.filter((r) => ROLE_DEFINITIONS[r].team === Team.VILLAGE && r !== Role.VILLAGER);
const WEREWOLF_ROLES = ALL_ROLES.filter((r) => ROLE_DEFINITIONS[r].team === Team.WEREWOLF);
const SOLO_ROLES = ALL_ROLES.filter((r) => ROLE_DEFINITIONS[r].team === Team.SOLO);

// ─── Role name key from Role enum to camelCase ──
function roleToNameKey(role: Role): string {
  return role.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export default function RoomPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const roomCode = params.code as string;
  const { user } = useAuthStore();
  const { currentRoom, leaveRoom } = useRoomStore();
  const [codeCopied, setCodeCopied] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [rolePickerInitialized, setRolePickerInitialized] = useState(false);
  const hasJoinedRef = useRef(false);
  const settingsDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if we already have the room data (navigated from create-room / rooms page)
    const roomFromStore = useRoomStore.getState().currentRoom;
    if (roomFromStore?.code === roomCode) {
      hasJoinedRef.current = true;
      // Still emit room:join to sync with server (idempotent) — the server
      // will re-send room:state which ensures client and server are in sync
      waitForConnection().then((socket) => {
        socket.emit('room:join', { code: roomCode });
      }).catch(() => {});
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

        const onError = (err: { message: string }) => {
          setJoinError(err.message || t('lobby.roomNotFound'));
        };

        // Use 'once' — the global useSocket handler (SocketEventListener) already
        // listens persistently for 'room:state' and syncs to the store.
        // We only need this one-shot listener to catch initial join errors.
        socket.once('room:error', onError);
        socket.emit('room:join', { code: roomCode });

        return () => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // ── Auto-leave room on unmount (SPA navigation away) ──
  // When the user navigates away from the room page without clicking "Leave"
  // (e.g. browser back, clicking logo), the socket stays connected and the server
  // never fires handleDisconnect. This cleanup ensures the player slot is freed.
  useEffect(() => {
    // Also handle browser tab close / full page navigation
    const handleBeforeUnload = () => {
      if (!hasJoinedRef.current) return;
      const gameId = useGameStore.getState().gameId;
      if (gameId) return;
      try {
        const socket = getSocket();
        if (socket.connected) {
          socket.emit('room:leave');
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Don't leave if a game just started (navigating to game page)
      const gameId = useGameStore.getState().gameId;
      if (gameId) return;

      // Don't leave if we never joined
      if (!hasJoinedRef.current) return;

      // Emit room:leave synchronously on unmount — socket is still alive during SPA nav
      try {
        const socket = getSocket();
        if (socket.connected) {
          socket.emit('room:leave');
        }
      } catch {
        // ignore — socket may not exist
      }
      leaveRoom();
      hasJoinedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize role counts from room settings
  useEffect(() => {
    if (!currentRoom || rolePickerInitialized) return;
    const serverRoles = currentRoom.settings.roles;
    if (serverRoles && serverRoles.length > 0) {
      const counts: Record<string, number> = {};
      for (const role of serverRoles) {
        counts[role] = (counts[role] || 0) + 1;
      }
      setRoleCounts(counts);
    } else {
      // Fallback to defaults based on maxPlayers
      const defaults = DEFAULT_ROLES[currentRoom.settings.maxPlayers as keyof typeof DEFAULT_ROLES] || DEFAULT_ROLES[8];
      const counts: Record<string, number> = {};
      for (const role of defaults) {
        counts[role] = (counts[role] || 0) + 1;
      }
      setRoleCounts(counts);
    }
    setRolePickerInitialized(true);
  }, [currentRoom, rolePickerInitialized]);

  const maxPlayers = currentRoom?.settings.maxPlayers || 8;

  // ── Handle maxPlayers change (host only) ──
  const handleMaxPlayersChange = useCallback(async (newMax: number) => {
    if (!currentRoom || newMax === maxPlayers) return;

    try {
      const socket = await waitForConnection();
      socket.emit('room:settings', { maxPlayers: newMax });
    } catch {
      // ignore
    }

    // Re-adjust role counts if totalRoles exceeds new max
    setRoleCounts((prev) => {
      const currentTotal = Object.values(prev).reduce((sum, c) => sum + c, 0);
      if (currentTotal <= newMax) return prev;

      // Need to trim roles — remove villagers first, then solo, then others
      const next = { ...prev };
      let excess = currentTotal - newMax;

      // Remove villagers first
      if (next[Role.VILLAGER] && excess > 0) {
        const remove = Math.min(next[Role.VILLAGER], excess);
        next[Role.VILLAGER] -= remove;
        if (next[Role.VILLAGER] === 0) delete next[Role.VILLAGER];
        excess -= remove;
      }

      // Then remove solo roles
      if (excess > 0) {
        for (const role of SOLO_ROLES) {
          if (next[role] && excess > 0) {
            const remove = Math.min(next[role], excess);
            next[role] -= remove;
            if (next[role] === 0) delete next[role];
            excess -= remove;
          }
        }
      }

      // Then remove village roles (non-villager)
      if (excess > 0) {
        for (const role of VILLAGE_ROLES) {
          if (next[role] && excess > 0) {
            const remove = Math.min(next[role], excess);
            next[role] -= remove;
            if (next[role] === 0) delete next[role];
            excess -= remove;
          }
        }
      }

      // Finally trim werewolf roles if still over
      if (excess > 0) {
        for (const role of WEREWOLF_ROLES) {
          if (next[role] && excess > 0) {
            const remove = Math.min(next[role], excess);
            next[role] -= remove;
            if (next[role] === 0) delete next[role];
            excess -= remove;
          }
        }
      }

      // Send the adjusted roles to server (pad with villagers to newMax)
      const roles: Role[] = [];
      for (const [r, c] of Object.entries(next)) {
        for (let i = 0; i < c; i++) {
          roles.push(r as Role);
        }
      }
      while (roles.length < newMax) {
        roles.push(Role.VILLAGER);
      }
      // Emit directly instead of using sendRoleUpdate (which pads to old maxPlayers)
      waitForConnection().then((socket) => {
        socket.emit('room:settings', { roles });
      }).catch(() => {});

      return next;
    });
  }, [currentRoom, maxPlayers]);

  // Calculate total roles selected
  const totalRoles = useMemo(() => {
    return Object.values(roleCounts).reduce((sum, c) => sum + c, 0);
  }, [roleCounts]);

  // Build roles array from counts
  const selectedRoles = useMemo(() => {
    const roles: Role[] = [];
    for (const [role, count] of Object.entries(roleCounts)) {
      for (let i = 0; i < count; i++) {
        roles.push(role as Role);
      }
    }
    return roles;
  }, [roleCounts]);

  // Team counts
  const teamCounts = useMemo(() => {
    const counts = { village: 0, werewolf: 0, solo: 0 };
    for (const [role, count] of Object.entries(roleCounts)) {
      const def = ROLE_DEFINITIONS[role as Role];
      if (def) {
        if (def.team === Team.VILLAGE) counts.village += count;
        else if (def.team === Team.WEREWOLF) counts.werewolf += count;
        else counts.solo += count;
      }
    }
    return counts;
  }, [roleCounts]);

  // Send updated roles to server (debounced)
  const sendRoleUpdate = useCallback(async (roles: Role[]) => {
    if (settingsDebounceRef.current) {
      clearTimeout(settingsDebounceRef.current);
    }
    settingsDebounceRef.current = setTimeout(async () => {
      try {
        // Pad with villagers if needed
        const paddedRoles = [...roles];
        while (paddedRoles.length < maxPlayers) {
          paddedRoles.push(Role.VILLAGER);
        }
        const socket = await waitForConnection();
        socket.emit('room:settings', { roles: paddedRoles });
      } catch {
        // ignore
      }
    }, 300);
  }, [maxPlayers]);

  const adjustRole = useCallback((role: Role, delta: number) => {
    const def = ROLE_DEFINITIONS[role];
    setRoleCounts((prev) => {
      const current = prev[role] || 0;
      const newCount = Math.max(0, current + delta);
      const currentTotal = Object.values(prev).reduce((sum, c) => sum + c, 0);

      // Unique roles can only have 0 or 1
      if (def.isUnique && newCount > 1) return prev;
      // Non-unique can have up to 5
      if (!def.isUnique && newCount > 5) return prev;
      // Don't exceed max players
      if (delta > 0 && currentTotal >= maxPlayers) return prev;

      const next = { ...prev };
      if (newCount === 0) {
        delete next[role];
      } else {
        next[role] = newCount;
      }

      // Build new roles array and send to server
      const roles: Role[] = [];
      for (const [r, c] of Object.entries(next)) {
        for (let i = 0; i < c; i++) {
          roles.push(r as Role);
        }
      }
      sendRoleUpdate(roles);

      return next;
    });
  }, [maxPlayers, sendRoleUpdate]);

  const resetToDefault = useCallback(() => {
    const defaults = DEFAULT_ROLES[maxPlayers as keyof typeof DEFAULT_ROLES] || DEFAULT_ROLES[8];
    const counts: Record<string, number> = {};
    for (const role of defaults) {
      counts[role] = (counts[role] || 0) + 1;
    }
    setRoleCounts(counts);
    sendRoleUpdate(defaults);
  }, [maxPlayers, sendRoleUpdate]);

  const handleLeave = async () => {
    try {
      const socket = await waitForConnection();
      // Wait for the server to acknowledge the leave before navigating away.
      // Without this, the browser navigates and disconnects the socket before
      // the server processes 'room:leave', causing a 15s ghost player.
      await new Promise<void>((resolve) => {
        socket.once('room:left', () => resolve());
        socket.emit('room:leave');
        // Safety timeout — navigate anyway after 2s if server doesn't respond
        setTimeout(resolve, 2000);
      });
    } catch {
      // ignore
    }
    leaveRoom();
    hasJoinedRef.current = false;
    router.push('/rooms');
  };

  const handleKickPlayer = async (playerId: string) => {
    try {
      const socket = await waitForConnection();
      socket.emit('room:kick', { playerId });
    } catch {
      // ignore
    }
  };

  const handleStartGame = async () => {
    try {
      const socket = await waitForConnection();
      socket.emit('game:start');
    } catch {
      // ignore
    }
  };

  const handleDeleteRoom = async () => {
    try {
      const socket = await waitForConnection();
      socket.emit('room:delete');
    } catch {
      // ignore
    }
    leaveRoom();
    hasJoinedRef.current = false;
    router.push('/rooms');
  };

  // Reset hasJoinedRef when unmounting so re-navigating to this room works
  useEffect(() => {
    return () => {
      hasJoinedRef.current = false;
      if (settingsDebounceRef.current) {
        clearTimeout(settingsDebounceRef.current);
      }
    };
  }, []);

  const isHost = currentRoom?.hostId === user?.id;
  const canStart = currentRoom && currentRoom.players.length >= 6;

  const renderRoleRow = (role: Role) => {
    const count = roleCounts[role] || 0;
    const nameKey = roleToNameKey(role);
    const emoji = ROLE_EMOJI[role] || '❓';
    const def = ROLE_DEFINITIONS[role];
    const teamColor = def.team === Team.VILLAGE
      ? 'text-green-600'
      : def.team === Team.WEREWOLF
        ? 'text-red-600'
        : 'text-purple-600';

    return (
      <div key={role} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-day-card/50 transition-colors">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg flex-shrink-0">{emoji}</span>
          <div className="min-w-0">
            <span className={`text-sm font-medium ${teamColor} truncate block`}>
              {t(`roles.${nameKey}`)}
            </span>
          </div>
        </div>
        {isHost ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              className="w-7 h-7 rounded-lg bg-day-card hover:bg-day-border text-day-text font-bold text-sm transition-colors flex items-center justify-center"
              onClick={() => adjustRole(role, -1)}
              disabled={count === 0}
            >
              −
            </button>
            <span className={`w-6 text-center text-sm font-bold ${count > 0 ? 'text-day-text' : 'text-day-muted'}`}>
              {count}
            </span>
            <button
              className="w-7 h-7 rounded-lg bg-day-card hover:bg-day-border text-day-text font-bold text-sm transition-colors flex items-center justify-center"
              onClick={() => adjustRole(role, 1)}
              disabled={totalRoles >= maxPlayers}
            >
              +
            </button>
          </div>
        ) : (
          <span className={`text-sm font-bold ${count > 0 ? 'text-day-text' : 'text-day-muted'}`}>
            {count > 0 ? `×${count}` : '—'}
          </span>
        )}
      </div>
    );
  };

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentRoom.players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  player.isConnected ? 'bg-day-card' : 'bg-day-card/50 opacity-60'
                }`}
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-lg">👤</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-day-text truncate">{player.username}</p>
                  <div className="flex items-center gap-1">
                    {player.id === currentRoom.hostId && (
                      <Badge variant="info">{t('lobby.host')}</Badge>
                    )}
                    {!player.isConnected && (
                      <span className="text-xs text-day-muted italic">disconnected</span>
                    )}
                  </div>
                </div>
                {player.isReady && (
                  <span className="text-status-alive text-lg">✓</span>
                )}
                {isHost && player.id !== currentRoom.hostId && (
                  <button
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    onClick={() => handleKickPlayer(player.id)}
                    title={t('lobby.kickPlayer')}
                  >
                    ✕
                  </button>
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

        {/* Game Slots (Max Players) — host only */}
        {isHost && (
          <Card className="mb-6">
            <h2 className="text-lg font-heading font-semibold text-day-text mb-3 flex items-center gap-2">
              <span>👥</span> {t('lobby.maxPlayers')}
            </h2>
            <div className="flex gap-2 flex-wrap">
              {Array.from(
                { length: GAME_CONFIG.MAX_PLAYERS - GAME_CONFIG.MIN_PLAYERS + 1 },
                (_, i) => i + GAME_CONFIG.MIN_PLAYERS,
              ).map((n) => (
                <button
                  key={n}
                  className={`w-10 h-10 rounded-xl font-heading font-semibold transition-all ${
                    maxPlayers === n
                      ? 'bg-primary text-white shadow-md'
                      : n < currentRoom.players.length
                        ? 'bg-day-card/50 text-day-muted cursor-not-allowed'
                        : 'bg-day-card text-day-text hover:bg-day-border'
                  }`}
                  onClick={() => handleMaxPlayersChange(n)}
                  disabled={n < currentRoom.players.length}
                  title={n < currentRoom.players.length ? t('lobby.needMorePlayers') : undefined}
                >
                  {n}
                </button>
              ))}
            </div>
            {currentRoom.players.length > 0 && (
              <p className="text-xs text-day-muted mt-2">
                {currentRoom.players.length}/{maxPlayers} {t('lobby.players')}
              </p>
            )}
          </Card>
        )}

        {/* Role Setup Section */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-heading font-semibold text-day-text flex items-center gap-2">
              <span>🎭</span> {t('lobby.roleSetup')}
            </h2>
            <button
              className="text-xs text-primary hover:text-primary/80 font-medium"
              onClick={() => setShowRolePicker(!showRolePicker)}
            >
              {showRolePicker ? t('common.close') : t('lobby.roleSetupDesc')}
            </button>
          </div>

          {/* Role summary bar */}
          <div className="flex items-center gap-3 text-xs mb-2">
            <span className="text-green-600 font-medium">🏘️ {teamCounts.village}</span>
            <span className="text-red-600 font-medium">🐺 {teamCounts.werewolf}</span>
            <span className="text-purple-600 font-medium">⭐ {teamCounts.solo}</span>
            <span className="ml-auto text-day-muted font-medium">
              {t('lobby.totalRoles', { count: totalRoles, max: maxPlayers })}
            </span>
          </div>

          {/* Role Picker (expandable) */}
          {showRolePicker && (
            <div className="border-2 border-day-border rounded-xl p-3 space-y-3 max-h-[50vh] overflow-y-auto">
              {/* Reset button (host only) */}
              {isHost && (
                <div className="flex justify-end">
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={resetToDefault}
                  >
                    {t('lobby.useDefault')}
                  </button>
                </div>
              )}

              {/* Village Team */}
              <div>
                <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  🏘️ {t('lobby.villageTeam')}
                </h3>
                <div className="space-y-0.5">
                  {VILLAGE_ROLES.map(renderRoleRow)}
                  {renderRoleRow(Role.VILLAGER)}
                </div>
              </div>

              {/* Werewolf Team */}
              <div>
                <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  🐺 {t('lobby.werewolfTeam')}
                </h3>
                <div className="space-y-0.5">
                  {WEREWOLF_ROLES.map(renderRoleRow)}
                </div>
              </div>

              {/* Solo Team */}
              <div>
                <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  ⭐ {t('lobby.soloTeam')}
                </h3>
                <div className="space-y-0.5">
                  {SOLO_ROLES.map(renderRoleRow)}
                </div>
              </div>
            </div>
          )}
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
            <>
              <Button
                className="flex-1"
                size="lg"
                onClick={handleStartGame}
                disabled={!canStart}
              >
                {canStart ? t('lobby.startGame') : t('lobby.needMorePlayers')}
              </Button>
              <Button
                size="lg"
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                🗑️ {t('lobby.deleteRoom')}
              </Button>
            </>
          ) : (
            <Button className="flex-1" size="lg" variant="secondary">
              {t('lobby.waitingForHost')}
            </Button>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Card className="max-w-sm w-full mx-4 text-center">
              <span className="text-4xl block mb-3">⚠️</span>
              <h3 className="text-lg font-heading font-semibold text-day-text mb-2">
                {t('lobby.deleteRoom')}
              </h3>
              <p className="text-sm text-day-muted mb-6">
                {t('lobby.deleteRoomConfirm')}
              </p>
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  className="flex-1"
                  variant="danger"
                  onClick={handleDeleteRoom}
                >
                  {t('lobby.deleteRoom')}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
