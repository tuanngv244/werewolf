'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/lib/navigation';
import { Button } from '@/components/ui';
import { Modal } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';
import { getSocket, waitForConnection } from '@/lib/socket';
import { Role, Team } from '@shared/types/game.types';
import { ROLE_DEFINITIONS } from '@shared/constants/roles';

export default function HomePage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const { user, guestLogin, isLoading } = useAuthStore();
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [nameError, setNameError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const joinListenersRef = useRef<(() => void) | null>(null);
  const demoListenersRef = useRef<(() => void) | null>(null);

  // Modal states
  const [selectedRole, setSelectedRole] = useState<{
    icon: string;
    key: string;
    team: string;
    color: string;
  } | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // ─── Dynamic role lists from shared constants ────────────────────
  const ROLE_EMOJI: Record<string, string> = {
    villager: '🏘️', doctor: '💊', gunner: '🔫', seer: '🔮', aura_seer: '✨',
    medium: '👻', witch: '🧙', avenger: '⚔️', beast_hunter: '🪤', cursed: '🌑',
    bodyguard: '🛡️', priest: '✝️', vigilante: '🔫', spy: '🕵️', jailer: '🔒',
    grave_robber: '⚰️', elder: '👴', baker: '🍞', drunk: '🍺',
    mayor: '🎩', pacifist: '☮️', sleepwalker: '😴', hermit: '🏔️', apprentice_seer: '🌟',
    werewolf: '🐺', werewolf_shaman: '🐺', alpha_werewolf: '🐺', werewolf_seer: '🐺',
    nightmare_wolf: '🐺', shadow_wolf: '🐺', blood_moon_wolf: '🐺', howler_wolf: '🐺',
    lone_wolf: '🐺', venom_wolf: '🐺', infector_wolf: '🐺', stalker_wolf: '🐺', cursed_wolf: '🐺',
    headhunter: '🎯', fool: '🃏', bomber: '💣', serial_killer: '🔪', cupid: '💘',
    arsonist: '🔥', survivor: '🦺', amnesiac: '❓', doppelganger: '🪞', jester: '🤡',
    pirate: '🏴‍☠️', plague_doctor: '🩺', corruptor: '😈',
  };

  // Convert 'alpha_werewolf' to 'alphaWerewolf' for i18n key
  const roleToKey = (role: string) => role.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

  // Team color mappings
  const teamColors: Record<string, string> = {
    village: 'bg-green-500/10 text-green-700 hover:bg-green-500/20',
    werewolf: 'bg-red-500/10 text-red-700 hover:bg-red-500/20',
    solo: 'bg-purple-500/10 text-purple-700 hover:bg-purple-500/20',
  };

  // Build dynamic role lists from ROLE_DEFINITIONS
  const allRoles = useMemo(() => Object.values(Role), []);
  const villageRoles = useMemo(() =>
    allRoles.filter((r) => ROLE_DEFINITIONS[r].team === Team.VILLAGE),
  [allRoles]);
  const werewolfRoles = useMemo(() =>
    allRoles.filter((r) => ROLE_DEFINITIONS[r].team === Team.WEREWOLF),
  [allRoles]);
  const soloRoles = useMemo(() =>
    allRoles.filter((r) => ROLE_DEFINITIONS[r].team === Team.SOLO),
  [allRoles]);

  const toggleLocale = () => {
    const nextLocale = locale === 'en' ? 'vi' : 'en';
    router.replace(pathname, { locale: nextLocale });
  };

  // Cleanup socket.once listeners on unmount
  useEffect(() => {
    return () => {
      joinListenersRef.current?.();
      demoListenersRef.current?.();
    };
  }, []);

  // Check if user typed a new name that differs from stored username
  const needsReLogin = (enteredName: string) => {
    if (!user) return true;
    // Strip any legacy #NNNN suffix or trailing digits for comparison
    const storedBase = user.username.replace(/#\d{4}$/, '');
    return enteredName.length >= 2 && enteredName !== storedBase && enteredName !== user.username;
  };

  const handleQuickPlay = async () => {
    const name = playerName.trim();
    if (!name || name.length < 2) {
      setNameError(t('home.nameRequired'));
      return;
    }
    setNameError('');
    if (!user || needsReLogin(name)) {
      await guestLogin(name);
    }
    router.push('/rooms');
  };

  const handleJoinByCode = async () => {
    if (!roomCode.trim() || isJoining) return;
    const name = playerName.trim();
    if (!name || name.length < 2) {
      setNameError(t('home.nameRequired'));
      return;
    }
    setNameError('');
    setJoinError('');
    setIsJoining(true);

    try {
      // Ensure user is authenticated (re-login if name changed)
      if (!user || needsReLogin(name)) {
        await guestLogin(name);
      }

      // Wait for socket to be connected
      const socket = await waitForConnection();
      const code = roomCode.trim().toUpperCase();

      // Clean up any previous listeners
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

  const handleDemoRoom = async () => {
    if (isDemoLoading) return;
    const name = playerName.trim();
    if (!name || name.length < 2) {
      setNameError(t('home.nameRequired'));
      return;
    }
    setNameError('');
    setIsDemoLoading(true);

    try {
      // Ensure user is authenticated (re-login if name changed)
      if (!user || needsReLogin(name)) {
        await guestLogin(name);
      }

      const socket = await waitForConnection();

      // Clean up any previous listeners
      demoListenersRef.current?.();

      const cleanup = () => {
        socket.off('game:started', onGameStarted);
        socket.off('room:error', onError);
      };

      const onGameStarted = () => {
        cleanup();
        demoListenersRef.current = null;
        setIsDemoLoading(false);
        // GameStartRedirect will auto-navigate to /game
      };

      const onError = (err: { message: string }) => {
        cleanup();
        demoListenersRef.current = null;
        setIsDemoLoading(false);
        setJoinError(err.message || 'Failed to create demo room');
      };

      demoListenersRef.current = cleanup;
      socket.once('game:started', onGameStarted);
      socket.once('room:error', onError);
      socket.emit('room:create_demo', { playerCount: 8 });

      // Timeout fallback
      setTimeout(() => {
        if (demoListenersRef.current === cleanup) {
          cleanup();
          demoListenersRef.current = null;
          setIsDemoLoading(false);
          setJoinError('Connection timeout. Please try again.');
        }
      }, 10000);
    } catch {
      setIsDemoLoading(false);
      setJoinError('Failed to connect. Please try again.');
    }
  };

  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Language Toggle */}
      <button
        onClick={toggleLocale}
        className="absolute top-4 right-4 z-10 px-3 py-2 rounded-xl border-2 border-day-border bg-white/80 backdrop-blur-sm hover:bg-white hover:border-primary transition-all text-sm font-semibold text-day-text shadow-sm"
      >
        {locale === 'en' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English'}
      </button>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="animate-float mb-8">
          <div className="w-32 h-32 rounded-full overflow-hidden mx-auto shadow-lg border-4 border-primary/30">
            <img src="/wolf-face.jpg" alt="Werewolf" className="w-full h-full object-cover" />
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-heading font-bold text-day-text mb-4">
          {t('home.title')}
        </h1>

        <p className="text-lg md:text-xl text-day-muted max-w-xl mb-10">{t('home.subtitle')}</p>

        {/* Name Input */}
        <div className="w-full max-w-sm mb-6">
          <label className="block text-sm font-semibold text-day-text mb-2 text-left">
            {t('home.enterName')}
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => {
              setPlayerName(e.target.value);
              if (nameError) setNameError('');
            }}
            placeholder={t('home.enterNamePlaceholder')}
            maxLength={20}
            className="w-full px-4 py-3 rounded-xl border-2 border-day-border bg-white text-day-text placeholder-day-muted focus:outline-none focus:border-primary transition-colors"
          />
          {nameError && <p className="text-sm text-red-500 mt-1 text-left">{nameError}</p>}
        </div>

        {/* Play / Login / Demo Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <Button size="lg" onClick={handleQuickPlay} isLoading={isLoading}>
            {t('home.quickPlay')}
          </Button>
          {/* <Button size="lg" variant="secondary" onClick={() => router.push('/login')}>
            {t('home.login')}
          </Button> */}
        </div>

        {/* Demo Room Button */}
        <div className="mb-8">
          <Button
            size="lg"
            variant="ghost"
            onClick={handleDemoRoom}
            isLoading={isDemoLoading}
            className="border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5"
          >
            🤖 {t('home.demoRoom')}
          </Button>
          <p className="text-xs text-day-muted mt-2">{t('home.demoRoomDesc')}</p>
        </div>

        {/* Join by Room Code */}
        <div className="w-full max-w-sm">
          <p className="text-sm text-day-muted mb-2">{t('home.joinByCode')}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                setJoinError('');
              }}
              placeholder={t('home.joinByCodePlaceholder')}
              maxLength={8}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-day-border bg-white text-day-text placeholder-day-muted focus:outline-none focus:border-primary transition-colors uppercase tracking-widest font-mono text-center"
              onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
            />
            <Button onClick={handleJoinByCode} disabled={!roomCode.trim()} isLoading={isJoining}>
              {t('home.joinRoom')}
            </Button>
          </div>
          {joinError && <p className="text-sm text-red-500 mt-2">{joinError}</p>}
          <p className="text-xs text-day-muted mt-3">{t('home.orCreateRoom')}</p>
        </div>
      </section>

      {/* How to Play Section */}
      <section className="px-4 py-16 bg-day-card">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-heading font-bold text-center text-day-text mb-12">
            {t('home.howToPlay')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '🎭', title: t('home.step1Title'), desc: t('home.step1Desc') },
              { icon: '🌙', title: t('home.step2Title'), desc: t('home.step2Desc') },
              { icon: '🗳️', title: t('home.step3Title'), desc: t('home.step3Desc') },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-20 h-20 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">{step.icon}</span>
                </div>
                <h3 className="text-xl font-heading font-semibold text-day-text mb-2">
                  {step.title}
                </h3>
                <p className="text-day-muted">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button variant="secondary" onClick={() => setShowHowToPlay(true)}>
              {t('home.learnMore')}
            </Button>
          </div>
        </div>
      </section>

      {/* Role Preview */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-heading font-bold text-center text-day-text mb-4">
            {t('home.roles')}
          </h2>
          <p className="text-center text-day-muted mb-12 text-sm">{t('home.clickRoleToLearn')}</p>

          {/* Village Team */}
          <h3 className="text-lg font-heading font-semibold text-day-text mb-4 flex items-center gap-2">
            🏘️ {t('team.village')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {villageRoles.map((role) => {
              const key = roleToKey(role);
              const icon = ROLE_EMOJI[role] || '❓';
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole({ icon, key, team: 'village', color: teamColors.village })}
                  className={`rounded-xl p-4 text-center ${teamColors.village} transition-all cursor-pointer hover:scale-105 hover:shadow-md`}
                >
                  <span className="text-3xl block mb-2">{icon}</span>
                  <span className="font-heading font-semibold text-sm">{t(`roles.${key}`)}</span>
                </button>
              );
            })}
          </div>

          {/* Werewolf Team */}
          <h3 className="text-lg font-heading font-semibold text-day-text mb-4 flex items-center gap-2">
            🐺 {t('team.werewolf')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {werewolfRoles.map((role) => {
              const key = roleToKey(role);
              const icon = ROLE_EMOJI[role] || '❓';
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole({ icon, key, team: 'werewolf', color: teamColors.werewolf })}
                  className={`rounded-xl p-4 text-center ${teamColors.werewolf} transition-all cursor-pointer hover:scale-105 hover:shadow-md`}
                >
                  <span className="text-3xl block mb-2">{icon}</span>
                  <span className="font-heading font-semibold text-sm">{t(`roles.${key}`)}</span>
                </button>
              );
            })}
          </div>

          {/* Solo Team */}
          <h3 className="text-lg font-heading font-semibold text-day-text mb-4 flex items-center gap-2">
            🎭 {t('team.solo')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {soloRoles.map((role) => {
              const key = roleToKey(role);
              const icon = ROLE_EMOJI[role] || '❓';
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole({ icon, key, team: 'solo', color: teamColors.solo })}
                  className={`rounded-xl p-4 text-center ${teamColors.solo} transition-all cursor-pointer hover:scale-105 hover:shadow-md`}
                >
                  <span className="text-3xl block mb-2">{icon}</span>
                  <span className="font-heading font-semibold text-sm">{t(`roles.${key}`)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Role Detail Modal */}
      <Modal
        isOpen={!!selectedRole}
        onClose={() => setSelectedRole(null)}
        title={selectedRole ? t(`role.${selectedRole.key}.name`) : ''}
        size="sm"
      >
        {selectedRole && (
          <div className="text-center">
            <span className="text-6xl block mb-4">{selectedRole.icon}</span>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 ${
                selectedRole.team === 'village'
                  ? 'bg-green-100 text-green-700'
                  : selectedRole.team === 'werewolf'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-purple-100 text-purple-700'
              }`}
            >
              {t(`team.${selectedRole.team}`)}
            </span>
            <p className="text-day-text text-base leading-relaxed">
              {t(`role.${selectedRole.key}.desc`)}
            </p>
          </div>
        )}
      </Modal>

      {/* How to Play Modal */}
      <Modal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
        title={t('home.gameFlow')}
        size="lg"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {[
            {
              icon: '🏠',
              step: 1,
              title: t('home.gameFlowStep1Title'),
              desc: t('home.gameFlowStep1Desc'),
            },
            {
              icon: '🌙',
              step: 2,
              title: t('home.gameFlowStep2Title'),
              desc: t('home.gameFlowStep2Desc'),
            },
            {
              icon: '🌅',
              step: 3,
              title: t('home.gameFlowStep3Title'),
              desc: t('home.gameFlowStep3Desc'),
            },
            {
              icon: '☀️',
              step: 4,
              title: t('home.gameFlowStep4Title'),
              desc: t('home.gameFlowStep4Desc'),
            },
            {
              icon: '🗳️',
              step: 5,
              title: t('home.gameFlowStep5Title'),
              desc: t('home.gameFlowStep5Desc'),
            },
            {
              icon: '🏆',
              step: 6,
              title: t('home.gameFlowStep6Title'),
              desc: t('home.gameFlowStep6Desc'),
            },
          ].map((step) => (
            <div key={step.step} className="flex gap-4 items-start p-3 rounded-xl bg-day-card/50">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">{step.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-heading font-semibold text-day-text text-sm">
                  {step.step}. {step.title}
                </h4>
                <p className="text-day-muted text-sm mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Footer */}
      <footer className="px-4 py-8 text-center text-day-muted text-sm">
        <p>Werewolf Game &copy; 2026</p>
      </footer>
    </main>
  );
}
