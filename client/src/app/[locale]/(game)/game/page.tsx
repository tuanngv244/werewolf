'use client';

import { useTranslations } from 'next-intl';
import { useGameStore } from '@/stores/game-store';
import type { GameLogEntry } from '@/stores/game-store';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useCountdown } from '@/hooks/useCountdown';
import { useEmit } from '@/hooks/useSocket';
import { useGameSounds } from '@/hooks/useGameSounds';
import { playSound } from '@/lib/sounds';
import { useUiStore } from '@/stores/ui-store';
import { GamePhase, Role, Team } from '@shared/types/game.types';
import { isWerewolfRole } from '@shared/constants/roles';
import { Button, Badge } from '@/components/ui';
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useRouter } from '@/lib/navigation';
import dynamic from 'next/dynamic';
import { JitsiMeetPanel } from '@/components/game/JitsiMeetPanel';
import { GameToastContainer } from '@/components/game/GameToast';
import { useRoomStore } from '@/stores/room-store';
import * as THREE from 'three';
import type { CollisionData } from '@/components/3d/collision-utils';

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
      className={`rounded-xl md:rounded-2xl p-3 md:p-4 backdrop-blur-xl border ${
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
      className={`text-xl md:text-3xl font-heading font-bold tabular-nums ${
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
  wolfVoteCounts,
}: {
  onSelect?: (playerId: string) => void;
  selectedId?: string | null;
  excludeIds?: string[];
  showDead?: boolean;
  isNight?: boolean;
  wolfVoteCounts?: Record<string, number>;
}) {
  const t = useTranslations();
  const { players: rawPlayers } = useGameStore();

  // Deduplicate players by ID to prevent React key warnings
  const displayPlayers = useMemo(() => {
    const seen = new Set<string>();
    const base = showDead
      ? rawPlayers
      : rawPlayers.filter((p) => p.isAlive && !excludeIds.includes(p.id));
    return base.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [rawPlayers, showDead, excludeIds]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {displayPlayers.map((player) => {
        const voteCount = wolfVoteCounts?.[player.id] || 0;
        return (
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
              {voteCount > 0 && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-500/25 rounded-full text-[10px] font-bold text-red-300 border border-red-400/30">
                  🐺 {voteCount}
                </span>
              )}
            </div>
          </button>
        );
      })}
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
  const werewolfTeam = useGameStore((s) => s.werewolfTeam);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);

  const channelMessages = messages.filter((m) => m.channel === activeChannel);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [channelMessages.length]);

  const isWolf = myRole ? isWerewolfRole(myRole) : false;

  const availableChannels = useMemo(() => {
    const channels: { key: string; label: string }[] = [];
    if (!isAlive) {
      // Dead players can see ALL channels as spectators but can only send in DEAD
      channels.push({ key: 'DAY', label: '💬' });
      channels.push({ key: 'WEREWOLF', label: '🐺' });
      channels.push({ key: 'DEAD', label: '👻' });
    } else if (phase === GamePhase.NIGHT) {
      // Night: only wolves get the wolf chat, non-wolves get no chat
      if (isWolf) {
        channels.push({ key: 'WEREWOLF', label: '🐺' });
      }
    } else {
      if (
        phase === GamePhase.DAY ||
        phase === GamePhase.VOTE ||
        phase === GamePhase.VOTE_RESULT ||
        phase === GamePhase.LAST_WORDS
      ) {
        channels.push({ key: 'DAY', label: '💬' });
      }
    }
    return channels;
  }, [isAlive, phase, isWolf]);

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

  const noChatAvailable = availableChannels.length === 0;

  return (
    <GlassCard isNight={isNight} className="flex flex-col h-full">
      {availableChannels.length > 1 && (
        <div className="flex gap-1 mb-2">
          {availableChannels.map((ch) => (
            <button
              key={ch.key}
              onClick={() => setActiveChannel(ch.key as any)}
              className={`px-3 py-1 rounded-lg text-xs md:text-sm font-semibold transition-all ${
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
      {/* Wolf ally roster — shown whenever the WEREWOLF tab is active */}
      {activeChannel === 'WEREWOLF' && werewolfTeam.length > 0 && (
        <div className="mb-2">
          {availableChannels.length === 1 && (
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm md:text-base">🐺</span>
              <span className="text-xs md:text-sm font-semibold text-red-400">
                {t('chat.wolfChat')}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {werewolfTeam.map((wolf) => (
              <span
                key={wolf.id}
                className="text-[10px] text-red-300 bg-red-900/30 rounded px-1.5 py-0.5"
              >
                🐺 {wolf.username} ({t(`roles.${roleToCamel(wolf.role)}`)})
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1.5 md:space-y-2 mb-2 min-h-0 pr-1 scrollbar-thin"
      >
        {noChatAvailable ? (
          <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
            <span className="text-2xl md:text-3xl">🌙</span>
            <p
              className={`text-xs md:text-sm text-center ${isNight ? 'text-night-muted' : 'text-day-muted'}`}
            >
              {t('game.nightSilence')}
            </p>
          </div>
        ) : channelMessages.length === 0 ? (
          <p
            className={`text-xs md:text-sm text-center py-4 ${isNight ? 'text-night-muted' : 'text-day-muted'}`}
          >
            {t('game.noMessages')}
          </p>
        ) : (
          channelMessages.map((msg) => (
            <div key={msg.id} className={msg.isSystem ? 'text-center' : ''}>
              {msg.isSystem ? (
                <p
                  className={`text-[10px] md:text-xs italic ${isNight ? 'text-night-muted' : 'text-day-muted'}`}
                >
                  {msg.content}
                </p>
              ) : (
                <p className="text-xs md:text-sm leading-relaxed">
                  <span className="font-semibold text-primary">{msg.senderName}: </span>
                  {msg.content}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2 items-center">
        <input
          className={`flex-1 px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
            isNight
              ? 'bg-night-bg/60 border border-night-border/50 text-night-text placeholder-night-muted'
              : 'bg-white/60 border border-day-border/50 text-day-text placeholder-day-muted'
          } ${!canSendMessage || noChatAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
          value={input}
          onChange={(e) => canSendMessage && !noChatAvailable && setInput(e.target.value)}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && !isComposingRef.current) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={
            noChatAvailable
              ? `🌙 ${t('game.nightSilence')}`
              : !isAlive && activeChannel !== 'DEAD'
                ? `👁 ${t('game.observeOnly')}`
                : !canSendMessage
                  ? t('game.deadCantChat')
                  : activeChannel === 'WEREWOLF'
                    ? t('chat.wolfChatPlaceholder')
                    : t('chat.placeholder')
          }
          disabled={!canSendMessage || noChatAvailable}
        />
        <Button size="sm" onClick={handleSend} disabled={!canSendMessage || noChatAvailable}>
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
  [Role.SNOW_WOLF]: '🐺',
  [Role.VEGETARIAN_WOLF]: '🐺',
  [Role.WOLF_FANG]: '🐺',
  [Role.PIRATE]: '🏴‍☠️',
  [Role.PLAGUE_DOCTOR]: '🩺',
  [Role.CORRUPTOR]: '👿',
  [Role.MONK]: '🙏',
  [Role.LYCAN]: '🌕',
  [Role.VAMPIRE]: '🧛',
  [Role.CULT_LEADER]: '📿',
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
  const werewolfKillVotes = useGameStore((s) => s.werewolfKillVotes);
  const werewolfTeam = useGameStore((s) => s.werewolfTeam);
  const allWolvesVoted = useGameStore((s) => s.allWolvesVoted);
  const seerResult = useGameStore((s) => s.seerResult);
  const auraSeerResult = useGameStore((s) => s.auraSeerResult);
  const werewolfSeerResult = useGameStore((s) => s.werewolfSeerResult);
  const witchAttackedTarget = useGameStore((s) => s.witchAttackedTarget);
  const witchHasHealPotion = useGameStore((s) => s.witchHasHealPotion);
  const witchHasKillPotion = useGameStore((s) => s.witchHasKillPotion);
  const { user } = useAuthStore();
  const { emit } = useEmit();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [witchAction, setWitchAction] = useState<'heal' | 'kill' | null>(null);
  const [vampireAction, setVampireAction] = useState<'mark' | 'kill' | null>(null);

  // Compute wolf kill vote counts (targetId → count) for display
  const isWolf = myRole ? isWerewolfRole(myRole) : false;
  const wolfVoteCounts = useMemo(() => {
    if (!isWolf || !werewolfKillVotes) return undefined;
    const counts: Record<string, number> = {};
    for (const targetId of Object.values(werewolfKillVotes)) {
      counts[targetId] = (counts[targetId] || 0) + 1;
    }
    return Object.keys(counts).length > 0 ? counts : undefined;
  }, [isWolf, werewolfKillVotes]);

  // Sync 3D selection with night action target
  // Doctor and Beast Hunter can target themselves, so allow self-selection for those roles
  const canSelfTarget = myRole === Role.DOCTOR || myRole === Role.BEAST_HUNTER;
  useEffect(() => {
    if (selectedPlayerId && (canSelfTarget || selectedPlayerId !== user?.id)) {
      setSelectedTarget(selectedPlayerId);
    }
  }, [selectedPlayerId, user?.id, canSelfTarget]);

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
                result: t(`seerResult.${seerResult.alignment}`),
              })}
            </p>
            <p
              className={`text-xs mt-1 font-medium ${
                seerResult.alignment === 'good'
                  ? 'text-emerald-400'
                  : seerResult.alignment === 'evil'
                    ? 'text-red-400'
                    : 'text-amber-400'
              }`}
            >
              {seerResult.alignment === 'good'
                ? '✅'
                : seerResult.alignment === 'evil'
                  ? '❌'
                  : '❓'}{' '}
              {t(`seerResult.${seerResult.alignment}`)}
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
              {t('game.wolfSeerCheckResult', {
                target: players.find((p) => p.id === werewolfSeerResult.targetId)?.username || '',
                role: t(`roles.${roleToCamel(werewolfSeerResult.role)}`),
              })}
            </p>
          </div>
        )}
        {/* Wolf pack kill votes (visible to all wolves after they've acted) */}
        {isWolf && wolfVoteCounts && (
          <div className="mt-3 p-3 bg-red-500/10 rounded-xl border border-red-400/20">
            <p className="text-xs font-semibold text-red-400 mb-1.5">
              🐺 {t('game.wolfPackVotes')}
            </p>
            <div className="space-y-1">
              {Object.entries(wolfVoteCounts).map(([targetId, count]) => {
                const targetName = players.find((p) => p.id === targetId)?.username || '???';
                // Find which wolves voted for this target
                const voterIds = Object.entries(werewolfKillVotes)
                  .filter(([, tid]) => tid === targetId)
                  .map(([wolfId]) => wolfId);
                const voterNames = voterIds.map((wid) => {
                  const wolf = werewolfTeam.find((w) => w.id === wid);
                  return wolf?.username || players.find((p) => p.id === wid)?.username || '???';
                });
                return (
                  <div key={targetId} className="flex items-center justify-between text-xs">
                    <span className="text-red-300">🎯 {targetName}</span>
                    <span className="text-red-400/70">
                      {voterNames.join(', ')} ({count})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Allow wolves to change their vote after all wolves have voted */}
        {isWolf && allWolvesVoted && nightActionDone && (
          <div className="mt-3">
            <Button
              className="w-full border border-red-400/40 bg-red-500/10 hover:bg-red-500/20 text-red-300"
              variant="ghost"
              onClick={() => {
                useGameStore.getState().resetNightAction();
              }}
            >
              🔄 {t('game.changeVote')}
            </Button>
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
    Role.SNOW_WOLF,
    Role.VEGETARIAN_WOLF,
    Role.WOLF_FANG,
    Role.PIRATE,
    Role.PLAGUE_DOCTOR,
    Role.CORRUPTOR,
    Role.MONK,
    Role.VAMPIRE,
    Role.CULT_LEADER,
  ].includes(myRole);

  const handleConfirmAction = () => {
    if (!gameId) return;
    let action = 'target';
    if (myRole === Role.WEREWOLF_SEER) action = 'seer_check';
    else if (isWerewolfRole(myRole)) action = 'werewolf_kill';
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
    else if (myRole === Role.MONK) action = 'protect';
    else if (myRole === Role.VAMPIRE) action = vampireAction || 'mark';
    else if (myRole === Role.CULT_LEADER) action = 'recruit';

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
            disabled={!witchHasHealPotion}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
              !witchHasHealPotion
                ? 'bg-night-bg/20 border-night-border/20 opacity-40 cursor-not-allowed'
                : witchAction === 'heal'
                  ? 'bg-emerald-500/25 border-emerald-400 ring-1 ring-emerald-400/40'
                  : 'bg-night-bg/40 border-night-border/30 hover:bg-night-bg/60 hover:border-emerald-400/50'
            }`}
          >
            <span className="text-2xl">💚</span>
            <span
              className={`text-xs font-semibold ${
                !witchHasHealPotion
                  ? 'text-night-muted/50 line-through'
                  : witchAction === 'heal'
                    ? 'text-emerald-300'
                    : 'text-night-muted'
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
            disabled={!witchHasKillPotion}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
              !witchHasKillPotion
                ? 'bg-night-bg/20 border-night-border/20 opacity-40 cursor-not-allowed'
                : witchAction === 'kill'
                  ? 'bg-red-500/25 border-red-400 ring-1 ring-red-400/40'
                  : 'bg-night-bg/40 border-night-border/30 hover:bg-night-bg/60 hover:border-red-400/50'
            }`}
          >
            <span className="text-2xl">☠️</span>
            <span
              className={`text-xs font-semibold ${
                !witchHasKillPotion
                  ? 'text-night-muted/50 line-through'
                  : witchAction === 'kill'
                    ? 'text-red-300'
                    : 'text-night-muted'
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
            <span className="text-xs font-semibold text-night-muted">{t('game.skip')}</span>
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

        {/* Heal mode info — show who was attacked */}
        {witchAction === 'heal' && (
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-400/20 mb-2">
            {witchAttackedTarget ? (
              <p className="text-xs text-emerald-300">
                ⚔️{' '}
                <span className="font-bold">
                  {players.find((p) => p.id === witchAttackedTarget)?.username || '???'}
                </span>{' '}
                {t('game.witchAttackedInfo')}
              </p>
            ) : (
              <p className="text-xs text-emerald-300">{t('game.witchNoAttack')}</p>
            )}
          </div>
        )}

        {witchAction && (
          <div className="mt-3">
            <Button
              className="w-full"
              onClick={handleConfirmAction}
              disabled={
                (witchAction === 'kill' && !selectedTarget) ||
                (witchAction === 'heal' && !witchHasHealPotion) ||
                (witchAction === 'kill' && !witchHasKillPotion)
              }
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

  // ─── Vampire-specific UI ───
  if (myRole === Role.VAMPIRE) {
    return (
      <GlassCard isNight>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🧛</span>
          <div>
            <h3 className="font-heading font-semibold text-night-text">
              {t(`roles.${roleToCamel(myRole)}`)}
            </h3>
            <p className="text-xs text-night-muted">{t('game.vampireChoose')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => setVampireAction('mark')}
            className={`p-3 rounded-lg border text-sm font-semibold transition-all ${
              vampireAction === 'mark'
                ? 'bg-purple-500/30 border-purple-400 text-purple-200'
                : 'bg-night-surface/50 border-night-border/30 text-night-muted hover:border-purple-400/50'
            }`}
          >
            🦇 {t('game.vampireMark')}
          </button>
          <button
            onClick={() => setVampireAction('kill')}
            className={`p-3 rounded-lg border text-sm font-semibold transition-all ${
              vampireAction === 'kill'
                ? 'bg-red-500/30 border-red-400 text-red-200'
                : 'bg-night-surface/50 border-night-border/30 text-night-muted hover:border-red-400/50'
            }`}
          >
            💀 {t('game.vampireKill')}
          </button>
        </div>
        {vampireAction === 'mark' && (
          <div className="mb-3">
            <p className="text-xs text-night-muted mb-2">{t('game.vampireMarkDesc')}</p>
            <PlayerList
              onSelect={(id) => {
                setSelectedTarget(id);
                onSelectPlayer?.(id);
              }}
              selectedId={selectedTarget}
              excludeIds={[user?.id || '']}
              isNight
            />
          </div>
        )}
        {vampireAction && (
          <div className="mt-3">
            <Button
              className="w-full"
              onClick={handleConfirmAction}
              disabled={vampireAction === 'mark' && !selectedTarget}
            >
              {vampireAction === 'mark' ? t('game.vampireMark') : t('game.vampireKillAll')}
            </Button>
          </div>
        )}
      </GlassCard>
    );
  }

  // Roles that can target themselves (Doctor can self-heal, Beast Hunter can self-trap)
  const selfTargetExcludeIds = canSelfTarget ? [] : [user?.id || ''];

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
        excludeIds={selfTargetExcludeIds}
        isNight
        wolfVoteCounts={isWolf ? wolfVoteCounts : undefined}
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
  const { players: rawPlayers, voteState, gameId } = useGameStore();
  // Deduplicate players by ID
  const players = useMemo(() => {
    const seen = new Set<string>();
    return rawPlayers.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [rawPlayers]);
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
  const seerResult = useGameStore((s) => s.seerResult);
  const auraSeerResult = useGameStore((s) => s.auraSeerResult);
  const werewolfSeerResult = useGameStore((s) => s.werewolfSeerResult);

  return (
    <GlassCard isNight={false}>
      <h3 className="font-heading font-semibold mb-4 text-center text-lg">
        {t('game.dawnResult')}
      </h3>

      {/* Seer result display — persisted from night phase */}
      {seerResult && (
        <div className="mb-3 p-3 bg-purple-500/20 rounded-xl border border-purple-400/30">
          <span className="text-2xl block mb-1">🔮</span>
          <p className="text-sm font-semibold text-purple-300">
            {t('game.seerCheckResult', {
              target: players.find((p) => p.id === seerResult.targetId)?.username || '',
              result: t(`seerResult.${seerResult.alignment}`),
            })}
          </p>
          <p
            className={`text-xs mt-1 font-medium ${
              seerResult.alignment === 'good'
                ? 'text-emerald-400'
                : seerResult.alignment === 'evil'
                  ? 'text-red-400'
                  : 'text-amber-400'
            }`}
          >
            {seerResult.alignment === 'good' ? '✅' : seerResult.alignment === 'evil' ? '❌' : '❓'}{' '}
            {t(`seerResult.${seerResult.alignment}`)}
          </p>
        </div>
      )}

      {/* Aura Seer result display */}
      {auraSeerResult && (
        <div className="mb-3 p-3 bg-cyan-500/20 rounded-xl border border-cyan-400/30">
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
        <div className="mb-3 p-3 bg-red-500/20 rounded-xl border border-red-400/30">
          <span className="text-2xl block mb-1">🐺🔮</span>
          <p className="text-sm font-semibold text-red-300">
            {t('game.wolfSeerCheckResult', {
              target: players.find((p) => p.id === werewolfSeerResult.targetId)?.username || '',
              role: t(`roles.${roleToCamel(werewolfSeerResult.role)}`),
            })}
          </p>
        </div>
      )}

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

// ─── Role List Button with Popover ─────────────────────────────
function RoleListButton({ isNight }: { isNight: boolean }) {
  const t = useTranslations();
  const roleList = useGameStore((s) => s.roleList);
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  if (roleList.length === 0) return null;

  // Count occurrences of each role
  const roleCounts = roleList.reduce<Record<string, number>>((acc, role) => {
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="pointer-events-auto relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all backdrop-blur-xl border ${
          isNight
            ? 'bg-night-card/70 border-night-border/50 text-night-text hover:bg-night-card/90'
            : 'bg-white/70 border-day-border/50 text-day-text hover:bg-white/90'
        }`}
      >
        <span>🎭</span>
        <span>{t('game.viewRoles')}</span>
        <Badge variant={isNight ? 'warning' : 'info'}>{roleList.length}</Badge>
        <span className="text-[10px]">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Popover panel */}
          <div
            className={`absolute top-full mt-2 z-50 min-w-[240px] max-w-[360px] rounded-xl border backdrop-blur-xl shadow-xl ${
              isNight
                ? 'bg-night-card/90 border-night-border/50'
                : 'bg-white/90 border-day-border/50'
            }`}
          >
            <div className="px-3 py-2 border-b border-inherit">
              <p
                className={`text-xs font-semibold ${isNight ? 'text-night-text' : 'text-day-text'}`}
              >
                🎭 {t('game.rolesInGame')} ({roleList.length})
              </p>
            </div>
            <div className="p-2 grid grid-cols-2 gap-1">
              {Object.entries(roleCounts).map(([role, count]) => (
                <div
                  key={role}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs cursor-default transition-colors ${
                    hoveredRole === role
                      ? isNight
                        ? 'bg-night-border/60 text-night-text'
                        : 'bg-primary/10 text-day-text'
                      : isNight
                        ? 'bg-night-bg/50 text-night-text hover:bg-night-border/40'
                        : 'bg-day-bg/50 text-day-text hover:bg-primary/5'
                  }`}
                  onMouseEnter={() => setHoveredRole(role)}
                  onMouseLeave={() => setHoveredRole(null)}
                  onClick={() => setHoveredRole(hoveredRole === role ? null : role)}
                >
                  <span className="text-sm">{ROLE_ICONS[role] || '❓'}</span>
                  <span className="truncate">{t(`roles.${roleToCamel(role)}`)}</span>
                  {count > 1 && (
                    <Badge variant="info" className="ml-auto">
                      ×{count}
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Role description tooltip */}
            {hoveredRole && (
              <div
                className={`px-3 py-2.5 border-t text-xs leading-relaxed ${
                  isNight
                    ? 'border-night-border/30 bg-night-bg/60 text-night-text/90'
                    : 'border-day-border/30 bg-day-bg/60 text-day-text/90'
                }`}
              >
                <p className="font-semibold mb-0.5">
                  {ROLE_ICONS[hoveredRole] || '❓'} {t(`roles.${roleToCamel(hoveredRole)}`)}
                </p>
                <p className="opacity-80">{t(`role.${roleToCamel(hoveredRole)}.desc`)}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
function DeathLog({ isNight }: { isNight: boolean }) {
  const t = useTranslations();
  const deathLog = useGameStore((s) => s.deathLog);
  const [isOpen, setIsOpen] = useState(true); // default open

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
    <div className="pointer-events-auto relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all backdrop-blur-xl border ${
          isNight
            ? 'bg-night-card/70 border-night-border/50 text-night-text hover:bg-night-card/90'
            : 'bg-white/70 border-day-border/50 text-day-text hover:bg-white/90'
        }`}
      >
        <span>💀</span>
        <span>{t('game.deathLog')}</span>
        <Badge variant="danger">{deathLog.length}</Badge>
        <span className="text-[10px]">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className={`absolute top-full mt-2 left-0 z-50 w-56 rounded-xl border backdrop-blur-xl shadow-xl ${
              isNight
                ? 'bg-night-card/95 border-night-border/60'
                : 'bg-white/95 border-day-border/60'
            }`}
          >
            <div className="p-2.5 space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
              {deathLog.map((entry, i) => (
                <div key={`${entry.playerId}-${i}`} className="flex items-center gap-2 text-xs">
                  <span>{causeIcons[entry.cause] || '💀'}</span>
                  <span className="font-semibold text-danger truncate">{entry.playerName}</span>
                  <span className={`truncate ${isNight ? 'text-night-muted' : 'text-day-muted'}`}>
                    {causeLabels[entry.cause] || entry.cause}
                  </span>
                  <span
                    className={`ml-auto text-[10px] flex-shrink-0 ${isNight ? 'text-night-muted' : 'text-day-muted'}`}
                  >
                    R{entry.round}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Intro Story Overlay — Cinematic line-by-line ─────────────────────────────
const INTRO_LINE_COUNT = 6;
const LINE_DELAY_MS = 1800; // time between each line appearing
const INTRO_TOTAL_DURATION_MS = INTRO_LINE_COUNT * LINE_DELAY_MS + 2000; // total display time

function IntroStoryOverlay() {
  const t = useTranslations();
  const [visibleLines, setVisibleLines] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const phase = useGameStore((s) => s.phase);
  const phaseEndAt = useGameStore((s) => s.phaseEndAt);

  useEffect(() => {
    // Calculate remaining intro time from server's phaseEndAt to stay in sync.
    // If the server INTRO phase has already ended (phase !== INTRO), use the
    // full client-side duration so the overlay still plays once on cold start.
    let totalDuration = INTRO_TOTAL_DURATION_MS;
    if (phase === GamePhase.INTRO && phaseEndAt) {
      const remaining = phaseEndAt - Date.now();
      if (remaining > 0) {
        totalDuration = Math.min(remaining, INTRO_TOTAL_DURATION_MS);
      }
    }
    // Scale line delay proportionally if we have less time
    const scaledLineDelay = Math.min(LINE_DELAY_MS, (totalDuration - 1000) / INTRO_LINE_COUNT);

    // Show title immediately, then stagger story lines
    const timers: NodeJS.Timeout[] = [];
    for (let i = 1; i <= INTRO_LINE_COUNT; i++) {
      timers.push(setTimeout(() => setVisibleLines(i), i * scaledLineDelay));
    }
    // Start fade-out near the end
    timers.push(setTimeout(() => setFadeOut(true), totalDuration - 800));
    // Auto-dismiss the intro overlay after total duration
    timers.push(
      setTimeout(() => {
        useGameStore.getState().setShouldShowIntro(false);
      }, totalDuration),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lines = Array.from({ length: INTRO_LINE_COUNT }, (_, i) => t(`game.introLine${i + 1}`));

  return (
    <div
      className={`absolute inset-0 z-[100] flex items-center justify-center bg-black/95 transition-opacity duration-700 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="w-full max-w-lg px-8">
        {/* Moon + Title */}
        <div className="text-center mb-8 animate-fade-in">
          <span className="text-6xl block mb-4 animate-pulse drop-shadow-[0_0_40px_rgba(255,200,50,0.6)]">
            🌕
          </span>
          <h2 className="font-heading font-bold text-2xl text-amber-100 drop-shadow-lg">
            {t('game.introTitle')}
          </h2>
        </div>

        {/* Story lines — appear one by one */}
        <div className="space-y-3">
          {lines.map((line, idx) => (
            <p
              key={idx}
              className="text-sm leading-relaxed drop-shadow-md transition-all duration-700"
              style={{
                opacity: idx < visibleLines ? 1 : 0,
                transform: idx < visibleLines ? 'translateY(0)' : 'translateY(12px)',
                color:
                  idx === INTRO_LINE_COUNT - 1 && idx < visibleLines
                    ? '#fbbf24' // amber highlight for last line
                    : '#d1d5db', // gray-300
                fontWeight: idx === INTRO_LINE_COUNT - 1 ? 600 : 400,
                fontStyle: idx === 0 ? 'italic' : 'normal',
              }}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
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
  const [firePos, setFirePos] = useState<[number, number, number] | undefined>(undefined);
  const [mapScene, setMapScene] = useState<THREE.Object3D | null>(null);
  const [collisionData, setCollisionData] = useState<CollisionData | null>(null);

  // Camera mode toggle: panoramic (overview) vs thirdPerson (follow character)
  const [cameraMode, setCameraMode] = useState<'panoramic' | 'thirdPerson'>('panoramic');
  const localPlayerPosRef = useRef<THREE.Vector3 | null>(null);
  const localPlayerRotRef = useRef<number>(0);
  const [localPlayerPos, setLocalPlayerPos] = useState<THREE.Vector3 | null>(null);
  const [localPlayerRot, setLocalPlayerRot] = useState<number>(0);

  const handleFireDetected = useCallback((pos: { x: number; y: number; z: number }) => {
    console.log(
      '[Game3D] Fire detected at world pos:',
      pos.x.toFixed(2),
      pos.y.toFixed(2),
      pos.z.toFixed(2),
    );
    setFirePos([pos.x, pos.y, pos.z]);
  }, []);

  const handleMapSceneReady = useCallback((scene: THREE.Object3D) => {
    console.log('[Game3D] Map scene ready');
    setMapScene(scene);
  }, []);

  const handleCollisionDataReady = useCallback((data: CollisionData) => {
    console.log(
      '[Game3D] Collision data ready:',
      data.walkableMeshes.length,
      'walkable,',
      data.blockingMeshes.length,
      'blocking',
    );
    setCollisionData(data);
  }, []);

  const handleCameraToggle = useCallback(() => {
    setCameraMode((prev) => (prev === 'panoramic' ? 'thirdPerson' : 'panoramic'));
  }, []);

  // Throttled position update to avoid excessive re-renders
  const lastPosUpdateRef = useRef(0);
  const handleLocalPlayerPosition = useCallback((pos: THREE.Vector3, rot: number) => {
    localPlayerPosRef.current = pos;
    localPlayerRotRef.current = rot;
    // Throttle state updates to ~30fps
    const now = Date.now();
    if (now - lastPosUpdateRef.current > 33) {
      lastPosUpdateRef.current = now;
      setLocalPlayerPos(pos.clone());
      setLocalPlayerRot(rot);
    }
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full">
      <ForestScene
        isNight={isNight}
        onFireDetected={handleFireDetected}
        onMapSceneReady={handleMapSceneReady}
        onCollisionDataReady={handleCollisionDataReady}
        cameraMode={cameraMode}
        localPlayerPosition={localPlayerPos}
        localPlayerRotation={localPlayerRot}
      >
        {/* Only render players once map data and collision are ready to ensure correct positioning */}
        {firePos && mapScene && collisionData && (
          <PlayerCircle
            players={players}
            selectedId={selectedId}
            onSelect={onSelect}
            isNight={isNight}
            chatBubbles={chatBubbles}
            firePosition={firePos}
            mapScene={mapScene}
            collisionData={collisionData}
            onLocalPlayerPosition={handleLocalPlayerPosition}
            onCameraToggle={handleCameraToggle}
          />
        )}
      </ForestScene>
      {/* Camera mode indicator */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        <div
          className={`px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm border ${
            isNight
              ? 'bg-night-card/60 border-night-border/40 text-night-text/80'
              : 'bg-white/60 border-day-border/40 text-day-text/80'
          }`}
        >
          <span className="opacity-60">Y</span>{' '}
          {cameraMode === 'panoramic' ? '🌐 Panoramic' : '🎮 Third Person'}
        </div>
      </div>
    </div>
  );
}

// ─── Main Game Page ─────────────────────────────
export default function GamePage() {
  const t = useTranslations();
  const router = useRouter();
  const {
    phase,
    myRole,
    phaseEndAt,
    winners,
    round,
    gameId,
    players: rawGamePlayers,
  } = useGameStore();
  // Deduplicate players to prevent React key errors (bot IDs can occasionally duplicate)
  const players = useMemo(() => {
    const seen = new Set<string>();
    return rawGamePlayers.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [rawGamePlayers]);
  const isAlive = useGameStore((s) => s.isAlive);
  const shouldShowIntro = useGameStore((s) => s.shouldShowIntro);
  const lastRoomCode = useGameStore((s) => s.lastRoomCode);
  const deathLog = useGameStore((s) => s.deathLog);
  const { user } = useAuthStore();

  // ── Voice chat ── (disabled — video meet panel handles audio+video now)
  const roomCode = useRoomStore((s) => s.currentRoom?.code ?? null);

  // ── Sound effects (subscribe to game state changes) ──
  useGameSounds();

  // ── Player selection state (used for voting + night actions + 3D highlight) ──
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  // ── Mobile bottom panel tab (toggle action panel vs chat) ──

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
      // After F5 on /game, the socket needs time to reconnect and receive game state.
      // The auth token is persisted → socket auto-reconnects → server sends game:started.
      // Use 8s timeout (up from 3s) to handle slow connections and server cold starts.
      const timer = setTimeout(() => {
        const state = useGameStore.getState();
        if (!state.gameId) {
          // Only redirect back to the specific room if this was an F5 reload.
          // Detect F5 reload via performance.navigation or PerformanceNavigationTiming.
          const isReload =
            typeof window !== 'undefined' &&
            ((performance.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming)
              ?.type === 'reload' ||
              (performance as any).navigation?.type === 1);

          if (isReload && state.lastRoomCode) {
            // F5 reload — go back to the room page to re-sync
            const roomCode = state.lastRoomCode;
            state.resetGame();
            router.push(`/room/${roomCode}`);
          } else {
            // Intentional navigation or no room — go to lobby
            state.resetGame();
            router.push('/rooms');
          }
        }
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [gameId, winners, router]);

  const phaseLabels: Record<string, string> = {
    [GamePhase.INTRO]: `📖 ${t('game.introTitle')}`,
    [GamePhase.STARTING]: `🎭 ${t('game.gameStarting')}`,
    [GamePhase.NIGHT]: t('phases.night'),
    [GamePhase.DAWN]: t('phases.dawn'),
    [GamePhase.DAY]: t('phases.day'),
    [GamePhase.VOTE]: t('phases.vote'),
    [GamePhase.VOTE_RESULT]: t('phases.voteResult'),
    [GamePhase.LAST_WORDS]: t('phases.lastWords'),
    [GamePhase.GAME_OVER]: t('phases.gameOver'),
  };

  const isNight =
    phase === GamePhase.NIGHT || phase === GamePhase.STARTING || phase === GamePhase.INTRO;

  // ── Game Over screen with full summary ──
  if (winners) {
    // Use revealed players from server (with roles exposed), fallback to game state players
    const allPlayers = winners.revealedPlayers || players;
    const winnerIds = new Set(winners.playerIds);

    // Build player name lookup for action log
    const playerNameMap: Record<string, string> = {};
    for (const p of allPlayers) {
      playerNameMap[p.id] = p.username;
    }

    // Determine team color/icon for each player
    const getTeamColor = (team?: Team) => {
      if (!team) return 'text-day-muted';
      if (team === Team.VILLAGE) return 'text-emerald-600';
      if (team === Team.WEREWOLF) return 'text-red-500';
      return 'text-purple-500';
    };

    // Group game log by round
    const gameLog = winners.gameLog || [];
    const logByRound: Map<number, GameLogEntry[]> = new Map();
    for (const entry of gameLog) {
      if (!logByRound.has(entry.round)) logByRound.set(entry.round, []);
      logByRound.get(entry.round)!.push(entry);
    }
    const roundNumbers = Array.from(logByRound.keys()).sort((a, b) => a - b);

    // Helper to get seer result translation
    const getSeerResultText = (result?: string) => {
      if (!result) return '';
      if (result === 'good' || result === 'GOOD') return t('game.seer_good');
      if (result === 'evil' || result === 'EVIL') return t('game.seer_evil');
      if (result === 'unknown' || result === 'UNKNOWN') return t('game.seer_unknown');
      // If it's a role name (werewolf seer result), translate it
      return t(`roles.${roleToCamel(result)}`);
    };

    // Helper to render an action log entry
    const renderActionEntry = (entry: GameLogEntry, idx: number) => {
      const targetName = entry.targetId ? playerNameMap[entry.targetId] || '???' : '???';
      const actionKey = `game.action_${entry.action}`;
      const resultText = entry.result ? getSeerResultText(entry.result) : '';

      // Phase-based background color
      const bgColor =
        entry.phase === 'night'
          ? 'bg-indigo-50/60'
          : entry.phase === 'vote'
            ? 'bg-amber-50/60'
            : 'bg-sky-50/60';

      return (
        <div
          key={`${entry.round}-${entry.action}-${entry.targetId}-${idx}`}
          className={`text-xs px-2.5 py-1.5 rounded-lg ${bgColor} text-day-text`}
        >
          {t(actionKey, { target: targetName, result: resultText })}
        </div>
      );
    };

    // Format duration
    const durationText = winners.duration
      ? t('game.gameDuration', {
          minutes: Math.floor(winners.duration / 60),
          seconds: winners.duration % 60,
        })
      : null;

    return (
      <div className="relative w-full h-screen-safe overflow-hidden">
        <Suspense fallback={null}>
          <Game3DScene isNight={false} players={players} />
        </Suspense>
        <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
          <GlassCard
            isNight={false}
            className="max-w-lg w-full mx-auto max-h-[90vh] overflow-y-auto [scrollbar-color:transparent_transparent] "
          >
            {/* Winner banner */}
            <div className="text-center mb-4">
              <span className="text-5xl block mb-2">
                {winners.team === Team.VILLAGE
                  ? '🏘️'
                  : winners.team === Team.WEREWOLF
                    ? '🐺'
                    : '🎭'}
              </span>
              <h1 className="text-2xl font-heading font-bold mb-1">{t('game.gameOver')}</h1>
              <p className="text-lg font-semibold text-primary">
                {t(`game.win_${winners.team.toLowerCase()}`)}
              </p>
              {myRole && (
                <p className="text-sm text-day-muted mt-1">
                  {t('game.yourRole')}: {ROLE_ICONS[myRole] || '❓'}{' '}
                  {t(`roles.${roleToCamel(myRole)}`)}
                </p>
              )}
              {/* Game stats */}
              <div className="flex items-center justify-center gap-3 mt-2 text-xs text-day-muted">
                {winners.rounds && (
                  <span>📊 {t('game.totalRounds', { rounds: winners.rounds })}</span>
                )}
                {durationText && <span>⏱️ {durationText}</span>}
              </div>
            </div>

            {/* All players reveal */}
            <div className="mb-4">
              <h2 className="text-sm font-heading font-bold text-day-text mb-2 uppercase tracking-wider">
                {t('game.summaryPlayers')}
              </h2>
              <div className="space-y-1.5">
                {allPlayers.map((p) => {
                  const isWinner = winnerIds.has(p.id);
                  const isMe = p.id === user?.id;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                        isWinner
                          ? 'bg-yellow-50 border border-yellow-200'
                          : p.isAlive
                            ? 'bg-day-card'
                            : 'bg-day-card/50 opacity-70'
                      }`}
                    >
                      <span className="text-base flex-shrink-0">
                        {p.role ? ROLE_ICONS[p.role] || '❓' : '❓'}
                      </span>
                      <span
                        className={`font-semibold truncate ${isMe ? 'text-primary' : 'text-day-text'}`}
                      >
                        {p.username}
                        {isMe && ' ⭐'}
                      </span>
                      <span
                        className={`ml-auto text-xs font-medium flex-shrink-0 ${getTeamColor(p.team)}`}
                      >
                        {p.role ? t(`roles.${roleToCamel(p.role)}`) : '???'}
                      </span>
                      {!p.isAlive && <span className="text-xs text-red-400 flex-shrink-0">☠️</span>}
                      {isWinner && <span className="text-xs flex-shrink-0">🏆</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Game Action Timeline (round-by-round) */}
            {roundNumbers.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm font-heading font-bold text-day-text mb-2 uppercase tracking-wider">
                  {t('game.actionLog')}
                </h2>
                <div className="space-y-3">
                  {roundNumbers.map((round) => {
                    const entries = logByRound.get(round) || [];
                    // Split by phase
                    const nightEntries = entries.filter((e) => e.phase === 'night');
                    const dayEntries = entries.filter((e) => e.phase === 'day');
                    const voteEntries = entries.filter((e) => e.phase === 'vote');

                    return (
                      <div
                        key={round}
                        className="border border-day-border/30 rounded-lg overflow-hidden"
                      >
                        {/* Night phase entries */}
                        {nightEntries.length > 0 && (
                          <div>
                            <div className="px-2.5 py-1 bg-indigo-100/80 text-xs font-bold text-indigo-700 uppercase tracking-wide">
                              🌙 {t('game.nightPhase', { round })}
                            </div>
                            <div className="px-1 py-1 space-y-0.5">
                              {nightEntries.map((e, i) => renderActionEntry(e, i))}
                            </div>
                          </div>
                        )}
                        {/* Day phase entries */}
                        {dayEntries.length > 0 && (
                          <div>
                            <div className="px-2.5 py-1 bg-sky-100/80 text-xs font-bold text-sky-700 uppercase tracking-wide">
                              ☀️ {t('game.dayPhase', { round })}
                            </div>
                            <div className="px-1 py-1 space-y-0.5">
                              {dayEntries.map((e, i) => renderActionEntry(e, i))}
                            </div>
                          </div>
                        )}
                        {/* Vote phase entries */}
                        {voteEntries.length > 0 && (
                          <div>
                            <div className="px-2.5 py-1 bg-amber-100/80 text-xs font-bold text-amber-700 uppercase tracking-wide">
                              🗳️ {t('game.votePhase', { round })}
                            </div>
                            <div className="px-1 py-1 space-y-0.5">
                              {voteEntries.map((e, i) => renderActionEntry(e, i))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fallback: simple death log if no game action log available */}
            {roundNumbers.length === 0 && deathLog.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm font-heading font-bold text-day-text mb-2 uppercase tracking-wider">
                  {t('game.deathLog')}
                </h2>
                <div className="space-y-1">
                  {deathLog.map((entry, i) => (
                    <div
                      key={`${entry.playerId}-${i}`}
                      className="flex items-center gap-2 text-xs text-day-muted px-2 py-1.5 bg-red-50/50 rounded-lg"
                    >
                      <span className="font-medium text-day-text">{entry.playerName}</span>
                      <span className="text-red-400">
                        {entry.cause === 'night'
                          ? t('game.deathNight')
                          : entry.cause === 'voted'
                            ? t('game.deathVoted')
                            : t('game.deathGunner')}
                      </span>
                      <span className="ml-auto text-day-muted">
                        {t('game.round', { round: entry.round })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Back button */}
            <Button
              className="w-full sticky bottom-0"
              onClick={() => {
                const roomCode = useGameStore.getState().lastRoomCode;
                useGameStore.getState().resetGame();
                if (roomCode) {
                  router.push(`/room/${roomCode}`);
                } else {
                  router.push('/rooms');
                }
              }}
            >
              {lastRoomCode ? t('game.backToRoom') : t('game.backToLobby')}
            </Button>
          </GlassCard>
        </div>
      </div>
    );
  }

  // ── Loading screen ──
  if (!gameId) {
    return (
      <div className="w-full h-screen-safe flex items-center justify-center bg-day-bg">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-day-muted">{t('common.loading')}</p>
          <p className="text-day-muted/60 text-xs mt-2">{t('game.reconnecting')}</p>
        </div>
      </div>
    );
  }

  // ── Main game view ──
  return (
    <div className="relative w-full h-screen-safe overflow-hidden">
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

      {/* Toast notifications (Witch alerts, dawn deaths, etc.) */}
      <GameToastContainer />

      {/* ── INTRO Phase: Cinematic line-by-line story overlay (client-side tracked) ── */}
      {shouldShowIntro && <IntroStoryOverlay />}

      {/* ── STARTING Phase: Full-screen role reveal ── */}
      {phase === GamePhase.STARTING && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center px-6 max-w-md animate-fade-in">
            <span className="text-6xl block mb-4 animate-bounce">🎭</span>
            <h2 className="font-heading font-bold text-2xl mb-3 text-white drop-shadow-lg">
              {t('game.gameStarting')}
            </h2>
            {myRole && (
              <div className="mt-4 p-5 bg-primary/20 backdrop-blur-xl rounded-2xl border border-primary/30 inline-block">
                <p className="text-sm text-gray-300 mb-2">{t('game.yourRole')}</p>
                <p className="text-3xl font-heading font-bold text-primary drop-shadow-lg">
                  {ROLE_ICONS[myRole] || '❓'} {t(`roles.${roleToCamel(myRole)}`)}
                </p>
              </div>
            )}
            <div className="mt-6">
              <PhaseTimer endAt={phaseEndAt} isNight />
            </div>
          </div>
        </div>
      )}

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
        {/* Top Bar: Phase + Timer + Role */}
        <div className="pointer-events-auto">
          <div className="flex items-center justify-between px-2 py-2 md:px-4 md:py-3 gap-2">
            <div className="flex items-center gap-1.5 md:gap-3 flex-wrap min-w-0">
              <GlassCard isNight={isNight} className="!py-1.5 !px-2.5 md:!py-2 md:!px-4">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <h2 className="text-xs md:text-sm font-heading font-bold truncate">
                    {phase ? phaseLabels[phase] || phase : '...'}
                  </h2>
                  <Badge variant={isNight ? 'warning' : 'info'}>{t('game.round', { round })}</Badge>
                </div>
              </GlassCard>

              {myRole && (
                <GlassCard
                  isNight={isNight}
                  className="!py-1.5 !px-2 md:!py-2 md:!px-3 hidden sm:block"
                >
                  <p className="text-xs font-semibold opacity-80 truncate">
                    {t('game.yourRole')}: {t(`roles.${roleToCamel(myRole)}`)}
                  </p>
                </GlassCard>
              )}

              {/* Role list button - positioned near the role display */}
              <RoleListButton isNight={isNight} />

              {/* Video meeting panel - beside role list */}
              <JitsiMeetPanel roomCode={roomCode} displayName={user?.username} isNight={isNight} />

              {/* Death Log - inline in top bar, always visible */}
              <DeathLog isNight={isNight} />
            </div>

            <GlassCard isNight={isNight} className="!py-1 !px-3 md:!px-4 flex-shrink-0">
              <PhaseTimer endAt={phaseEndAt} isNight={isNight} />
            </GlassCard>
          </div>
          {/* Mobile-only compact role badge */}
          {myRole && (
            <div className="sm:hidden px-2 pb-1">
              <GlassCard isNight={isNight} className="!py-1 !px-2.5 inline-block">
                <p className="text-[10px] font-semibold opacity-80">
                  {t('game.yourRole')}: {t(`roles.${roleToCamel(myRole)}`)}
                </p>
              </GlassCard>
            </div>
          )}
        </div>

        {/* Dead indicator */}
        {!isAlive && (
          <div className="pointer-events-auto flex justify-center mt-1">
            <GlassCard isNight={isNight} className="!py-1.5 !px-4 bg-danger/20 border-danger/30">
              <p className="text-xs font-semibold text-danger">💀 {t('game.dead')}</p>
            </GlassCard>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom: Action Panel */}
        <div className="pointer-events-auto p-2 md:p-3 pb-[env(safe-area-inset-bottom,8px)]">
          <div className="max-w-md w-full">
            {/* Action Panel */}
            <div>
              {phase === GamePhase.NIGHT && isAlive && (
                <NightActionPanel
                  selectedPlayerId={selectedPlayerId}
                  onSelectPlayer={setSelectedPlayerId}
                />
              )}
              {phase === GamePhase.NIGHT && !isAlive && (
                <GlassCard isNight className="text-center py-4 md:py-6">
                  <span className="text-3xl md:text-4xl block mb-2">💀</span>
                  <p className="text-night-muted text-xs md:text-sm">{t('game.dead')}</p>
                </GlassCard>
              )}
              {phase === GamePhase.DAWN && <DawnPanel />}
              {phase === GamePhase.DAY && (
                <div className="space-y-2 md:space-y-3">
                  <GlassCard isNight={false}>
                    <h3 className="font-heading font-semibold mb-2 text-xs md:text-sm">
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
                <GlassCard isNight={false} className="text-center py-4 md:py-6">
                  <span className="text-3xl md:text-4xl block mb-2">🗳️</span>
                  <h3 className="font-heading font-semibold text-base md:text-lg">
                    {t('phases.voteResult')}
                  </h3>
                </GlassCard>
              )}
              {phase === GamePhase.LAST_WORDS && (
                <GlassCard isNight={false} className="text-center py-4 md:py-6">
                  <span className="text-3xl md:text-4xl block mb-2">💬</span>
                  <h3 className="font-heading font-semibold text-base md:text-lg">
                    {t('phases.lastWords')}
                  </h3>
                </GlassCard>
              )}
              {/* INTRO and STARTING phases render as full-screen overlays below */}
            </div>
          </div>
        </div>

        {/* Chat Panel — fixed bottom-right */}
        <div className="pointer-events-auto fixed bottom-2 right-2 md:bottom-3 md:right-3 z-20 w-80 md:w-96 lg:w-[25rem] h-40rem md:h-[28rem] lg:h-[30rem]">
          <ChatPanel isNight={isNight} />
        </div>
      </div>
    </div>
  );
}
