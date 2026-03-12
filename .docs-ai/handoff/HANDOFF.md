# Werewolf Game — Session Handoff

> Last updated: 2026-03-12

---

## Current Session

**Status:** IMPROVE_TASKS IMPLEMENTATION — COMPLETE
**Date:** 2026-03-12
**Summary:** Implemented all 7 improvement tasks (4 bug fixes + 3 features) from IMPROVE_TASKS.md.

---

## Active Tasks

*No active tasks. All 7 improvements complete.*

---

## Completed (Recent)

### IMPROVE_TASKS Implementation (2026-03-12)
- **Stage:** DONE
- **Tasks Completed:**
  1. **#1 Chat deduplication** — Added `message.id` dedup check in `chat-store.ts` `addMessage()` to prevent double messages.
  2. **#3 Seer result display fix** — Changed `setPhase()` in `game-store.ts` to only clear seer/aura/werewolf seer results when entering NIGHT phase (not on every phase transition). Results now persist through DAWN and DAY.
  3. **#2 Remove saved player notifications** — Server now sends `saved: []` in `game:dawn_result` broadcast (keeping saved info server-side only). Removed saved player display from client DawnPanel.
  4. **#4 Witch role improvements** — Added Skip button (3-column layout: Heal/Kill/Skip). Skip emits `skip` action that server ignores (no-op = save potions). Heal mode doesn't require target (saves wolf victim automatically). Kill mode excludes self.
  5. **#6 Dead player spectator chat** — Server: WEREWOLF channel messages now also sent to dead players. Client: dead players see DAY+WEREWOLF+DEAD channel tabs but can only send in DEAD. Observe-only placeholder shown.
  6. **#5 Role list in top bar** — Server: `roleList` included in `game:started` event (both normal and demo). Client: stored in `game-store`, rendered as compact emoji row with tooltips below top bar. Refactored `roleIcons` to module-level `ROLE_ICONS` constant.
  7. **#7 Death event log** — Added `deathLog: DeathLogEntry[]` to `game-store` with `addDeathLogEntry()` action. Deaths tracked from `dawn_result`, `vote_result`, and `gunner_shot` socket events in `useSocket`. Collapsible floating panel at bottom-right with death cause icons and round numbers.
- **i18n keys added (both en.json + vi.json):**
  - `game.skip`, `game.observeOnly`, `game.deathLog`, `game.deathNight`, `game.deathVoted`, `game.deathGunner`
- **Files Modified:**
  - `client/src/stores/chat-store.ts` — Dedup in addMessage
  - `client/src/stores/game-store.ts` — setPhase fix, roleList, deathLog, DeathLogEntry export
  - `client/src/hooks/useSocket.ts` — Pass roleList, track deaths in deathLog
  - `client/src/app/[locale]/(game)/game/page.tsx` — DawnPanel (remove saved), Witch skip, dead chat channels, role list bar, death log component, ROLE_ICONS refactor
  - `client/src/messages/en.json` — New i18n keys
  - `client/src/messages/vi.json` — New i18n keys
  - `server/src/modules/game/game.gateway.ts` — Remove saved from dawn broadcast, WEREWOLF chat to dead players, roleList in game:started

### Production Deployment Bug Fixes (2026-03-11)
- **Stage:** DONE
- **Symptoms:** `POST /api/auth/guest` → 500, `create-room` → connection timeout
- **Root Causes & Fixes:**
  1. **Dockerfile/nest-cli/package.json entry path is CORRECT as-is** — `server/dist/server/src/main.js` is the correct path because `@shared/*` path alias causes tsc to restructure output with common root. DO NOT change these paths.
  2. **Missing PassportModule in AuthModule** — `JwtStrategy` extends `PassportStrategy` but `PassportModule` was never imported, causing DI failure. Added `PassportModule.register({ defaultStrategy: 'jwt' })` to AuthModule imports.
  3. **Guest username collision → unhandled 500** — `username` column is UNIQUE but `guestLogin` did no collision check. Added retry loop (5 attempts) with pre-check and catch for Postgres error code 23505.
  4. **TypeORM synchronize disabled in production** — No migrations exist, so tables were never created. Temporarily enabled `synchronize: true` (TODO: replace with proper migrations before scaling).
- **Files Modified:**
  - `server/Dockerfile` — Fixed CMD path
  - `server/nest-cli.json` — Fixed entryFile from `server/src/main` to `main`
  - `server/package.json` — Fixed start/start:prod scripts
  - `server/src/modules/auth/auth.module.ts` — Added PassportModule import
  - `server/src/modules/auth/auth.service.ts` — Added retry logic for guest username collisions
  - `server/src/app.module.ts` — Enabled TypeORM synchronize for initial deployment

### Character Interaction & Game Flow Improvements (2026-03-10)
- **Stage:** DONE
- **Summary:** Four features implemented:
  1. **Arrow key movement** — Local player controls their character with arrow keys (Up/Down/Left/Right). Uses `useKeyboard` hook with boundary constraints (5 unit radius). Faster rotation response than NPC wandering. Arrow key events are prevented from bubbling to avoid scroll.
  2. **Improved character animations** — Separate left/right leg refs for alternating walk cycle, arm swing synced to leg movement, body tilt/lean into movement, head bobbing while walking, eye blinking (random 2-5s intervals), idle fidget system (random head look left/right, nod). All animations smoothly interpolated.
  3. **Chat speech bubbles** — `useChatBubbles` hook subscribes to `useChatStore` and maps `senderId` to player. White speech bubble with tail appears above character for 4 seconds with fade-out. Truncates long messages to 40 chars.
  4. **Fix demo room game flow** — Server now sends `round` in `game:phase_changed` event payload. Client `setPhase` accepts optional `round` parameter. `useSocket` handler passes `round` through. Demo rooms now properly advance through rounds.
- **Files Modified:**
  - `client/src/components/3d/PlayerCircle.tsx` — Complete rewrite with keyboard control, animations, chat bubbles
  - `server/src/modules/game/game.gateway.ts` — Added `round: updatedGame.round` to phase_changed event
  - `client/src/stores/game-store.ts` — `setPhase` now accepts optional `round` parameter
  - `client/src/hooks/useSocket.ts` — Passes `round` from phase_changed event to store

### 3D Game UI Overhaul (2026-03-10)
- **Stage:** DONE
- **Summary:** Rebuilt the game page with immersive 3D experience
- **Changes:**
  1. **ForestScene.tsx** — 3D forest with procedural trees, day/night lighting transitions, moon, fireflies, stars, clouds, fog. Accepts `children` prop for composability.
  2. **PlayerCircle.tsx** — 3D chibi characters arranged in a circle around a campfire. Breathing animation, selection rings, dead state (gray + X eyes), Html labels with role emojis.
  3. **Game page rebuilt** — Full-screen 3D background with glassmorphism UI overlay panels (GlassCard component). Phase/timer in top bar, action panels + chat at bottom. Responsive layout.
  4. **Layout fixes** — Removed `bg-day-bg` from locale layout (was blocking night mode). Created separate layouts for lobby/auth (with day bg) and game (bare).
  5. **R3F TypeScript fix** — Created `three-jsx.d.ts` to bridge R3F v8 types with React 19's `React.JSX` namespace.
  6. **Dynamic imports** — ForestScene and PlayerCircle loaded with `next/dynamic` (no SSR) for proper client-only 3D rendering.
- **Files Created:**
  - `client/src/components/3d/ForestScene.tsx`
  - `client/src/components/3d/PlayerCircle.tsx`
  - `client/src/app/[locale]/(lobby)/layout.tsx`
  - `client/src/app/[locale]/(auth)/layout.tsx`
  - `client/src/app/[locale]/(game)/layout.tsx`
  - `client/src/types/three-jsx.d.ts`
- **Files Modified:**
  - `client/src/app/[locale]/(game)/game/page.tsx` — Complete rewrite with 3D integration
  - `client/src/app/[locale]/layout.tsx` — Removed forced `bg-day-bg` wrapper
  - `client/tailwind.config.ts` — Added missing color tokens (muted, border, success, warning, info, wood-light)

### Previous Session Fixes (2026-03-10)
- Fixed game start flow (20+ bugs): phase labels, game:started event, empty roles, isAlive, headhunterTarget, Werewolf Seer
- LAN multiplayer: auto-detect server URL, CORS fix, 0.0.0.0 binding
- Demo room with bots (BotService)
- i18n hardcoded string fixes

---

## Project Context
- **Stack:** Next.js 15 + NestJS + PostgreSQL + Redis + Socket.io + TypeScript
- **3D:** React Three Fiber v9 + Three.js 0.170 + Drei 10.x
- **Roles:** 16 total (ROLES.md is source of truth)
- **Teams:** Village (9), Werewolf (4), Solo (3)
- **i18n:** English + Vietnamese (next-intl)
