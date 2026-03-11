# Phase 0 — Foundation Setup Plan

> Priority: P0 | Estimated: 2-3 days | Blocks: All other phases

---

## Goal

Set up the complete monorepo skeleton with all tooling, configuration, and base infrastructure so development can begin on game features.

---

## Steps

### Step 1: Initialize Monorepo
- Create root `package.json` with pnpm workspace scripts
- Create `pnpm-workspace.yaml` referencing `client/`, `server/`, `shared/`
- Add root `.gitignore`, `.editorconfig`, `.prettierrc`
- Run `git init`

### Step 2: Create Shared Package
- Create `shared/package.json` with TypeScript
- Create `shared/tsconfig.json`
- Define core game types in `shared/types/game.types.ts`:
  - `Role` enum (werewolf, seer, doctor, witch, hunter, cupid, bodyguard, elder, villager)
  - `GamePhase` enum (waiting, night, day, vote, last_words, game_over)
  - `PlayerState` interface (userId, username, role, isAlive, etc.)
  - `RoomConfig` interface (maxPlayers, roles, timers, language)
  - `GameState` interface (phase, round, players, votes, etc.)
- Define socket events in `shared/types/socket.types.ts`:
  - All event name constants
  - Payload interfaces for each event
- Define game constants in `shared/constants/`:
  - `roles.ts` — Role metadata (name, team, description EN/VI)
  - `phases.ts` — Phase order, default durations
  - `game-config.ts` — Min/max players, role distribution rules

### Step 3: Initialize Client (Next.js 15)
- `pnpm create next-app client --typescript --tailwind --app --src-dir`
- Install dependencies:
  - `@react-three/fiber @react-three/drei @react-three/postprocessing three`
  - `zustand framer-motion socket.io-client zod howler`
  - `next-intl`
- Configure `tailwind.config.ts` with game theme:
  - Colors: day palette, night palette, role colors
  - Fonts: Fredoka One (headings), Nunito (body)
  - Custom utilities
- Configure `next.config.ts` with next-intl plugin
- Set up `tsconfig.json` path aliases (`@/*`, `@shared/*`)
- Create `[locale]` route structure
- Create translation files `messages/en.json` and `messages/vi.json` with initial keys
- Create root layout with fonts and providers
- Create locale layout with next-intl provider

### Step 4: Initialize Server (NestJS)
- `npx @nestjs/cli new server --package-manager pnpm`
- Install dependencies:
  - `@nestjs/websockets @nestjs/platform-socket.io socket.io`
  - `@nestjs/typeorm typeorm pg`
  - `@nestjs/jwt @nestjs/passport passport passport-jwt passport-local`
  - `@nestjs/config @nestjs/swagger`
  - `ioredis bcryptjs class-validator class-transformer`
- Configure TypeORM in `app.module.ts`
- Configure Redis connection
- Set up global validation pipe, CORS, exception filter
- Configure Swagger docs

### Step 5: Docker Compose
- Create `docker-compose.dev.yml`:
  - PostgreSQL 16 (port 5432)
  - Redis 7 (port 6379)
- Create `.env.example` for both client and server

### Step 6: Auth System
- Server:
  - Create User entity
  - Auth module with JWT strategy
  - Guest auth endpoint (POST /auth/guest) — random cute name + temp token
  - Login endpoint (POST /auth/login)
  - Register endpoint (POST /auth/register)
- Client:
  - Auth store (Zustand) with token management
  - Login page with guest play option
  - Register page
  - Language selector (EN/VI toggle)

---

## Success Criteria

- [ ] `pnpm install` works from root
- [ ] `pnpm dev` starts both client (3000) and server (3001)
- [ ] Shared types importable from both client and server
- [ ] Docker Compose starts postgres + redis
- [ ] Guest auth works (get token, see username)
- [ ] Language toggle switches between EN/VI
- [ ] All TypeScript compiles without errors

---

## Files Created

```
package.json
pnpm-workspace.yaml
.gitignore
.editorconfig
.prettierrc
docker-compose.dev.yml
shared/package.json
shared/tsconfig.json
shared/types/game.types.ts
shared/types/socket.types.ts
shared/types/room.types.ts
shared/constants/roles.ts
shared/constants/phases.ts
shared/constants/game-config.ts
client/ (Next.js scaffold + customizations)
server/ (NestJS scaffold + customizations)
```
