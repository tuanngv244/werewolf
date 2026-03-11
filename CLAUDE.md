# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Werewolf Game (Ma Soi)** — A real-time multiplayer social deduction game with super cute 3D characters, supporting English and Vietnamese languages. Players are assigned secret roles in a village and must figure out who the werewolves are before it's too late.

**Stack:** Next.js 15 (App Router) + NestJS + PostgreSQL + Redis + Socket.io + TypeScript
**3D Engine:** React Three Fiber (R3F) + Three.js + Drei helpers
**UI:** Cute fantasy theme with TailwindCSS + Framer Motion
**Package Manager:** pnpm (monorepo)
**i18n:** next-intl (English + Vietnamese)

## Project Structure

```
werewolf-game/
├── client/                      ← Frontend (Next.js 15 + TypeScript)
│   ├── src/
│   │   ├── app/                 ← App Router pages & layouts
│   │   │   ├── [locale]/        ← i18n locale prefix (en, vi)
│   │   │   │   ├── (lobby)/     ← Home, room browser, create room
│   │   │   │   ├── (game)/      ← Active game session pages
│   │   │   │   ├── (auth)/      ← Login, register, guest play
│   │   │   │   ├── (profile)/   ← Player profile, stats, inventory
│   │   │   │   └── layout.tsx   ← Locale layout with i18n provider
│   │   │   └── layout.tsx       ← Root layout (fonts, theme, socket)
│   │   ├── components/          ← Shared UI components
│   │   │   ├── ui/              ← Base UI primitives (buttons, cards, modals)
│   │   │   ├── game/            ← Game-specific components (role cards, vote panel, chat)
│   │   │   ├── 3d/              ← 3D scene components (characters, village, effects)
│   │   │   ├── lobby/           ← Lobby & room components
│   │   │   └── layout/          ← Header, footer, navigation
│   │   ├── three/               ← Three.js specific code
│   │   │   ├── models/          ← 3D character models & loaders (GLTF/GLB)
│   │   │   ├── scenes/          ← Game scenes (village-day, village-night, vote-circle)
│   │   │   ├── animations/      ← Character animation controllers
│   │   │   ├── shaders/         ← Custom shaders (moonlight, fog, glow)
│   │   │   └── utils/           ← Camera, lighting, post-processing helpers
│   │   ├── stores/              ← Zustand state management
│   │   │   ├── game-store.ts    ← Game state (phase, roles, votes, alive/dead)
│   │   │   ├── socket-store.ts  ← Socket.io connection & events
│   │   │   ├── lobby-store.ts   ← Room list, room state, player list
│   │   │   ├── chat-store.ts    ← In-game chat messages
│   │   │   ├── auth-store.ts    ← Auth state, user profile
│   │   │   └── ui-store.ts      ← Theme, language, modals, settings
│   │   ├── hooks/               ← Custom React hooks
│   │   │   ├── useSocket.ts     ← Socket connection & event listeners
│   │   │   ├── useGamePhase.ts  ← Current phase logic & timers
│   │   │   ├── useRole.ts       ← Current player's role actions
│   │   │   └── useCountdown.ts  ← Timer/countdown logic
│   │   ├── lib/                 ← Utilities
│   │   │   ├── api.ts           ← REST API client (auth, profiles, stats)
│   │   │   ├── socket.ts        ← Socket.io client setup
│   │   │   ├── i18n.ts          ← i18n configuration
│   │   │   └── game-rules.ts    ← Client-side game rule helpers
│   │   ├── types/               ← TypeScript type definitions
│   │   │   ├── game.ts          ← Game, Player, Role, Phase types
│   │   │   ├── socket-events.ts ← Socket event payload types
│   │   │   └── api.ts           ← API request/response types
│   │   ├── messages/            ← i18n translation files
│   │   │   ├── en.json          ← English translations
│   │   │   └── vi.json          ← Vietnamese translations
│   │   └── styles/              ← Global styles
│   │       └── globals.css      ← TailwindCSS + custom game theme
│   ├── public/
│   │   ├── models/              ← 3D model files (.glb)
│   │   ├── textures/            ← Texture maps for 3D models
│   │   ├── sounds/              ← Sound effects (howl, bell, ambient)
│   │   └── images/              ← 2D assets (role icons, backgrounds)
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── package.json
├── server/                      ← Backend (NestJS + TypeScript)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/            ← JWT auth, guest tokens, OAuth
│   │   │   ├── users/           ← User profiles, stats, inventory
│   │   │   ├── rooms/           ← Room CRUD, join/leave, settings
│   │   │   ├── game/            ← Core game engine (phases, roles, actions)
│   │   │   │   ├── game.gateway.ts      ← Socket.io WebSocket gateway
│   │   │   │   ├── game.service.ts      ← Game state machine
│   │   │   │   ├── game.engine.ts       ← Role resolution, kill/save logic
│   │   │   │   ├── roles/               ← Role action handlers
│   │   │   │   │   ├── werewolf.role.ts
│   │   │   │   │   ├── alpha-werewolf.role.ts
│   │   │   │   │   ├── werewolf-shaman.role.ts
│   │   │   │   │   ├── werewolf-seer.role.ts
│   │   │   │   │   ├── seer.role.ts
│   │   │   │   │   ├── aura-seer.role.ts
│   │   │   │   │   ├── doctor.role.ts
│   │   │   │   │   ├── witch.role.ts
│   │   │   │   │   ├── gunner.role.ts
│   │   │   │   │   ├── medium.role.ts
│   │   │   │   │   ├── avenger.role.ts
│   │   │   │   │   ├── beast-hunter.role.ts
│   │   │   │   │   ├── cursed.role.ts
│   │   │   │   │   ├── headhunter.role.ts
│   │   │   │   │   ├── fool.role.ts
│   │   │   │   │   └── bomber.role.ts
│   │   │   │   └── phases/              ← Phase controllers
│   │   │   │       ├── night.phase.ts
│   │   │   │       ├── day.phase.ts
│   │   │   │       ├── vote.phase.ts
│   │   │   │       └── last-words.phase.ts
│   │   │   ├── chat/            ← In-game chat (day chat, werewolf chat, dead chat)
│   │   │   └── stats/           ← Game statistics, leaderboards
│   │   ├── common/              ← Shared guards, interceptors, filters
│   │   ├── config/              ← App configuration
│   │   ├── database/            ← TypeORM entities, migrations
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts
│   │   │   │   ├── game-record.entity.ts
│   │   │   │   ├── player-stat.entity.ts
│   │   │   │   └── inventory-item.entity.ts
│   │   │   └── migrations/
│   │   └── main.ts
│   ├── test/
│   └── package.json
├── shared/                      ← Shared types & constants (client + server)
│   ├── types/
│   │   ├── game.types.ts        ← Game, Role, Phase enums & interfaces
│   │   ├── socket.types.ts      ← Socket event names & payloads
│   │   └── room.types.ts        ← Room config & player types
│   ├── constants/
│   │   ├── roles.ts             ← Role definitions, abilities, descriptions
│   │   ├── phases.ts            ← Phase order, durations
│   │   └── game-config.ts       ← Min/max players, role distributions
│   └── package.json
├── ROLES.md                     ← Role definitions (source of truth)
├── Business.md                  ← Business model & strategy
├── TASKS.md                     ← Development task list
├── UIUX-ANALYSIS.md             ← UI/UX design system
├── CLAUDE.md                    ← This file
└── package.json                 ← Monorepo root (pnpm workspaces)
```

## Commands

### Root (Monorepo)
- `pnpm install` — Install all dependencies
- `pnpm dev` — Start both client & server in dev mode
- `pnpm build` — Production build for both
- `pnpm lint` — Lint all packages

### Client (`client/`)
- `pnpm dev` — Start Next.js dev server (port 3000)
- `pnpm build` — Production build
- `pnpm lint` — ESLint
- `pnpm typecheck` — TypeScript type checking

### Server (`server/`)
- `pnpm dev` — Start NestJS dev server with watch mode (port 3001)
- `pnpm build` — Production build
- `pnpm lint` — ESLint
- `pnpm test` — Run unit tests (Jest)
- `pnpm test:e2e` — Run E2E tests
- `pnpm migration:run` — Run TypeORM migrations
- `pnpm migration:generate` — Generate migration from entity changes

### Docker
- `docker-compose -f docker-compose.dev.yml up` — Dev environment (postgres + redis + app)
- `docker-compose -f docker-compose.prod.yml up` — Production environment

## Architecture

### Frontend (Next.js 15 — App Router)

**Routing:** File-based via App Router with `[locale]` dynamic segment for i18n. Route groups `(lobby)`, `(game)`, `(auth)`, `(profile)` separate concerns.

**3D Rendering:** React Three Fiber (R3F) with `@react-three/drei` helpers. 3D characters use GLTF/GLB format loaded via `useGLTF`. Custom shaders for moonlight, fog, and glow effects. Post-processing via `@react-three/postprocessing`.

**State Management:** Zustand stores split by domain — `game-store` (authoritative game state synced from server), `socket-store` (connection management), `lobby-store` (room browsing), `chat-store` (messages), `auth-store` (user), `ui-store` (theme, language, settings).

**Real-time:** Socket.io client connects on app mount. Game events flow: Server → Socket → Zustand Store → React Components → 3D Scene. All game logic is server-authoritative; client is display-only.

**i18n:** `next-intl` with `[locale]` route prefix. Translation files in `client/src/messages/{en,vi}.json`. All game text (role names, phase descriptions, UI labels, chat system messages) fully translated.

**Styling:** TailwindCSS with custom fantasy/cute theme. Framer Motion for UI animations. 3D scene handles its own visual effects via Three.js.

### Backend (NestJS)

**Game Engine:** Server-authoritative state machine. Game progresses through phases (Night → Day → Vote → Last Words → Night...). Each role has an action handler that executes during its phase. The engine resolves conflicts (e.g., doctor saves vs werewolf kill) at phase end.

**Socket.io Gateway:** `GameGateway` handles all real-time events — room management, game actions, chat, and state broadcasts. Rooms use Socket.io rooms for efficient broadcasting.

**Module Structure:**
```
modules/
├── auth/       ← JWT + guest token auth
├── users/      ← Profiles, stats, cosmetics
├── rooms/      ← Room CRUD, settings, player management
├── game/       ← Core game engine, roles, phases
├── chat/       ← Day chat, werewolf-only chat, dead spectator chat
└── stats/      ← Leaderboards, game history, achievements
```

**Database:** PostgreSQL with TypeORM for persistent data (users, game records, stats). Redis for ephemeral game state (active rooms, in-progress games, socket sessions).

### Game Rules & Roles

**Supported Roles (16 roles across 3 teams):**

**Seer Result** indicates what the Seer/Aura Seer sees when checking this role:
- Good (Thiện) — Appears as village team
- Evil (Ác) — Appears as werewolf team
- Unknown (Không Rõ) — Ambiguous/unclear result

#### Village Team (Phe Dân) — 9 roles

| Role | Vietnamese | Seer Result | Ability |
|------|-----------|-------------|---------|
| Doctor | Bác Sĩ | Good | Each night, protect one player from being killed |
| Gunner | Xạ Thủ | Unknown | Has 2 bullets to shoot any player during the day |
| Seer | Tiên Tri | Good | Each night, view one player's exact role |
| Aura Seer | Thầy Bói | Good | Each night, view one player's team/alignment (Good/Evil/Unknown) |
| Medium | Thầy Đồng | Unknown | Each night, talk to dead players. Can resurrect one player per game |
| Witch | Phù Thủy | Unknown | Has 1 heal potion (only usable when target is attacked) and 1 kill potion |
| Avenger | Kẻ Báo Thù | Good | Choose one player who will die if you are killed |
| Beast Hunter | Thợ Săn Quái Thú | Unknown | Place a trap on a player (including self). If werewolf bites trapped player, weakest wolf dies. If solo team kills, both survive and trap disappears |
| Cursed | Bán Sói | Good→Evil | Normal villager until bitten by werewolf, then permanently becomes a werewolf. Cannot be converted by other factions |

#### Werewolf Team (Phe Sói) — 4 roles

| Role | Vietnamese | Seer Result | Ability |
|------|-----------|-------------|---------|
| Werewolf | Ma Sói | Evil | Each night, vote with other wolves to kill one player |
| Werewolf Shaman | Sói Pháp Sư | Evil | During the day, curse one player to appear as Evil to the Seer/Aura Seer that night |
| Alpha Werewolf | Sói Đầu Đàn | Unknown | Normal werewolf with double voting power during night kill vote |
| Werewolf Seer | Sói Tiên Tri | Evil | Each night, view one player's role — all wolves see the result |

#### Solo Team (Phe Riêng) — 3 roles

| Role | Vietnamese | Seer Result | Win Condition |
|------|-----------|-------------|---------------|
| Headhunter | Thợ Săn Người | Unknown | Get your assigned target voted out during the day. If target dies at night or by other daytime means, you join the Village team |
| Fool | Thằng Ngố | Unknown | Get yourself voted out (hanged) during the day |
| Bomber | Kẻ Đặt Bom | Unknown | Place a bomb at night that explodes the following night. Cannot be killed by werewolves |

**Game Flow:**
```
1. Room Setup → Host selects roles & settings
2. Game Start → Roles randomly assigned, shown to each player
   - Headhunter receives their target
   - Werewolves see who the other wolves are
3. Night Phase (30-60s):
   a. Medium talks to dead players
   b. Seer checks a player's role
   c. Aura Seer checks a player's alignment
   d. Werewolf Seer checks a player (result shared with all wolves)
   e. Werewolves vote on kill target (Alpha Wolf has 2x vote weight)
   f. Doctor chooses who to protect
   g. Beast Hunter places/moves trap
   h. Witch sees who was attacked, can heal/kill
   i. Avenger selects revenge target
   j. Bomber places bomb (explodes next night)
4. Dawn → Server resolves night actions, announces deaths
   - Werewolf Shaman's curse takes effect (target appears Evil to seers)
5. Day Phase (2-5 min):
   a. Discussion (all chat enabled)
   b. Gunner can shoot a player (uses 1 bullet, 2 max per game)
   c. Players can nominate suspects
6. Vote Phase (30s):
   a. All living players vote to eliminate someone
   b. Majority needed, ties = no elimination
   c. If Fool is voted out → Fool wins (solo victory)
   d. If Headhunter's target is voted out → Headhunter wins (solo victory)
7. Last Words (15s) → Eliminated player can speak
8. Check Win Condition:
   a. All werewolves dead → Village wins
   b. Werewolves >= villagers → Werewolves win
   c. Solo roles checked separately (Fool, Headhunter, Bomber)
   d. Otherwise → Back to Night Phase
```

**Player Count & Role Distribution:**
- Minimum: 6 players
- Maximum: 16 players
- Recommended: 8-12 players
- Role balance: ~25-30% werewolf team, ~60-65% village team, ~10% solo

### 3D Character Design Philosophy

Characters are **super cute chibi-style** with realistic material quality:
- **Proportions:** 2.5-head-tall chibi (big head, small body)
- **Eyes:** Large, expressive anime-style eyes with light reflections and subtle animations (blink, look around)
- **Skin:** Subsurface scattering shader for realistic skin glow
- **Hair:** Stylized but with realistic strand physics and sheen
- **Clothing:** Detailed fabric textures with normal maps (linen, leather, fur)
- **Expressions:** Blend shapes for emotions — happy, scared, angry, suspicious, dead
- **Idle animations:** Subtle breathing, weight shifting, occasional gestures
- **Materials:** PBR (Physically Based Rendering) with roughness/metalness maps

Each role has a **distinct costume reveal**:
- **Doctor:** White coat materializes, stethoscope, medical bag, red cross glow
- **Gunner:** Dual pistols holstered, ammo belt, cowboy-style hat, confident pose
- **Seer:** Crystal ball appears, mystic purple robe, glowing third eye on forehead
- **Aura Seer:** Glowing orb of light, white robes, spectral aura rings
- **Medium:** Spirit lantern appears, ghostly veil, ethereal floating candles
- **Witch:** Pointy hat, bubbling cauldron, floating potion bottles (green heal, red kill)
- **Avenger:** Dark cloak, glowing red dagger, vengeance flame aura
- **Beast Hunter:** Heavy leather armor, large bear trap in hand, scars, trophy necklace
- **Cursed:** Normal villager appearance, cracks/veins appear on werewolf transformation
- **Werewolf:** Fluffy wolf ears pop out, amber glowing eyes, claws extend, fur collar
- **Werewolf Shaman:** Wolf ears + mystic tribal staff, purple curse runes, bone necklace
- **Alpha Werewolf:** Massive wolf ears, red glowing eyes, larger claws, crown of bones
- **Werewolf Seer:** Wolf ears + glowing blue seer eye, arcane wolf runes on arms
- **Headhunter:** Hooded cloak, crosshair monocle, target mark on assigned player
- **Fool:** Jester hat with bells, colorful patchwork outfit, oversized shoes
- **Bomber:** Dynamite sticks on belt, goggles on forehead, fuse in hand, mischievous grin

### Path Aliases

| Alias | Path |
|-------|------|
| `@/*` | `client/src/*` |
| `@/components` | `client/src/components/` |
| `@/three` | `client/src/three/` |
| `@/stores` | `client/src/stores/` |
| `@/hooks` | `client/src/hooks/` |
| `@/lib` | `client/src/lib/` |
| `@/types` | `client/src/types/` |
| `@shared/*` | `shared/*` |

### Environment Variables

**Client (.env.local):**
- `NEXT_PUBLIC_API_URL` — Backend API base URL
- `NEXT_PUBLIC_WS_URL` — WebSocket server URL
- `NEXT_PUBLIC_APP_NAME` — App display name
- `NEXT_PUBLIC_DEFAULT_LOCALE` — Default language (en)

**Server (.env):**
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection for game state & sessions
- `JWT_SECRET` — JWT signing secret
- `CORS_ORIGIN` — Allowed CORS origins
- `PORT` — Server port (default 3001)

## Coding Conventions

- **TypeScript strict mode** enabled in client, server, and shared
- **Functional components** with hooks (no class components)
- **Server components by default** in Next.js — use `'use client'` only when needed (game views, 3D scenes, interactive UI)
- **Barrel exports** (`index.ts`) for component directories
- **Absolute imports** via path aliases — no relative `../../` imports
- **Zod** for runtime validation (socket event payloads, API DTOs)
- **Shared types** in `shared/` package — imported by both client and server
- All user-facing strings must use i18n translation keys, never hardcoded English/Vietnamese
- Socket events use typed constants from `shared/types/socket.types.ts`
- Game logic lives ONLY on the server — client renders state, sends actions
- **ROLES.md** is the source of truth for role definitions — always sync code with this file

## Task Execution — Auto-Flow Pipeline

For every coding task, auto-drive through ALL stages without stopping. Never ask "should I continue?" between stages.

```
0. READ .docs-ai/handoff/HANDOFF.md — resume any in-flight work
1. INTAKE    → classify task (feature/bugfix/refactor), update HANDOFF.md
2. PLANNING  → read existing code, identify files to change, design approach
3. IMPLEMENT → write code following project patterns
4. BUILD     → run pnpm build / pnpm typecheck, fix errors (max 3 retries)
5. TEST      → run pnpm test, fix failures (max 3 retries)
6. AUDIT     → check security, naming, quality
7. DONE      → update HANDOFF.md, report summary to user
```

### Pause ONLY when:
- Ambiguous requirements need user clarification
- Multiple valid approaches exist (present max 3 options)
- Entity creation is needed (NEVER auto-create entities — always ask)
- Critical security issue found during AUDIT
- Build/test fails 3 times with no clear fix

### Skip rules:
- Simple tasks (1-3 files): skip PLANNING, go straight to IMPLEMENT
- Read-only tasks (scan, trace, explore): skip IMPLEMENT through AUDIT

**Handoff**: Always update `.docs-ai/handoff/HANDOFF.md` when starting/ending sessions or changing task stage.
