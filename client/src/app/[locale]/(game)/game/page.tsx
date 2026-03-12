'use client';

import { useTranslations } from 'next-intl';
import { useGameStore } from '@/stores/game-store';
import type { DeathLogEntry } from '@/stores/game-store';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useCountdown } from '@/hooks/useCountdown';
import { useSocket, useEmit } from '@/hooks/useSocket';
import { useGameSounds } from '@/hooks/useGameSounds';
import { playSound } from '@/lib/sounds';
import { useUiStore } from '@/stores/ui-store';
import { GamePhase, Role, Team } from '@shared/types/game.types';
import { isWerewolfRole } from '@shared/constants/roles';
import { Button, Badge } from '@/components/ui';
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useRouter } from '@/lib/navigation';
import dynamic from 'next/dynamic';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { VoiceControls } from '@/components/game/VoiceControls';
import { useRoomStore } from '@/stores/room-store';

// Convert snake_case role to camelCase i18n key: 'alpha_werewolf' -> 'alphaWerewolf'
function roleToCamel(role: string): string {
  return role.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// Lazy load 3D components (no SSR)
const ForestScene = dynamic(
  () => import('@/components/3d/ForestScene').then((m) => ({ default: m.ForestScene })),
  { ssr: false },
);
const PlayerCircle = dynamic(
  () => import('@/components/3d/PlayerCircle').then((m) => ({ default: m.PlayerCircle })),
  { ssr: false },
);

// ─── Glass Card ─────────────────────────────
function GlassCard({
  children,
  className = '',
  isNight = false,
}: {
  children: React.ReactNode;
  className?: string;
  isNight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 backdrop-blur-xl border ${
        isNight
          ? 'bg-night-card/70 border-night-border/50 text-night-text'
          : 'bg-white/70 border-day-border/50 text-day-text'
      } shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Phase Timer ─────────────────────────────
function PhaseTimer({ endAt, isNight }: { endAt: number | null; isNight: boolean }) {
  const remaining = useCountdown(endAt);
  const isUrgent = remaining <= 10 && remaining > 0;
  const prevRemainingRef = useRef(remaining);

  // Timer tick sound for last 5 seconds
  useEffect(() => {
    if (remaining <= 5 && remaining > 0 && remaining !== prevRemainingRef.current) {
      if (useUiStore.getState().isSoundEnabled) {
        playSound('timerTick');
      }
    }
    prevRemainingRef.current = remaining;
  }, [remaining]);

  return (
    <div
      className={`text-3xl font-heading font-bold tabular-nums ${
        isUrgent ? 'text-danger animate-pulse' : isNight ? 'text-night-accent' : 'text-day-accent'
      }`}
    >
      {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
    </div>
  );
}

// ─── Player List (for action panels) ─────────────────────────
function PlayerList({
  onSelect,
  selectedId,
  excludeIds = [],
  showDead = false,
  isNight = false,
}: {
  onSelect?: (playerId: string) => void;
  selectedId?: string | null;
  excludeIds?: string[];
  showDead?: boolean;
  isNight?: boolean;
}) {
  const t = useTranslations();
  const { players } = useGameStore();

  const displayPlayers = showDead
    ? players
    : players.filter((p) => p.isAlive && !excludeIds.includes(p.id));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {displayPlayers.map((player) => (
        <button
          key={player.id}
          onClick={() => onSelect?.(player.id)}
          disabled={!player.isAlive || !onSelect}
          className={`p-2.5 rounded-xl text-left transition-all text-sm ${
            !player.isAlive
              ? 'opacity-40 cursor-default ' + (isNight ? 'bg-night-bg/50' : 'bg-gray-100/50')
              : selectedId === player.id
                ? 'bg-primary/20 border-2 border-primary ring-1 ring-primary/30'
                : onSelect
                  ? isNight
                    ? 'bg-night-bg/40 hover:bg-night-bg/70 cursor-pointer'
                    : 'bg-white/40 hover:bg-white/70 cursor-pointer'
                  : isNight
                    ? 'bg-night-bg/30 cursor-default'
                    : 'bg-white/30 cursor-default'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                player.isAlive ? 'bg-primary/15' : 'bg-gray-400/20'
              }`}
            >
              {player.isAlive ? '👤' : '💀'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-xs truncate">{player.username}</p>
              {!player.isAlive && <p className="text-[10px] text-danger">{t('game.dead')}</p>}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Chat Panel ─────────────────────────────
const ChatPanel = React.memo(function ChatPanel({ isNight }: { isNight: boolean }) {
  const t = useTranslations();
  const { messages, activeChannel, setActiveChannel } = useChatStore();
  const { emit } = useEmit();
  const [input, setInput] = useState('');
  const myRole = useGameStore((s) => s.myRole);
  const phase = useGameStore((s) => s.phase);
  const isAlive = useGameStore((s) => s.isAlive);
  const scrollRef = useRef<HTMLDivElement>(null);

  const channelMessages = messages.filter((m) => m.channel === activeChannel);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [channelMessages.length]);

  const availableChannels = useMemo(() => {
    const channels: { key: string; label: string }[] = [];
    if (!isAlive) {
      // Dead players can see ALL channels as spectators but can only send in DEAD
      channels.push({ key: 'DAY', label: '💬' });
      channels.push({ key: 'WEREWOLF', label: '🐺' });
      channels.push({ key: 'DEAD', label: '👻' });
    } else {
      if (
        phase === GamePhase.DAY ||
        phase === GamePhase.VOTE ||
        phase === GamePhase.VOTE_RESULT ||
        phase === GamePhase.LAST_WORDS
      ) {
        channels.push({ key: 'DAY', label: '💬' });
      }
      if (myRole && isWerewolfRole(myRole) && phase === GamePhase.NIGHT) {
        channels.push({ key: 'WEREWOLF', label: '🐺' });
      }
    }
    if (channels.length === 0) {
      channels.push({ key: 'DAY', label: '💬' });
    }
    return channels;
  }, [isAlive, phase, myRole]);

  const canSendMessage = useMemo(() => {
    if (!isAlive) {
      // Dead players can only chat in DEAD channel
      return activeChannel === 'DEAD';
    }
    return availableChannels.some((ch) => ch.key === activeChannel);
  }, [isAlive, activeChannel, availableChannels]);

  const handleSend = () => {
    if (!input.trim() || !canSendMessage) return;
    emit('chat:send', { channel: activeChannel, content: input.trim() });
    setInput('');
  };

  return (
    <GlassCard isNight={isNight} className="flex flex-col h-full">
      {availableChannels.length > 1 && (
        <div className="flex gap-1 mb-2">
          {availableChannels.map((ch) => (
            <button
              key={ch.key}
              onClick={() => setActiveChannel(ch.key as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeChannel === ch.key
                  ? 'bg-primary text-white'
                  : isNight
                    ? 'bg-night-bg/50 text-night-muted hover:bg-night-bg/70'
                    : 'bg-white/50 text-day-muted hover:bg-white/70'
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto [scrollbar-color:transparent_transparent] space-y-1.5 mb-2 min-h-0"
      >
        {channelMessages.length === 0 && (
          <p
            className={`text-xs text-center py-4 ${isNight ? 'text-night-muted' : 'text-day-muted'}`}
          >
            {t('game.noMessages')}
          </p>
        )}
        {channelMessages.map((msg) => (
          <div key={msg.id} className={msg.isSystem ? 'text-center' : ''}>
            {msg.isSystem ? (
              <p
                className={`text-[10px] italic ${isNight ? 'text-night-muted' : 'text-day-muted'}`}
              >
                {msg.content}
              </p>
            ) : (
              <p className="text-xs">
                <span className="font-semibold text-primary">{msg.senderName}: </span>
                {msg.content}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <input
          className={`flex-1 px-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary ${
            isNight
              ? 'bg-night-bg/60 border border-night-border/50 text-night-text placeholder-night-muted'
              : 'bg-white/60 border border-day-border/50 text-day-text placeholder-day-muted'
          } ${!canSendMessage ? 'opacity-50 cursor-not-allowed' : ''}`}
          value={input}
          onChange={(e) => canSendMessage && setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={
            !isAlive && activeChannel !== 'DEAD'
              ? `👁 ${t('game.observeOnly')}`
              : !canSendMessage
                ? t('game.deadCantChat')
                : t('chat.placeholder')
          }
          disabled={!canSendMessage}
        />
        <VoiceControls isNight={isNight} />
        <Button size="sm" onClick={handleSend} disabled={!canSendMessage}>
          {t('chat.send')}
        </Button>
      </div>
    </GlassCard>
  );
});

// ─── Role Icons Map (shared by NightActionPanel + Role List) ─────────────
const ROLE_ICONS: Record<string, string> = {
  [Role.WEREWOLF]: '🐺',
  [Role.ALPHA_WEREWOLF]: '🐺',
  [Role.WEREWOLF_SHAMAN]: '🐺',
  [Role.WEREWOLF_SEER]: '🐺',
  [Role.SEER]: '🔮',
  [Role.AURA_SEER]: '✨',
  [Role.DOCTOR]: '💊',
  [Role.WITCH]: '🧙',
  [Role.BOMBER]: '💣',
  [Role.BEAST_HUNTER]: '🪤',
  [Role.AVENGER]: '⚔️',
  [Role.MEDIUM]: '👻',
  [Role.VILLAGER]: '🏘️',
  [Role.GUNNER]: '🔫',
  [Role.CURSED]: '🌑',
  [Role.HEADHUNTER]: '🎯',
  [Role.FOOL]: '🃏',
  [Role.BODYGUARD]: '🛡️',
  [Role.PRIEST]: '✝️',
  [Role.ELDER]: '👴',
  [Role.BAKER]: '🍞',
  [Role.DRUNK]: '🍺',
  [Role.MAYOR]: '🎩',
  [Role.PACIFIST]: '☮️',
  [Role.SLEEPWALKER]: '😴',
  [Role.HERMIT]: '🏔️',
  [Role.APPRENTICE_SEER]: '🌟',
  [Role.NIGHTMARE_WOLF]: '🐺',
  [Role.SHADOW_WOLF]: '🐺',
  [Role.BLOOD_MOON_WOLF]: '🐺',
  [Role.HOWLER_WOLF]: '🐺',
  [Role.LONE_WOLF]: '🐺',
  [Role.VENOM_WOLF]: '🐺',
  [Role.SERIAL_KILLER]: '🔪',
  [Role.CUPID]: '💘',
  [Role.ARSONIST]: '🔥',
  [Role.SURVIVOR]: '🦺',
  [Role.AMNESIAC]: '❓',
  [Role.DOPPELGANGER]: '🪞',
  [Role.JESTER]: '🤡',
  [Role.VIGILANTE]: '🎯',
  [Role.SPY]: '🕵️',
  [Role.JAILER]: '🔒',
  [Role.GRAVE_ROBBER]: '⚰️',
  [Role.INFECTOR_WOLF]: '🐺',
  [Role.STALKER_WOLF]: '🐺',
  [Role.CURSED_WOLF]: '🐺',
  [Role.PIRATE]: '🏴‍☠️',
  [Role.PLAGUE_DOCTOR]: '🩺',
  [Role.CORRUPTOR]: '👿',
};

// ─── Night Action Panel ─────────────────────────────
function NightActionPanel({
  selectedPlayerId,
  onSelectPlayer,
}: {
  selectedPlayerId?: string | null;
  onSelectPlayer?: (id: string) => void;
}) {
  const t = useTranslations();
  const { myRole, nightActionDone, nightActionTarget, gameId, players } = useGameStore();
  const seerResult = useGameStore((s) => s.seerResult);
  const auraSeerResult = useGameStore((s) => s.auraSeerResult);
  const werewolfSeerResult = useGameStore((s) => s.werewolfSeerResult);
  const { user } = useAuthStore();
  const { emit } = useEmit();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [witchAction, setWitchAction] = useState<'heal' | 'kill' | null>(null);

  // Sync 3D selection with night action target
  useEffect(() => {
    if (selectedPlayerId && selectedPlayerId !== user?.id) {
      setSelectedTarget(selectedPlayerId);
    }
  }, [selectedPlayerId, user?.id]);

  if (!myRole || nightActionDone) {
    return (
      <GlassCard isNight className="text-center py-6">
        <p className="text-night-text">
          {nightActionDone ? t('game.actionDone') : t('phases.night')}
        </p>
        {nightActionTarget && (
          <p className="text-sm text-night-muted mt-1">
            {t('game.targetSelected', {
              target: players.find((p) => p.id === nightActionTarget)?.username || '',
            })}
          </p>
        )}
        {/* Seer result display */}
        {seerResult && (
          <div className="mt-3 p-3 bg-purple-500/20 rounded-xl border border-purple-400/30">
            <span className="text-2xl block mb-1">🔮</span>
            <p className="text-sm font-semibold text-purple-300">
              {t('game.seerCheckResult', {
                target: players.find((p) => p.id === seerResult.targetId)?.username || '',
                role: t(`roles.${roleToCamel(seerResult.role)}`),
              })}
            </p>
          </div>
        )}
        {/* Aura Seer result display */}
        {auraSeerResult && (
          <div className="mt-3 p-3 bg-cyan-500/20 rounded-xl border border-cyan-400/30">
            <span className="text-2xl block mb-1">✨</span>
            <p className="text-sm font-semibold text-cyan-300">
              {t('game.auraSeerCheckResult', {
                target: players.find((p) => p.id === auraSeerResult.targetId)?.username || '',
                result: t(`seerResult.${auraSeerResult.result.toLowerCase()}`),
              })}
            </p>
          </div>
        )}
        {/* Werewolf Seer result (shared with all wolves) */}
        {werewolfSeerResult && (
          <div className="mt-3 p-3 bg-red-500/20 rounded-xl border border-red-400/30">
            <span className="text-2xl block mb-1">🐺🔮</span>
            <p className="text-sm font-semibold text-red-300">
              {t('game.seerCheckResult', {
                target: players.find((p) => p.id === werewolfSeerResult.targetId)?.username || '',
                role: t(`roles.${roleToCamel(werewolfSeerResult.role)}`),
              })}
            </p>
          </div>
        )}
      </GlassCard>
    );
  }

  const hasNightAction = [
    Role.WEREWOLF,
    Role.ALPHA_WEREWOLF,
    Role.WEREWOLF_SHAMAN,
    Role.WEREWOLF_SEER,
    Role.NIGHTMARE_WOLF,
    Role.SHADOW_WOLF,
    Role.BLOOD_MOON_WOLF,
    Role.HOWLER_WOLF,
    Role.LONE_WOLF,
    Role.VENOM_WOLF,
    Role.SEER,
    Role.AURA_SEER,
    Role.DOCTOR,
    Role.WITCH,
    Role.BOMBER,
    Role.BEAST_HUNTER,
    Role.AVENGER,
    Role.MEDIUM,
    Role.BODYGUARD,
    Role.SERIAL_KILLER,
    Role.CUPID,
    Role.ARSONIST,
    Role.DOPPELGANGER,
    Role.AMNESIAC,
    Role.APPRENTICE_SEER,
    Role.VIGILANTE,
    Role.SPY,
    Role.JAILER,
    Role.GRAVE_ROBBER,
    Role.INFECTOR_WOLF,
    Role.STALKER_WOLF,
    Role.CURSED_WOLF,
    Role.PIRATE,
    Role.PLAGUE_DOCTOR,
    Role.CORRUPTOR,
  ].includes(myRole);

  const handleConfirmAction = () => {
    if (!gameId) return;
    let action = 'target';
    if (isWerewolfRole(myRole)) action = 'werewolf_kill';
    else if (myRole === Role.SEER || myRole === Role.APPRENTICE_SEER) action = 'seer_check';
    else if (myRole === Role.AURA_SEER) action = 'aura_check';
    else if (myRole === Role.DOCTOR) action = 'protect';
    else if (myRole === Role.BODYGUARD) action = 'protect';
    else if (myRole === Role.WITCH) action = witchAction || 'heal';
    else if (myRole === Role.BOMBER) action = 'bomb';
    else if (myRole === Role.BEAST_HUNTER) action = 'trap';
    else if (myRole === Role.AVENGER) action = 'revenge';
    else if (myRole === Role.MEDIUM) action = 'revive';
    else if (myRole === Role.SERIAL_KILLER) action = 'kill';
    else if (myRole === Role.CUPID) action = 'link';
    else if (myRole === Role.ARSONIST) action = 'douse';
    else if (myRole === Role.DOPPELGANGER) action = 'choose';
    else if (myRole === Role.AMNESIAC) action = 'choose';
    else if (myRole === Role.VIGILANTE) action = 'vigilante_kill';
    else if (myRole === Role.SPY) action = 'spy_watch';
    else if (myRole === Role.JAILER) action = 'jail';
    else if (myRole === Role.GRAVE_ROBBER) action = 'rob_grave';
    else if (myRole === Role.PIRATE) action = 'duel';
    else if (myRole === Role.PLAGUE_DOCTOR) action = 'plague';
    else if (myRole === Role.CORRUPTOR) action = 'corrupt';

    emit('game:night_action', { gameId, action, targetId: selectedTarget });
    useGameStore.getState().setNightAction(selectedTarget);
    if (useUiStore.getState().isSoundEnabled) playSound('actionConfirm');
  };

  if (!hasNightAction) {
    return (
      <GlassCard isNight className="text-center py-6">
        <span className="text-4xl block mb-3">{ROLE_ICONS[myRole] || '🌙'}</span>
        <p className="text-night-text font-heading font-semibold">
          {t(`roles.${roleToCamel(myRole)}`)}
        </p>
        <p className="text-sm text-night-muted mt-2">{t('phases.night')}</p>
      </GlassCard>
    );
  }

  // ─── Witch-specific UI with Heal/Kill buttons ───
  if (myRole === Role.WITCH) {
    return (
      <GlassCard isNight>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🧙</span>
          <div>
            <h3 className="font-heading font-semibold text-night-text">{t('roles.witch')}</h3>
            <p className="text-xs text-night-muted">{t('game.witchChooseAction')}</p>
          </div>
        </div>

        {/* Heal / Kill / Skip mode buttons */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            onClick={() => {
              setWitchAction('heal');
              setSelectedTarget(null);
            }}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
              witchAction === 'heal'
                ? 'bg-emerald-500/25 border-emerald-400 ring-1 ring-emerald-400/40'
                : 'bg-night-bg/40 border-night-border/30 hover:bg-night-bg/60 hover:border-emerald-400/50'
            }`}
          >
            <span className="text-2xl">💚</span>
            <span
              className={`text-xs font-semibold ${
                witchAction === 'heal' ? 'text-emerald-300' : 'text-night-muted'
              }`}
            >
              {t('game.witchHeal')}
            </span>
          </button>
          <button
            onClick={() => {
              setWitchAction('kill');
              setSelectedTarget(null);
            }}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
              witchAction === 'kill'
                ? 'bg-red-500/25 border-red-400 ring-1 ring-red-400/40'
                : 'bg-night-bg/40 border-night-border/30 hover:bg-night-bg/60 hover:border-red-400/50'
            }`}
          >
            <span className="text-2xl">☠️</span>
            <span
              className={`text-xs font-semibold ${
                witchAction === 'kill' ? 'text-red-300' : 'text-night-muted'
              }`}
            >
              {t('game.witchKill')}
            </span>
          </button>
          <button
            onClick={() => {
              if (!gameId) return;
              emit('game:night_action', { gameId, action: 'skip' });
              useGameStore.getState().setNightAction(null);
              if (useUiStore.getState().isSoundEnabled) playSound('actionConfirm');
            }}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all bg-night-bg/40 border-night-border/30 hover:bg-night-bg/60 hover:border-night-accent/50"
          >
            <span className="text-2xl">⏭️</span>
            <span className="text-xs font-semibold text-night-muted">
              {t('game.skip')}
            </span>
          </button>
        </div>

        {/* Show player list for Kill mode */}
        {witchAction === 'kill' && (
          <>
            <p className="text-xs text-night-muted mb-2">{t('game.selectTarget')}</p>
            <PlayerList
              onSelect={(id) => {
                setSelectedTarget(id);
                onSelectPlayer?.(id);
              }}
              selectedId={selectedTarget}
              excludeIds={[user?.id || '']}
              isNight
            />
          </>
        )}

        {/* Heal mode info */}
        {witchAction === 'heal' && (
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-400/20 mb-2">
            <p className="text-xs text-emerald-300">{t('game.witchHealDesc')}</p>
          </div>
        )}

        {witchAction && witchAction !== 'skip' && (
          <div className="mt-3">
            <Button
              className="w-full"
              onClick={handleConfirmAction}
              disabled={witchAction === 'kill' && !selectedTarget}
            >
              {witchAction === 'heal'
                ? `💚 ${t('game.witchHeal')}`
                : witchAction === 'kill'
                  ? `☠️ ${t('game.witchKill')}`
                  : t('common.confirm')}
            </Button>
          </div>
        )}
      </GlassCard>
    );
  }

  return (
    <GlassCard isNight>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{ROLE_ICONS[myRole] || '🌙'}</span>
        <div>
          <h3 className="font-heading font-semibold text-night-text">
            {t(`roles.${roleToCamel(myRole)}`)}
          </h3>
          <p className="text-xs text-night-muted">{t('game.selectTarget')}</p>
        </div>
      </div>
      <PlayerList
        onSelect={(id) => {
          setSelectedTarget(id);
          onSelectPlayer?.(id);
        }}
        selectedId={selectedTarget}
        excludeIds={[user?.id || '']}
        isNight
      />
      <div className="mt-3">
        <Button className="w-full" onClick={handleConfirmAction} disabled={!selectedTarget}>
          {t('common.confirm')}
        </Button>
      </div>
    </GlassCard>
  );
}

// ─── Vote Panel ─────────────────────────────
function VotePanel({
  isNight,
  selectedPlayerId,
  onSelectPlayer,
}: {
  isNight: boolean;
  selectedPlayerId?: string | null;
  onSelectPlayer?: (id: string) => void;
}) {
  const t = useTranslations();
  const { players, voteState, gameId } = useGameStore();
  const isAlive = useGameStore((s) => s.isAlive);
  const { emit } = useEmit();
  const [votedFor, setVotedFor] = useState<string | null>(null);

  const handleVote = (playerId: string) => {
    if (!gameId || !isAlive) return;
    setVotedFor(playerId);
    onSelectPlayer?.(playerId);
    emit('game:vote', { gameId, targetId: playerId });
  };

  // Sync 3D click with vote — if player clicks a character in 3D during vote phase
  useEffect(() => {
    if (selectedPlayerId && !votedFor && gameId) {
      // Don't auto-vote on 3D click, just highlight; user must click the vote button
    }
  }, [selectedPlayerId, votedFor, gameId]);

  // Show all players: alive ones are votable, dead ones are greyed out
  const sortedPlayers = [...players].sort((a, b) => {
    // Alive players first, dead last
    if (a.isAlive && !b.isAlive) return -1;
    if (!a.isAlive && b.isAlive) return 1;
    return 0;
  });

  return (
    <GlassCard isNight={isNight}>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-heading font-semibold">{t('game.voteTitle')}</h3>
        {!isAlive && <Badge variant="warning">👁 {t('game.spectating')}</Badge>}
      </div>
      <div className="space-y-2">
        {sortedPlayers.map((player) => {
          const voteCount = voteState?.votes
            ? Object.values(voteState.votes).filter((v) => v === player.id).length
            : 0;

          if (!player.isAlive) {
            return (
              <div
                key={player.id}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm opacity-40 ${
                  isNight ? 'bg-night-bg/30' : 'bg-gray-100/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-gray-400/20 rounded-full flex items-center justify-center text-xs">
                    💀
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs">{player.username}</span>
                    <p className="text-[10px] text-danger">{t('game.dead')}</p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <button
              key={player.id}
              onClick={() => handleVote(player.id)}
              disabled={!isAlive}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-sm ${
                votedFor === player.id
                  ? 'bg-danger/20 border-2 border-danger'
                  : selectedPlayerId === player.id
                    ? 'bg-primary/20 border-2 border-primary ring-1 ring-primary/30'
                    : isNight
                      ? 'bg-night-bg/40 hover:bg-night-bg/60'
                      : 'bg-white/40 hover:bg-white/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary/15 rounded-full flex items-center justify-center text-xs">
                  👤
                </div>
                <span className="font-semibold text-xs">{player.username}</span>
              </div>
              {voteCount > 0 && <Badge variant="danger">{voteCount}</Badge>}
            </button>
          );
        })}
      </div>
      {selectedPlayerId &&
        !votedFor &&
        isAlive &&
        players.find((p) => p.id === selectedPlayerId)?.isAlive && (
          <div className="mt-3">
            <Button
              className="w-full"
              variant="danger"
              onClick={() => handleVote(selectedPlayerId)}
            >
              {t('game.voteFor', {
                player: players.find((p) => p.id === selectedPlayerId)?.username || '',
              })}
            </Button>
          </div>
        )}
    </GlassCard>
  );
}

// ─── Dawn Panel ─────────────────────────────
function DawnPanel() {
  const t = useTranslations();
  const { nightResult, players } = useGameStore();

  return (
    <GlassCard isNight={false}>
      <h3 className="font-heading font-semibold mb-4 text-center text-lg">
        {t('game.dawnResult')}
      </h3>
      {nightResult && nightResult.killed.length > 0 ? (
        <div className="space-y-2">
          {nightResult.killed.map((playerId) => {
            const player = players.find((p) => p.id === playerId);
            return (
              <div key={playerId} className="flex items-center gap-3 p-3 bg-danger/15 rounded-xl">
                <span className="text-2xl">💀</span>
                <p className="font-semibold text-danger text-sm">{player?.username || 'Unknown'}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4">
          <span className="text-4xl block mb-2">🌅</span>
          <p className="text-day-muted text-sm">{t('game.noDeath')}</p>
        </div>
      )}
    </GlassCard>
  );
}

// ─── Gunner Panel ─────────────────────────────
function GunnerPanel({ isNight }: { isNight: boolean }) {
  const t = useTranslations();
  const { myRole, gameId } = useGameStore();
  const isAlive = useGameStore((s) => s.isAlive);
  const { user } = useAuthStore();
  const { emit } = useEmit();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [hasShot, setHasShot] = useState(false);

  if (myRole !== Role.GUNNER || hasShot || !isAlive) return null;

  const handleShoot = () => {
    if (!gameId || !selectedTarget) return;
    emit('game:gunner_shoot', { gameId, targetId: selectedTarget });
    setHasShot(true);
    if (useUiStore.getState().isSoundEnabled) playSound('gunshot');
  };

  return (
    <GlassCard isNight={isNight} className="border-2 border-warning/50">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🔫</span>
        <h3 className="font-heading font-semibold text-sm">{t('roles.gunner')}</h3>
      </div>
      <PlayerList
        onSelect={setSelectedTarget}
        selectedId={selectedTarget}
        excludeIds={[user?.id || '']}
        isNight={isNight}
      />
      <Button
        className="w-full mt-3"
        variant="danger"
        onClick={handleShoot}
        disabled={!selectedTarget}
        size="sm"
      >
        {t('game.shoot')}
      </Button>
    </GlassCard>
  );
}

// ─── Death Log Panel ─────────────────────────────
function DeathLog({ isNight }: { isNight: boolean }) {
  const t = useTranslations();
  const deathLog = useGameStore((s) => s.deathLog);
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (deathLog.length === 0) return null;

  const causeLabels: Record<string, string> = {
    night: t('game.deathNight'),
    voted: t('game.deathVoted'),
    gunner: t('game.deathGunner'),
  };

  const causeIcons: Record<string, string> = {
    night: '🐺',
    voted: '🗳️',
    gunner: '🔫',
  };

  return (
    <div className="pointer-events-auto">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl text-xs font-semibold transition-all backdrop-blur-xl border border-b-0 ${
          isNight
            ? 'bg-night-card/70 border-night-border/50 text-night-text'
            : 'bg-white/70 border-day-border/50 text-day-text'
        }`}
      >
        <span>💀</span>
        <span>{t('game.deathLog')}</span>
        <Badge variant="danger">{deathLog.length}</Badge>
        <span className="text-[10px]">{isCollapsed ? '▲' : '▼'}</span>
      </button>
      {!isCollapsed && (
        <GlassCard isNight={isNight} className="!rounded-tl-none !py-2 max-h-40 overflow-y-auto">
          <div className="space-y-1.5">
            {deathLog.map((entry, i) => (
              <div key={`${entry.playerId}-${i}`} className="flex items-center gap-2 text-xs">
                <span>{causeIcons[entry.cause] || '💀'}</span>
                <span className="font-semibold text-danger">{entry.playerName}</span>
                <span className={isNight ? 'text-night-muted' : 'text-day-muted'}>
                  {causeLabels[entry.cause] || entry.cause}
                </span>
                <span className={`ml-auto text-[10px] ${isNight ? 'text-night-muted' : 'text-day-muted'}`}>
                  R{entry.round}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ─── 3D Scene Wrapper ─────────────────────────────
function Game3DScene({
  isNight,
  players,
  selectedId,
  onSelect,
  chatBubbles,
}: {
  isNight: boolean;
  players: { id: string; username: string; isAlive: boolean; role?: Role }[];
  selectedId?: string | null;
  onSelect?: (playerId: string) => void;
  chatBubbles?: Map<string, { content: string; timestamp: number }>;
}) {
  return (
    <div className="absolute inset-0 w-full h-full">
      <ForestScene isNight={isNight}>
        <PlayerCircle
          players={players}
          selectedId={selectedId}
          onSelect={onSelect}
          isNight={isNight}
          chatBubbles={chatBubbles}
        />
      </ForestScene>
    </div>
  );
}

// ─── Main Game Page ─────────────────────────────
export default function GamePage() {
  const t = useTranslations();
  const router = useRouter();
  const { phase, myRole, myTeam, phaseEndAt, winners, round, gameId, players } = useGameStore();
  const roleList = useGameStore((s) => s.roleList);
  const isAlive = useGameStore((s) => s.isAlive);
  const { emit } = useSocket();

  // ── Voice chat ──
  const roomCode = useRoomStore((s) => s.currentRoom?.code ?? null);
  useVoiceChat(roomCode);

  // ── Sound effects (subscribe to game state changes) ──
  useGameSounds();

  // ── Player selection state (used for voting + night actions + 3D highlight) ──
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Clear selection when phase changes
  useEffect(() => {
    setSelectedPlayerId(null);
  }, [phase]);

  // ── Chat bubbles (managed OUTSIDE Canvas for reliable React state) ──
  const [chatBubbles, setChatBubbles] = useState<
    Map<string, { content: string; timestamp: number }>
  >(new Map());
  const chatMessagesCountRef = useRef(0);

  useEffect(() => {
    const unsubscribe = useChatStore.subscribe((state) => {
      const msgs = state.messages;
      if (msgs.length > chatMessagesCountRef.current) {
        const added = msgs.slice(chatMessagesCountRef.current);
        for (const msg of added) {
          if (msg.isSystem) continue;
          setChatBubbles((prev) => {
            const next = new Map(prev);
            next.set(msg.senderId, {
              content: msg.content.length > 40 ? msg.content.slice(0, 37) + '...' : msg.content,
              timestamp: Date.now(),
            });
            return next;
          });
        }
      }
      chatMessagesCountRef.current = msgs.length;
    });
    return unsubscribe;
  }, []);

  // Auto-expire bubbles
  useEffect(() => {
    const interval = setInterval(() => {
      setChatBubbles((prev) => {
        const now = Date.now();
        const next = new Map(prev);
        let changed = false;
        for (const [key, val] of next) {
          if (now - val.timestamp > 4000) {
            next.delete(key);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!gameId && !winners) {
      const timer = setTimeout(() => {
        if (!useGameStore.getState().gameId) {
          router.push('/rooms');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameId, winners, router]);

  const phaseLabels: Record<string, string> = {
    [GamePhase.STARTING]: `🎭 ${t('game.gameStarting')}`,
    [GamePhase.NIGHT]: t('phases.night'),
    [GamePhase.DAWN]: t('phases.dawn'),
    [GamePhase.DAY]: t('phases.day'),
    [GamePhase.VOTE]: t('phases.vote'),
    [GamePhase.VOTE_RESULT]: t('phases.voteResult'),
    [GamePhase.LAST_WORDS]: t('phases.lastWords'),
    [GamePhase.GAME_OVER]: t('phases.gameOver'),
  };

  const isNight = phase === GamePhase.NIGHT || phase === GamePhase.STARTING;

  // ── Game Over screen ──
  if (winners) {
    return (
      <div className="relative w-full h-screen overflow-hidden">
        <Suspense fallback={null}>
          <Game3DScene isNight={false} players={players} />
        </Suspense>
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <GlassCard isNight={false} className="text-center max-w-sm w-full mx-4">
            <span className="text-6xl block mb-4">
              {winners.team === Team.VILLAGE ? '🏘️' : winners.team === Team.WEREWOLF ? '🐺' : '🎭'}
            </span>
            <h1 className="text-3xl font-heading font-bold mb-2">{t('game.gameOver')}</h1>
            <p className="text-lg text-day-muted mb-2">
              {t(`game.win_${winners.team.toLowerCase()}`)}
            </p>
            {myRole && (
              <p className="text-sm text-day-muted mb-6">
                {t('game.yourRole')}: {t(`roles.${roleToCamel(myRole)}`)}
              </p>
            )}
            <Button
              onClick={() => {
                useGameStore.getState().resetGame();
                router.push('/rooms');
              }}
            >
              {t('game.backToLobby')}
            </Button>
          </GlassCard>
        </div>
      </div>
    );
  }

  // ── Loading screen ──
  if (!gameId) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-day-bg">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-day-muted">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // ── Main game view ──
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 3D Background + Player Circle */}
      <Suspense
        fallback={<div className={`absolute inset-0 ${isNight ? 'bg-night-sky' : 'bg-day-sky'}`} />}
      >
        <Game3DScene
          isNight={isNight}
          players={players.map((p) => ({
            id: p.id,
            username: p.username,
            isAlive: p.isAlive,
            role: p.role as Role | undefined,
          }))}
          selectedId={selectedPlayerId}
          onSelect={setSelectedPlayerId}
          chatBubbles={chatBubbles}
        />
      </Suspense>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
        {/* Top Bar: Phase + Timer + Role */}
        <div className="pointer-events-auto">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <GlassCard isNight={isNight} className="!py-2 !px-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-heading font-bold">
                    {phase ? phaseLabels[phase] || phase : '...'}
                  </h2>
                  <Badge variant={isNight ? 'warning' : 'info'}>{t('game.round', { round })}</Badge>
                </div>
              </GlassCard>

              {myRole && (
                <GlassCard isNight={isNight} className="!py-2 !px-3">
                  <p className="text-xs font-semibold opacity-80">
                    {t('game.yourRole')}: {t(`roles.${roleToCamel(myRole)}`)}
                  </p>
                </GlassCard>
              )}
            </div>

            <GlassCard isNight={isNight} className="!py-1 !px-4">
              <PhaseTimer endAt={phaseEndAt} isNight={isNight} />
            </GlassCard>
          </div>
        </div>

        {/* Dead indicator */}
        {!isAlive && (
          <div className="pointer-events-auto flex justify-center mt-1">
            <GlassCard isNight={isNight} className="!py-1.5 !px-4 bg-danger/20 border-danger/30">
              <p className="text-xs font-semibold text-danger">💀 {t('game.dead')}</p>
            </GlassCard>
          </div>
        )}

        {/* Role list */}
        {roleList.length > 0 && (
          <div className="pointer-events-auto flex justify-center mt-1">
            <GlassCard isNight={isNight} className="!py-1.5 !px-3">
              <div className="flex gap-1 items-center flex-wrap justify-center">
                {roleList.map((role, i) => (
                  <span key={`${role}-${i}`} className="text-sm" title={t(`roles.${roleToCamel(role)}`)}>
                    {ROLE_ICONS[role] || '❓'}
                  </span>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Death Log (bottom-right, above action panels) */}
        <div className="flex justify-end px-3 mb-1">
          <DeathLog isNight={isNight} />
        </div>

        {/* Bottom: Action Panel + Chat (side by side on desktop) */}
        <div className="pointer-events-auto p-3">
          <div className="flex gap-3 items-end max-w-7xl mx-auto w-full">
            {/* Action Panel (left side) */}
            <div className="flex-1 max-w-md">
              {phase === GamePhase.NIGHT && isAlive && (
                <NightActionPanel
                  selectedPlayerId={selectedPlayerId}
                  onSelectPlayer={setSelectedPlayerId}
                />
              )}
              {phase === GamePhase.NIGHT && !isAlive && (
                <GlassCard isNight className="text-center py-6">
                  <span className="text-4xl block mb-2">💀</span>
                  <p className="text-night-muted text-sm">{t('game.dead')}</p>
                </GlassCard>
              )}
              {phase === GamePhase.DAWN && <DawnPanel />}
              {phase === GamePhase.DAY && (
                <div className="space-y-3">
                  <GlassCard isNight={false}>
                    <h3 className="font-heading font-semibold mb-2 text-sm">
                      {t('game.discussion')}
                    </h3>
                    <PlayerList isNight={false} />
                  </GlassCard>
                  <GunnerPanel isNight={false} />
                </div>
              )}
              {phase === GamePhase.VOTE && (
                <VotePanel
                  isNight={false}
                  selectedPlayerId={selectedPlayerId}
                  onSelectPlayer={setSelectedPlayerId}
                />
              )}
              {phase === GamePhase.VOTE_RESULT && (
                <GlassCard isNight={false} className="text-center py-6">
                  <span className="text-4xl block mb-2">🗳️</span>
                  <h3 className="font-heading font-semibold text-lg">{t('phases.voteResult')}</h3>
                </GlassCard>
              )}
              {phase === GamePhase.LAST_WORDS && (
                <GlassCard isNight={false} className="text-center py-6">
                  <span className="text-4xl block mb-2">💬</span>
                  <h3 className="font-heading font-semibold text-lg">{t('phases.lastWords')}</h3>
                </GlassCard>
              )}
              {phase === GamePhase.STARTING && (
                <GlassCard isNight className="text-center py-6">
                  <span className="text-4xl block mb-2 animate-bounce">🎭</span>
                  <h3 className="font-heading font-semibold text-lg mb-2">
                    {t('game.gameStarting')}
                  </h3>
                  {myRole && (
                    <div className="mt-3 p-3 bg-primary/15 rounded-xl inline-block">
                      <p className="text-xs opacity-70 mb-1">{t('game.yourRole')}</p>
                      <p className="text-xl font-heading font-bold text-primary">
                        {t(`roles.${roleToCamel(myRole)}`)}
                      </p>
                    </div>
                  )}
                </GlassCard>
              )}
            </div>

            {/* Chat Panel (right side) */}
            <div className="flex-1 max-w-sm h-72">
              <ChatPanel isNight={isNight} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
