# Werewolf Game — Session Handoff

> Last updated: 2026-03-10

---

## Current Session

**Status:** CHARACTER INTERACTION & GAME FLOW IMPROVEMENTS — COMPLETE
**Date:** 2026-03-10
**Summary:** Added arrow key movement, improved character animations, chat speech bubbles above characters, and fixed demo room game flow (round tracking).

---

## Active Tasks

*No active tasks. All 4 improvements complete.*

---

## Completed (Recent)

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
