/**
 * Game Sound Manager — Synthesized sounds using the Web Audio API.
 * No external audio files required; every sound is generated procedurally.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  // Resume if suspended (browsers require user interaction first)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ─── Helpers ───────────────────────────────────────────

function createOscillator(
  ctx: AudioContext,
  type: OscillatorType,
  frequency: number,
  startTime: number,
  duration: number,
  gain: number,
  destination?: AudioNode,
) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gainNode);
  gainNode.connect(destination || ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function createNoise(
  ctx: AudioContext,
  startTime: number,
  duration: number,
  gain: number,
  filterFreq?: number,
) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  if (filterFreq) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, startTime);
    source.connect(filter);
    filter.connect(gainNode);
  } else {
    source.connect(gainNode);
  }

  gainNode.connect(ctx.destination);
  source.start(startTime);
  source.stop(startTime + duration);
}

// ─── Sound Effects ─────────────────────────────────────

/** 🌙 Wolf howl — eerie descending tone for night phase */
function playNightFall() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Main howl — sine sweep down
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 1.2);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 1.5);

  // Eerie overtone
  createOscillator(ctx, 'triangle', 900, now + 0.1, 1.0, 0.06);
}

/** 🌅 Dawn breaks — bright ascending chime */
function playDawn() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

  notes.forEach((freq, i) => {
    createOscillator(ctx, 'sine', freq, now + i * 0.12, 0.5, 0.15);
    createOscillator(ctx, 'triangle', freq * 2, now + i * 0.12, 0.3, 0.04);
  });
}

/** ☀️ Day phase — gentle bell / chime */
function playDayStart() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  createOscillator(ctx, 'sine', 880, now, 0.4, 0.12);
  createOscillator(ctx, 'sine', 1108.73, now + 0.08, 0.35, 0.1);
  createOscillator(ctx, 'triangle', 1318.51, now + 0.16, 0.5, 0.08);
}

/** 🗳️ Vote phase — dramatic bell ting-ting */
function playVoteStart() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Two "ting" bell strikes
  for (let i = 0; i < 2; i++) {
    const t = now + i * 0.3;
    createOscillator(ctx, 'sine', 1200, t, 0.4, 0.2);
    createOscillator(ctx, 'sine', 2400, t, 0.25, 0.06);
    createOscillator(ctx, 'triangle', 3600, t, 0.15, 0.03);
  }
}

/** 📳 Vote cast — short click/tap */
function playVoteCast() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  createOscillator(ctx, 'sine', 800, now, 0.08, 0.15);
  createOscillator(ctx, 'square', 600, now, 0.04, 0.05);
}

/** 📊 Vote result — gavel slam */
function playVoteResult() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  createOscillator(ctx, 'sine', 200, now, 0.3, 0.25);
  createOscillator(ctx, 'square', 150, now, 0.15, 0.08);
  createNoise(ctx, now, 0.1, 0.15, 400);
}

/** 💀 Player death — dark descending tone */
function playDeath() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.8);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 1.0);

  // Low rumble
  createOscillator(ctx, 'sine', 60, now, 0.6, 0.1);
}

/** 🔫 Gunshot — sharp noise burst */
function playGunshot() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Sharp attack
  createNoise(ctx, now, 0.08, 0.35, 2000);
  // Resonance
  createOscillator(ctx, 'sawtooth', 150, now, 0.15, 0.15);
  // Echo
  createNoise(ctx, now + 0.1, 0.2, 0.1, 800);
}

/** 💣 Bomb explosion — deep boom */
function playExplosion() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Initial burst
  createNoise(ctx, now, 0.15, 0.3, 300);
  // Deep boom
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, now);
  osc.frequency.exponentialRampToValueAtTime(20, now + 0.8);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 1.0);

  // Debris noise
  createNoise(ctx, now + 0.05, 0.6, 0.12, 500);
}

/** 🔮 Seer reveal — mystical shimmer */
function playSeerReveal() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const notes = [659.25, 783.99, 987.77, 1318.51]; // E5, G5, B5, E6
  notes.forEach((freq, i) => {
    createOscillator(ctx, 'sine', freq, now + i * 0.1, 0.6 - i * 0.1, 0.1);
    createOscillator(ctx, 'triangle', freq * 1.5, now + i * 0.1, 0.4, 0.03);
  });
}

/** 🎭 Role reveal — dramatic whoosh + chime */
function playRoleReveal() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Whoosh (filtered noise sweep)
  createNoise(ctx, now, 0.3, 0.15, 1500);

  // Chime notes
  createOscillator(ctx, 'sine', 523.25, now + 0.2, 0.5, 0.15);
  createOscillator(ctx, 'sine', 783.99, now + 0.3, 0.5, 0.12);
  createOscillator(ctx, 'triangle', 1046.5, now + 0.4, 0.6, 0.1);
}

/** 💬 Chat message — soft notification ding */
function playChatPing() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  createOscillator(ctx, 'sine', 1046.5, now, 0.12, 0.1);
  createOscillator(ctx, 'sine', 1318.51, now + 0.06, 0.12, 0.08);
}

/** ✅ Action confirmed — affirmative beep */
function playActionConfirm() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  createOscillator(ctx, 'sine', 880, now, 0.1, 0.1);
  createOscillator(ctx, 'sine', 1108.73, now + 0.08, 0.15, 0.12);
}

/** 🏆 Victory fanfare */
function playVictory() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Triumphant ascending
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5 E5 G5 C6 E6
  notes.forEach((freq, i) => {
    createOscillator(ctx, 'sine', freq, now + i * 0.15, 0.8 - i * 0.1, 0.15);
    createOscillator(ctx, 'triangle', freq * 2, now + i * 0.15, 0.5, 0.04);
  });

  // Final chord
  createOscillator(ctx, 'sine', 1046.5, now + 0.75, 1.2, 0.12);
  createOscillator(ctx, 'sine', 1318.51, now + 0.75, 1.2, 0.1);
  createOscillator(ctx, 'sine', 1567.98, now + 0.75, 1.2, 0.08);
}

/** 😢 Defeat sound — sad descending */
function playDefeat() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const notes = [523.25, 493.88, 440, 392]; // C5, B4, A4, G4
  notes.forEach((freq, i) => {
    createOscillator(ctx, 'sine', freq, now + i * 0.25, 0.6, 0.12);
  });
}

/** ⏰ Timer tick — last 5 seconds warning */
function playTimerTick() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  createOscillator(ctx, 'sine', 1000, now, 0.06, 0.12);
}

/** 🎮 Game starting — exciting build-up */
function playGameStart() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Quick ascending scale
  const notes = [261.63, 329.63, 392, 523.25, 659.25, 783.99]; // C4 to G5
  notes.forEach((freq, i) => {
    createOscillator(ctx, 'sine', freq, now + i * 0.08, 0.25, 0.1);
  });

  // Final sparkle
  createOscillator(ctx, 'triangle', 1567.98, now + 0.5, 0.6, 0.08);
  createOscillator(ctx, 'sine', 2093, now + 0.55, 0.5, 0.06);
}

/** 🐺 Werewolf kill — low growl + bite */
function playWerewolfKill() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Low growl
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(100, now);
  osc.frequency.linearRampToValueAtTime(60, now + 0.4);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.5);

  // Bite snap
  createNoise(ctx, now + 0.2, 0.05, 0.2, 3000);
}

/** 💊 Heal / save — gentle sparkle */
function playHeal() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const notes = [783.99, 987.77, 1174.66, 1567.98]; // G5, B5, D6, G6
  notes.forEach((freq, i) => {
    createOscillator(ctx, 'sine', freq, now + i * 0.08, 0.35, 0.1);
  });
}

/** 🪤 Trap set — metallic click */
function playTrapSet() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  createOscillator(ctx, 'square', 1500, now, 0.03, 0.1);
  createNoise(ctx, now + 0.02, 0.08, 0.15, 4000);
  createOscillator(ctx, 'sine', 800, now + 0.05, 0.1, 0.08);
}

/** 👻 Resurrection chime */
function playResurrection() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Ethereal ascending
  const notes = [392, 523.25, 659.25, 783.99, 1046.5]; // G4 C5 E5 G5 C6
  notes.forEach((freq, i) => {
    createOscillator(ctx, 'sine', freq, now + i * 0.12, 0.7, 0.1);
    createOscillator(ctx, 'triangle', freq * 3, now + i * 0.12, 0.4, 0.02);
  });
}

/** 🌑 Curse effect — eerie whisper */
function playCurse() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.linearRampToValueAtTime(120, now + 0.6);
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.8);

  createNoise(ctx, now, 0.6, 0.04, 200);
}

/** 💬 Last words — solemn tone */
function playLastWords() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  createOscillator(ctx, 'sine', 349.23, now, 0.6, 0.1);
  createOscillator(ctx, 'sine', 293.66, now + 0.3, 0.6, 0.08);
}

/** 🔔 UI click — generic button press */
function playClick() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  createOscillator(ctx, 'sine', 660, now, 0.06, 0.08);
}

/** 👋 Slap — funny cartoon slap sound */
function playSlap() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Sharp impact
  createNoise(ctx, now, 0.06, 0.3, 3000);
  // Meaty thwack
  createOscillator(ctx, 'sawtooth', 200, now, 0.08, 0.2);
  createOscillator(ctx, 'sine', 400, now + 0.02, 0.06, 0.15);
  // Comedic bounce
  createOscillator(ctx, 'sine', 600, now + 0.05, 0.1, 0.08);
  createOscillator(ctx, 'sine', 800, now + 0.08, 0.08, 0.05);
}

/** 😵 Got slapped — comedic "bonk" reaction */
function playBonk() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Impact
  createNoise(ctx, now, 0.04, 0.25, 2500);
  // Descending "wah wah" comedy sound
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(500, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.4);
  // Stars circling head sound
  createOscillator(ctx, 'triangle', 1200, now + 0.1, 0.15, 0.06);
  createOscillator(ctx, 'triangle', 1500, now + 0.15, 0.12, 0.04);
}

// ─── Public API ─────────────────────────────────────────

export const GameSounds = {
  nightFall: playNightFall,
  dawn: playDawn,
  dayStart: playDayStart,
  voteStart: playVoteStart,
  voteCast: playVoteCast,
  voteResult: playVoteResult,
  death: playDeath,
  gunshot: playGunshot,
  explosion: playExplosion,
  seerReveal: playSeerReveal,
  roleReveal: playRoleReveal,
  chatPing: playChatPing,
  actionConfirm: playActionConfirm,
  victory: playVictory,
  defeat: playDefeat,
  timerTick: playTimerTick,
  gameStart: playGameStart,
  werewolfKill: playWerewolfKill,
  heal: playHeal,
  trapSet: playTrapSet,
  resurrection: playResurrection,
  curse: playCurse,
  lastWords: playLastWords,
  click: playClick,
  slap: playSlap,
  bonk: playBonk,
} as const;

export type SoundName = keyof typeof GameSounds;

/**
 * Play a sound by name, respecting the isSoundEnabled setting.
 * Safe to call on SSR (no-ops if window is undefined).
 */
export function playSound(name: SoundName): void {
  if (typeof window === 'undefined') return;

  try {
    GameSounds[name]();
  } catch {
    // Silently ignore AudioContext errors (e.g. user hasn't interacted yet)
  }
}
