# Werewolf Game (Ma Soi) — Task List

> Last updated: 2026-03-09
> Roles: 16 (9 Village + 4 Werewolf + 3 Solo) — see ROLES.md

---

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Done

---

## P0 — Foundation (Must Complete First)

### Monorepo Setup
- [ ] Initialize pnpm monorepo with workspaces (client, server, shared)
- [ ] Create root `package.json` with workspace scripts (dev, build, lint)
- [ ] Create `shared/` package with TypeScript config
- [ ] Define shared game types (`GamePhase`, `Role`, `PlayerState`, `RoomConfig`)
- [ ] Define shared socket event types and constants
- [ ] Define shared game config constants (min/max players, role distributions)
- [ ] Define role metadata constants (all 16 roles with names, teams, seer results, abilities)
- [ ] Set up `pnpm-workspace.yaml`
- [ ] Add root `.gitignore`, `.editorconfig`, `.prettierrc`

### Client Setup
- [ ] Initialize Next.js 15 project with TailwindCSS + TypeScript in `client/`
- [ ] Configure `next-intl` for i18n (English + Vietnamese)
- [ ] Create `[locale]` dynamic route structure
- [ ] Create translation files (`messages/en.json`, `messages/vi.json`) with initial strings (all 16 roles)
- [ ] Set up path aliases (`@/*`, `@shared/*`)
- [ ] Install React Three Fiber + Drei + Three.js + postprocessing
- [ ] Install Zustand, Framer Motion, Socket.io-client, Zod, Howler.js
- [ ] Set up TailwindCSS with custom game theme (cute fantasy palette)
- [ ] Create root layout with fonts (Nunito for body, Fredoka One for headings)
- [ ] Create locale layout with i18n provider + socket provider

### Server Setup
- [ ] Initialize NestJS project in `server/`
- [ ] Configure TypeORM + PostgreSQL connection
- [ ] Set up environment config module (@nestjs/config)
- [ ] Create base entity (BaseEntity with id, createdAt, updatedAt)
- [ ] Set up global validation pipe, exception filter, CORS
- [ ] Install and configure Socket.io adapter (@nestjs/websockets + @nestjs/platform-socket.io)
- [ ] Install and configure Redis (ioredis) for game state
- [ ] Set up Swagger/OpenAPI docs
- [ ] Docker compose for dev (postgres + redis)

### Auth System
- [ ] Server: Auth module (JWT access + refresh tokens)
- [ ] Server: User entity (id, username, email, avatar, stats, createdAt)
- [ ] Server: Guest auth (generate temporary token + random cute name)
- [ ] Server: Email/password registration with bcrypt
- [ ] Server: Google OAuth strategy
- [ ] Client: Auth store (Zustand) with token management
- [ ] Client: Login page (email + guest play option)
- [ ] Client: Register page
- [ ] Client: Auth middleware to protect profile/ranked routes
- [ ] Client: Language selector component (EN/VI toggle)

---

## P1 — Core Game Engine

### Room System
- [ ] Server: Room module — create room, join room, leave room, kick player
- [ ] Server: Room entity/state in Redis (roomId, host, players[], settings, status)
- [ ] Server: Room settings validation (player count, role selection with 16 roles, phase timers)
- [ ] Server: Auto-assign room codes (6 chars, e.g., "WOLF42")
- [ ] Server: Room lifecycle (waiting → starting → in-game → ended)
- [ ] Server: Socket events — `room:create`, `room:join`, `room:leave`, `room:update`, `room:kick`
- [ ] Client: Room browser page — list of open rooms with player count, language filter
- [ ] Client: Create room modal — settings form (player count, all 16 roles toggleable, timers, language)
- [ ] Client: Room lobby page — player list, ready toggle, host controls, start button
- [ ] Client: Join by code — input room code directly
- [ ] Client: Room chat — pre-game lobby chat

### Game Engine (Server-side)
- [ ] Server: Game service — state machine (phases, transitions, timers)
- [ ] Server: Role assignment — balanced random distribution based on player count and selected roles
- [ ] Server: Night phase controller — collect role actions, resolve conflicts
- [ ] Server: Day phase controller — manage discussion timer, handle Gunner shots, Werewolf Shaman curse
- [ ] Server: Vote phase controller — collect votes, determine majority, handle ties
- [ ] Server: Last words phase controller — eliminated player timer
- [ ] Server: Win condition checker — village win / werewolf win / solo win conditions (Fool, Headhunter, Bomber)
- [ ] Server: Death resolution — process kills, saves, traps, bombs, avenger revenge, curses
- [ ] Server: Seer result system — return Good/Evil/Unknown based on role + Shaman curse
- [ ] Server: Game event log — track all actions for replay and anti-cheat

### Role Implementations — Village Team (Server-side)
- [ ] Server: Doctor role — protect one player from death each night
- [ ] Server: Gunner role — shoot a player during the day (2 bullets per game)
- [ ] Server: Seer role — check one player's exact role each night
- [ ] Server: Aura Seer role — check one player's alignment (Good/Evil/Unknown) each night
- [ ] Server: Medium role — talk to dead players each night, resurrect one player per game
- [ ] Server: Witch role — see who was attacked; heal potion (1x, only if target attacked) and kill potion (1x)
- [ ] Server: Avenger role — select a revenge target; if Avenger is killed, revenge target also dies
- [ ] Server: Beast Hunter role — place trap on a player; if wolf bites trapped player, weakest wolf dies; if solo kills, both survive and trap disappears
- [ ] Server: Cursed role — normal villager; if bitten by werewolf, converts to werewolf team permanently

### Role Implementations — Werewolf Team (Server-side)
- [ ] Server: Werewolf role — night kill vote among werewolves
- [ ] Server: Werewolf Shaman role — curse one player during the day; cursed player appears Evil to Seer/Aura Seer that night
- [ ] Server: Alpha Werewolf role — normal werewolf with 2x voting weight in night kill vote
- [ ] Server: Werewolf Seer role — check one player's role at night; all wolves see the result

### Role Implementations — Solo Team (Server-side)
- [ ] Server: Headhunter role — assigned target at game start; win if target is voted out by day vote; if target dies by other means, Headhunter joins Village team
- [ ] Server: Fool role — wins if voted out (hanged) during the day; game continues for other players
- [ ] Server: Bomber role — place bomb at night, bomb explodes the following night killing the target; immune to werewolf kills

### Game Client
- [ ] Client: Game page layout — 3D scene + UI overlay (role card, action panel, timer)
- [ ] Client: Game store (Zustand) — sync with server state via socket
- [ ] Client: Phase display — current phase name, timer countdown, phase-specific instructions
- [ ] Client: Player list panel — show all players, alive/dead status, vote indicators
- [ ] Client: Role card component — shows your role with description + ability (all 16 roles)
- [ ] Client: Night action panel — role-specific UI for each of the 16 roles
- [ ] Client: Day action panel — Gunner shoot buttons, Werewolf Shaman curse selection
- [ ] Client: Vote panel — select player to vote, confirm vote, see vote results
- [ ] Client: Last words overlay — eliminated player's message area
- [ ] Client: Game over screen — win/lose, role reveal for all 16 roles, stats, play again button
- [ ] Client: Spectator view — for dead players (Medium can still interact at night)
- [ ] Client: Medium night UI — chat with dead players, resurrect button

### Chat System
- [ ] Server: Chat module — message handling, chat channels
- [ ] Server: Day chat — all living players can send messages
- [ ] Server: Werewolf chat — only werewolves, only during night
- [ ] Server: Dead chat — spectator chat for eliminated players
- [ ] Server: Medium-dead channel — Medium can talk to dead players at night
- [ ] Server: System messages — "[Player] was eliminated", "Night falls...", role-specific events
- [ ] Server: Chat filter — basic profanity filter (EN + VI)
- [ ] Client: Chat panel component — scrollable messages, input, channel tabs
- [ ] Client: Chat bubbles on 3D characters — show message above character head
- [ ] Client: System message styling — distinct from player messages
- [ ] Client: Emoji support in chat

---

## P2 — 3D Scene & Characters

### 3D Village Environment
- [ ] Create village scene — ground plane, grass texture, cobblestone paths
- [ ] Add village buildings — cute cottages with warm lights, village square
- [ ] Day lighting — warm sunlight, blue sky, soft shadows
- [ ] Night lighting — moonlight, stars, lantern glow, fireflies
- [ ] Day/night transition — smooth lighting + skybox blend (10s transition)
- [ ] Weather effects — subtle fog at night, particle dust in sunlight
- [ ] Camera system — orbit around village center, zoom to player on action
- [ ] Village square — stone circle where votes happen, campfire in center

### 3D Character System
- [ ] Base chibi character model — 2.5-head proportion, expressive face rig
- [ ] Character face blend shapes — neutral, happy, scared, angry, suspicious, dead
- [ ] Idle animation — breathing, subtle weight shift, occasional blink
- [ ] Walk animation — cute bouncy walk cycle
- [ ] Death animation — dramatic fall, ghost rising (cute ghost)
- [ ] Celebration animation — jump, clap, spin (for winners)
- [ ] Character placement — arrange in circle for vote phase, scattered for day
- [ ] Player name labels — floating text above characters (billboarded)
- [ ] Character selection highlighting — glow outline on hover/select

### Role Costumes & Reveals (16 roles)
- [ ] Doctor costume — white coat, stethoscope, medical bag, red cross glow
- [ ] Gunner costume — dual pistols holstered, ammo belt, cowboy hat
- [ ] Seer costume — mystic purple robe, crystal ball, glowing third eye
- [ ] Aura Seer costume — white robes, glowing orb of light, spectral aura rings
- [ ] Medium costume — spirit lantern, ghostly veil, ethereal floating candles
- [ ] Witch costume — pointy purple hat, bubbling cauldron, potion bottles (green/red)
- [ ] Avenger costume — dark cloak, glowing red dagger, vengeance flame aura
- [ ] Beast Hunter costume — heavy leather armor, bear trap, trophy necklace, scars
- [ ] Cursed costume — normal villager → cracks/dark veins appear on wolf transformation
- [ ] Werewolf costume — fluffy wolf ears, amber eyes, claws, fur collar, tail
- [ ] Werewolf Shaman costume — wolf ears + tribal staff, purple curse runes, bone necklace
- [ ] Alpha Werewolf costume — massive wolf ears, red glowing eyes, larger claws, bone crown
- [ ] Werewolf Seer costume — wolf ears + glowing blue seer eye, arcane wolf runes
- [ ] Headhunter costume — hooded dark cloak, crosshair monocle, target mark on assigned player
- [ ] Fool costume — jester hat with bells, colorful patchwork outfit, oversized shoes
- [ ] Bomber costume — dynamite sticks on belt, goggles on forehead, fuse in hand, mischievous grin
- [ ] Role reveal animation — costume materializes with particle effects + sound
- [ ] Death reveal — show true role when player is eliminated

### 3D Effects & Polish
- [ ] Moonlight god-ray shader — volumetric light beams at night
- [ ] Character glow outline shader — for selection and highlighting
- [ ] Particle systems — fireflies, campfire sparks, potion bubbles, curse runes, bomb fuse sparks
- [ ] Post-processing — bloom for lights, subtle vignette, color grading per phase
- [ ] Screen shake — on death events, bomb explosions, dramatic moments
- [ ] Transition effects — fade to black between phases, fog roll-in for night
- [ ] LOD (Level of Detail) — reduce polygon count on mobile/low-end
- [ ] Performance settings — Low (no shadows, no particles), Medium, High, Ultra

---

## P3 — UI Components & Pages

### Base UI Components
- [ ] Button component — primary, secondary, ghost, danger variants with hover animations
- [ ] Card component — rounded, shadowed, with cute border decorations
- [ ] Modal component — centered overlay with backdrop blur
- [ ] Input component — text input with cute focus effect
- [ ] Badge component — role badges (all 16 roles), status badges, team badges
- [ ] Avatar component — player avatar with online indicator
- [ ] Tooltip component — hover tooltips with game info
- [ ] Progress bar — timer bars, loading bars
- [ ] Toast/notification component — game events, system messages
- [ ] Spinner/loading component — cute wolf paw loading animation

### Landing / Home Page
- [ ] Hero section — 3D animated characters in village scene (embedded R3F canvas)
- [ ] "Play Now" CTA button — large, animated, prominent
- [ ] "How to Play" section — animated step-by-step game flow
- [ ] Role showcase — carousel of all 16 roles with 3D model preview + description (EN/VI)
- [ ] Language toggle — EN/VI switch in header
- [ ] Footer — credits, links, social media
- [ ] Mobile responsive layout

### Lobby Pages
- [ ] Room browser — grid of open rooms with filters (language, player count, status)
- [ ] Create room page — all 16 roles selection grid, timer settings, room name
- [ ] Room waiting lobby — player avatars in circle, ready status, host controls
- [ ] Quick match button — auto-join an available room or create one

### Profile & Stats Pages
- [ ] Player profile page — avatar, username, total games, win rate, favorite role
- [ ] Stats dashboard — games played, wins/losses by all 16 roles, kills, saves
- [ ] Match history — list of recent games with outcome, role played, date
- [ ] Achievements page — grid of achievements with progress bars
- [ ] Settings page — language, sound volume, graphics quality, notifications

### In-Game UI Overlay
- [ ] Top bar — game phase indicator, round number, timer
- [ ] Player circle UI — clickable player icons around screen edge
- [ ] Role action modal — role-specific options (different for all 16 roles)
- [ ] Vote interface — player selection grid with confirm button
- [ ] Chat panel — collapsible side panel with message input
- [ ] Mini-map — top-down view of village with player positions
- [ ] Kill feed — death announcements with role-specific icons
- [ ] Phase transition screen — full-screen overlay "Night Falls..." / "Dawn Breaks..."
- [ ] Gunner UI — shoot button visible during day phase (shows remaining bullets)
- [ ] Shaman curse UI — curse button visible to Werewolf Shaman during day phase
- [ ] Bomber UI — bomb placement and timer indicator
- [ ] Medium UI — dead player chat during night

---

## P4 — Sound & Audio

### Sound Effects
- [ ] Wolf howl — plays at night phase start
- [ ] Rooster crow — plays at dawn/day phase start
- [ ] Village bell — plays at vote phase start
- [ ] Death sound — dramatic chord when player is eliminated
- [ ] Gunshot — plays when Gunner shoots
- [ ] Bomb explosion — plays when Bomber's bomb detonates
- [ ] Potion splash — plays when Witch uses potion
- [ ] Curse whisper — plays when Shaman curses someone
- [ ] Trap snap — plays when Beast Hunter's trap activates
- [ ] Resurrection chime — plays when Medium resurrects
- [ ] Victory fanfare — plays when game ends for winners
- [ ] Defeat sound — plays for losing team
- [ ] Click/tap sounds — UI button interactions
- [ ] Chat message ping — new message notification
- [ ] Timer tick — last 5 seconds of any timer
- [ ] Role reveal sound — magical whoosh when role is shown
- [ ] Fool jingle — plays when Fool wins by getting voted out

### Ambient Audio
- [ ] Day ambience — birds, wind, village activity
- [ ] Night ambience — crickets, owls, eerie wind
- [ ] Background music — soft, medieval fantasy loop (non-intrusive)
- [ ] Vote tension music — builds suspense during vote phase

### Audio System
- [ ] Sound manager — global volume control, mute toggle
- [ ] Sound settings — master volume, SFX volume, music volume, ambient volume
- [ ] Spatial audio for 3D scene — sounds from character positions
- [ ] Sound preloading — load all sounds on game start

---

## P5 — Polish & Enhancement

### Animations & Transitions
- [ ] Page transitions — Framer Motion fade + slide between pages
- [ ] Button hover effects — scale + color shift + subtle glow
- [ ] Card hover effects — lift + shadow increase
- [ ] List item animations — stagger entrance for player lists
- [ ] Timer animation — circular countdown with color change (green → yellow → red)
- [ ] Vote animation — ballot paper flies to center, count animation
- [ ] Death animation sequence — character falls, ghost rises, role reveal card
- [ ] Confetti/celebration — shower of stars/sparkles on win screen
- [ ] Bomb explosion animation — screen shake, fire particles, smoke
- [ ] Cursed transformation — dark veins spread, wolf features emerge

### Player Experience
- [ ] Tutorial system — interactive first-game tutorial explaining all roles and phases
- [ ] Role help cards — in-game reference for all 16 role abilities
- [ ] Quick reactions — emoji reactions during discussion (thumbs up, suspicious, etc.)
- [ ] Player notes — personal notepad for tracking suspicions
- [ ] Ping system — highlight a player for discussion
- [ ] AFK detection — warn player, auto-skip if no action

### Anti-Cheat & Moderation
- [ ] Server: Rate limiting on all socket events
- [ ] Server: Validate all game actions server-side (no client trust)
- [ ] Server: Detect impossible actions (dead player voting, wrong role actions, etc.)
- [ ] Server: Report player system
- [ ] Server: Temporary ban system (1h, 24h, 7d, permanent)
- [ ] Server: Chat filter with Vietnamese + English bad word lists
- [ ] Client: Report button on player cards

### Accessibility
- [ ] Keyboard navigation for all game actions
- [ ] Screen reader support for role cards and game events
- [ ] Color-blind mode — distinct role color schemes with patterns
- [ ] Reduced motion mode — disable 3D animations, use simple transitions
- [ ] Text size options — small, medium, large
- [ ] High contrast mode — solid backgrounds, clear borders

### Performance Optimization
- [ ] 3D model optimization — DRACO compression for GLB files
- [ ] Texture atlasing — combine textures to reduce draw calls
- [ ] Instanced rendering for repeated elements (trees, buildings)
- [ ] Lazy load 3D scene — show 2D loading screen while models load
- [ ] Frame rate monitoring — auto-reduce quality if FPS < 30
- [ ] Asset preloading — load game assets during lobby wait time
- [ ] Bundle splitting — separate game code from lobby code

---

## P6 — Ranked & Social Features

### Ranked Mode
- [ ] Server: ELO rating system — gain/lose based on game outcome + role difficulty
- [ ] Server: Rank tiers — Pup, Scout, Hunter, Alpha, Elder, Legendary
- [ ] Server: Ranked matchmaking — match by similar ELO, fill with close ranks
- [ ] Server: Seasonal resets — soft reset every 3 months
- [ ] Client: Rank display on profile and in-game
- [ ] Client: Ranked leaderboard — top 100 global + friends
- [ ] Client: Rank-up animation — dramatic reveal of new rank

### Social Features
- [ ] Server: Friend system — add, remove, block, online status
- [ ] Server: Party system — group up and join rooms together
- [ ] Client: Friends list — online/offline, invite to room
- [ ] Client: Party lobby — create party, invite friends, find room together
- [ ] Client: Player search — find players by username
- [ ] Client: Recent players — list of players from recent games

### Cosmetic Shop
- [ ] Server: Inventory system — owned items per user
- [ ] Server: Currency system — Gold Coins (free) + Moon Gems (premium)
- [ ] Server: Shop catalog — items with prices, rarity, categories
- [ ] Server: Purchase validation — check currency, grant item
- [ ] Client: Shop page — browse categories (skins, hats, emotes, effects)
- [ ] Client: Item preview — show item on 3D character model
- [ ] Client: Currency display — balance in header
- [ ] Client: Purchase flow — select item, confirm, celebrate

### Progression
- [ ] Server: XP system — earn XP from games, level up
- [ ] Server: Achievement system — 50+ achievements with progress tracking (role-specific achievements for all 16 roles)
- [ ] Server: Daily/weekly quests — "Win 3 games as Seer", "Successfully trap a wolf as Beast Hunter"
- [ ] Client: Level display with progress bar
- [ ] Client: Achievement grid with unlock animations
- [ ] Client: Quest tracker — active quests with progress

---

## P7 — DevOps & Infrastructure

### Development
- [ ] ESLint config for client + server + shared
- [ ] Prettier config (consistent formatting)
- [ ] Husky pre-commit hooks (lint, typecheck)
- [ ] Environment variable documentation (.env.example for client + server)

### Testing
- [ ] Server: Unit tests for game engine (all 16 role resolutions, win conditions)
- [ ] Server: Unit tests for room management
- [ ] Server: Unit tests for seer result system (Good/Evil/Unknown + Shaman curse interaction)
- [ ] Server: Integration tests for socket events
- [ ] Server: E2E tests for full game flow
- [ ] Client: Component tests for UI components (Vitest + Testing Library)
- [ ] Client: Integration tests for game stores
- [ ] E2E: Playwright tests for critical user flows (create room → play game)

### Deployment
- [ ] Production Dockerfile for client (Next.js standalone)
- [ ] Production Dockerfile for server (NestJS)
- [ ] docker-compose.prod.yml (client + server + postgres + redis)
- [ ] CI/CD pipeline (GitHub Actions: lint, typecheck, test, build, deploy)
- [ ] Staging environment setup
- [ ] Production deployment (Vercel for client, Railway/Fly.io for server)
- [ ] Database migration scripts
- [ ] Redis persistence configuration
- [ ] SSL/TLS configuration
- [ ] Monitoring & logging (PM2, Winston, or Datadog)

---

## Backlog — Future Features

- [ ] Voice chat (WebRTC peer-to-peer)
- [ ] Game replay system — watch recorded games
- [ ] Spectator mode — watch live games
- [ ] Additional roles (expand beyond 16)
- [ ] Custom game mode builder (mix any roles, set any rules)
- [ ] Clan / guild system
- [ ] Seasonal events (Tết Nguyên Đán theme, Halloween theme, Trung Thu theme)
- [ ] Battle pass (seasonal cosmetic progression)
- [ ] Tournament mode (bracket system)
- [ ] AI bots for practice mode
- [ ] Mobile app wrapper (PWA or React Native)
- [ ] Additional languages (Thai, Indonesian, Japanese, Korean)
- [ ] AI narrator — text-to-speech game announcements
- [ ] Custom avatar creator — mix & match parts
- [ ] Streaming overlay (OBS/Twitch integration)
- [ ] Public game API for third-party tools
- [ ] Regional servers (SEA, NA, EU)
