'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import { Button, Card } from '@/components/ui';
import { waitForConnection } from '@/lib/socket';
import { useRoomStore } from '@/stores/room-store';
import { GAME_CONFIG, DEFAULT_ROLES } from '@shared/constants/game-config';
import { Role, Team } from '@shared/types/game.types';
import { ROLE_DEFINITIONS } from '@shared/constants/roles';

// ─── Role emoji mapping ────────────────────────
const ROLE_EMOJI: Record<string, string> = {
  villager: '🏘️', doctor: '💊', gunner: '🔫', seer: '🔮', aura_seer: '✨',
  medium: '👻', witch: '🧙', avenger: '⚔️', beast_hunter: '🪤', cursed: '🌑',
  bodyguard: '🛡️', priest: '✝️', elder: '👴', baker: '🍞', drunk: '🍺',
  mayor: '🎩', pacifist: '☮️', sleepwalker: '😴', hermit: '🏔️', apprentice_seer: '🌟',
  werewolf: '🐺', werewolf_shaman: '🐺', alpha_werewolf: '🐺', werewolf_seer: '🐺',
  nightmare_wolf: '🐺', shadow_wolf: '🐺', blood_moon_wolf: '🐺', howler_wolf: '🐺',
  lone_wolf: '🐺', venom_wolf: '🐺',
  headhunter: '🎯', fool: '🃏', bomber: '💣', serial_killer: '🔪', cupid: '💘',
  arsonist: '🔥', survivor: '🦺', amnesiac: '❓', doppelganger: '🪞', jester: '🤡',
};

// ─── Group roles by team ────────────────────────
const ALL_ROLES = Object.values(Role);
const VILLAGE_ROLES = ALL_ROLES.filter((r) => ROLE_DEFINITIONS[r].team === Team.VILLAGE && r !== Role.VILLAGER);
const WEREWOLF_ROLES = ALL_ROLES.filter((r) => ROLE_DEFINITIONS[r].team === Team.WEREWOLF);
const SOLO_ROLES = ALL_ROLES.filter((r) => ROLE_DEFINITIONS[r].team === Team.SOLO);

// ─── Role name key from Role enum to camelCase ──
function roleToNameKey(role: Role): string {
  // Convert 'alpha_werewolf' to 'alphaWerewolf'
  return role.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export default function CreateRoomPage() {
  const t = useTranslations();
  const router = useRouter();
  const { setCurrentRoom } = useRoomStore();

  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const cleanupRef = useRef<(() => void) | null>(null);

  // Initialize with default roles when maxPlayers changes
  useEffect(() => {
    const defaults = DEFAULT_ROLES[maxPlayers as keyof typeof DEFAULT_ROLES] || DEFAULT_ROLES[8];
    const counts: Record<string, number> = {};
    for (const role of defaults) {
      counts[role] = (counts[role] || 0) + 1;
    }
    setRoleCounts(counts);
  }, [maxPlayers]);

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

  const adjustRole = (role: Role, delta: number) => {
    const def = ROLE_DEFINITIONS[role];
    const current = roleCounts[role] || 0;
    const newCount = Math.max(0, current + delta);

    // Unique roles can only have 0 or 1
    if (def.isUnique && newCount > 1) return;
    // Non-unique (werewolf, villager) can have more
    if (!def.isUnique && newCount > 5) return;
    // Don't exceed max players
    if (delta > 0 && totalRoles >= maxPlayers) return;

    setRoleCounts((prev) => {
      const next = { ...prev };
      if (newCount === 0) {
        delete next[role];
      } else {
        next[role] = newCount;
      }
      return next;
    });
  };

  const resetToDefault = () => {
    const defaults = DEFAULT_ROLES[maxPlayers as keyof typeof DEFAULT_ROLES] || DEFAULT_ROLES[8];
    const counts: Record<string, number> = {};
    for (const role of defaults) {
      counts[role] = (counts[role] || 0) + 1;
    }
    setRoleCounts(counts);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);

  const handleCreate = async () => {
    setIsCreating(true);
    setError('');

    try {
      const socket = await waitForConnection();
      // Use selected roles, pad with Villager if needed
      const roles = [...selectedRoles];
      while (roles.length < maxPlayers) {
        roles.push(Role.VILLAGER);
      }

      // Cleanup previous listeners
      cleanupRef.current?.();

      const cleanup = () => {
        socket.off('room:created', onCreated);
        socket.off('room:error', onError);
      };

      const onCreated = (room: any) => {
        cleanup();
        cleanupRef.current = null;
        setCurrentRoom(room);
        setIsCreating(false);
        router.push(`/room/${room.code}`);
      };

      const onError = (err: { message: string }) => {
        cleanup();
        cleanupRef.current = null;
        setIsCreating(false);
        setError(err.message || 'Failed to create room');
      };

      cleanupRef.current = cleanup;
      socket.once('room:created', onCreated);
      socket.once('room:error', onError);

      socket.emit('room:create', {
        maxPlayers,
        isPrivate,
        roles,
      });

      // Timeout fallback
      setTimeout(() => {
        if (cleanupRef.current === cleanup) {
          cleanup();
          cleanupRef.current = null;
          setIsCreating(false);
          setError('Connection timeout. Please try again.');
        }
      }, 5000);
    } catch {
      setIsCreating(false);
      setError('Failed to connect. Please try again.');
    }
  };

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
      </div>
    );
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-lg">
        <h1 className="text-2xl font-heading font-bold text-day-text mb-6">
          {t('lobby.createRoom')}
        </h1>

        <div className="space-y-6">
          {/* Max Players */}
          <div>
            <label className="block text-sm font-semibold text-day-text mb-2">
              {t('lobby.maxPlayers')}
            </label>
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
                      : 'bg-day-card text-day-text hover:bg-day-border'
                  }`}
                  onClick={() => setMaxPlayers(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Private Room */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-day-text">{t('lobby.privateRoom')}</p>
              <p className="text-sm text-day-muted">{t('lobby.privateRoomDesc')}</p>
            </div>
            <button
              className={`w-12 h-7 rounded-full transition-colors ${
                isPrivate ? 'bg-primary' : 'bg-day-border'
              }`}
              onClick={() => setIsPrivate(!isPrivate)}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  isPrivate ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Role Setup Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-day-text">
                {t('lobby.roleSetup')}
              </label>
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
                {/* Reset button */}
                <div className="flex justify-end">
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={resetToDefault}
                  >
                    {t('lobby.useDefault')}
                  </button>
                </div>

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
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" className="flex-1" onClick={() => router.back()}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1" onClick={handleCreate} isLoading={isCreating}>
              {t('lobby.createRoom')}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-500 mt-2 text-center">{error}</p>
          )}
        </div>
      </Card>
    </main>
  );
}
