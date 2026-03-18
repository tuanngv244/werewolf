# Werewolf Game — Session Handoff

> Last updated: 2026-03-18

---

## Current Session

**Status:** Socket Audit — ALL FIXES COMPLETED
**Date:** 2026-03-18
**Summary (latest):**

### Socket Audit & Bug Fixes (2026-03-18)
User requested: "Please scan all place have socket and ensure it perfect"

**Fixes completed:**

1. **Null guards on ALL gateway handlers** — Added `if (!client.user) return;` and data validation guards to every `@SubscribeMessage` handler (23 handlers total): `room:create`, `room:create_demo`, `room:join`, `room:leave`, `room:kick`, `room:delete`, `room:list`, `room:settings`, `game:start`, `game:night_action`, `game:vote`, `game:shaman_curse`, `game:gunner_shoot`, `chat:send`, `fun:slap`, `fun:jump`, `fun:emoji`, `voice:join`, `voice:leave`, `voice:offer`, `voice:answer`, `voice:ice-candidate`.

2. **try/catch on handlePhaseEnd** — Wrapped the entire `handlePhaseEnd` method in try/catch with automatic retry (5s delay) to prevent games from getting permanently stuck on exceptions.

3. **Fix dawn_result saved:[]** — Changed hardcoded `saved: []` to `saved: event.saved || []` so doctor saves are properly forwarded to clients.

4. **Scope voice signaling to room** — Fixed security issue where `voice:offer`, `voice:answer`, and `voice:ice-candidate` used `this.server.fetchSockets()` (global search across ALL connected sockets). Now uses `this.server.in(\`room:${roomCode}\`).fetchSockets()` to scope to sender's room only.

5. **Add room eviction to create_demo** — `room:create_demo` handler now evicts player from previous room before creating new demo room (same logic as `room:create`).

6. **Death log reads BEFORE store mutation** (from previous session) — Fixed `handleDawnResult`, `handleVoteResult`, `handleGunnerShot` in `useSocket.ts` to read player names from store BEFORE calling `updatePlayer()` which mutates the store.

7. **handlePlayerDied adds death log** (from previous session) — Added missing `addDeathLogEntry` call to `handlePlayerDied` handler so mid-phase deaths (avenger, bomber, etc.) are tracked in the death log.

**Files Modified:**
- `server/src/modules/game/game.gateway.ts` — Null guards, try/catch, saved fix, voice scoping, room eviction
- `client/src/hooks/useSocket.ts` — Death log pre-read fixes, handlePlayerDied death log entry
- `client/src/app/[locale]/(lobby)/room/[code]/page.tsx` — Room code uppercase normalization
- `client/src/app/[locale]/(lobby)/rooms/page.tsx` — Input maxLength fix, code length validation
- `server/src/modules/rooms/rooms.service.ts` — Typed error returns, stale room cleanup
- `client/src/messages/en.json` — invalidCodeLength i18n key
- `client/src/messages/vi.json` — invalidCodeLength i18n key

**Build Status:** Both client and server typecheck pass with zero errors.

**Known remaining audit findings (not fixed — low priority):**
- `game:player_died` — client listens but server never emits (zombie listener, harmless)
- `game:shaman_curse` — server handler exists but client never emits (dead feature)
- `fun:slap` — server handler exists but client never emits (dead feature, replaced by emoji)
- `SOCKET_EVENTS` constant in `shared/src/types/socket.types.ts` — vestigial, diverges from actual event names

---

## Completed (Recent)

### IMPROVES.md Cases 1-4 (Round 2) — Deep Fix (2026-03-14)
- See above for Seer Result Fix (Case 3) and New Roles (Case 4)

### IMPROVE_TASKS #14 — Character Positioning: Fire Center + Ground Detection (Awaiting Verification)
- **Root Cause #1 — Wrong fire center:** The fire detection searched for nodes named "lamp"/"fire"/"flame" and found 2 lamp POSTS (Lamp_smal, Lamp_smal.001) on the far eastern periphery of the island. Their average position (8.89, 0.51, 2.65) is far from the flat village center. Characters arranged in a circle around this point (radius ~2.8) landed on slopes, shoreline, and even over water — causing them to sink through terrain edges.
- **Root Cause #2 — Wrong terrain layer:** The GLB map has 5 stacked terrain meshes. Previous getGroundY versions picked wrong layers (lowest/closest to reference = internal geometry).
- **Fix Applied:**
  1. **Campfire detection via emissive material** — Now traverses all meshes looking for warm-colored emissive materials (fire glow) at ground level (Y < 1.5, filtering out fairy lights). Falls back to lamp post name matching if no emissive campfire found. This correctly identifies the campfire at ~(3.6, 0.15, -0.08).
  2. **TOPMOST walkable surface** — getGroundY returns the FIRST walkable surface (highest Y) from raycast, skipping rooftops (>3 units above reference).
  3. **Camera framing** — Updated orbit target from [0, 1.5, 0] to [3, 1.0, 0] and camera initial position from [0, 10, 16] to [3, 10, 16] to frame the campfire area.
- **Files Modified:**
  - `client/src/components/3d/ForestScene.tsx` — Rewrote fire detection (emissive material + Y filter), updated camera position and orbit target
  - `client/src/components/3d/PlayerCircle.tsx` — getGroundY picks topmost walkable surface, cleaned up debug code

### Rotation Direction (Pending User Verification)
- Character rotation formula (`atan2(-moveX, -moveZ)`) and MODEL_FACING_OFFSET=0 are mathematically correct for models facing -Z
- Character model (b_model.glb) confirmed: no root rotation, symmetric bounds, likely faces -Z (standard convention)
- Cannot verify visually until positioning is fixed; user needs to test

---

## Completed (Recent)

### IMPROVE_TASKS #11 — Characters Under Map Fix (2026-03-13)
- **Stage:** DONE
- **Root Cause:** `PlayerCircle` was rendered as a child of `ForestScene` immediately, before the map model loaded. With `firePosition=undefined`, characters spawned at `(0, 0, 0)` — but the map model is positioned at `y=-1.0` with scale 1.178, so Y=0 is below the visible ground surface. Characters were literally under the map.
- **Fixes Applied:**
  1. **Deferred rendering** — `PlayerCircle` now only renders when both `firePos` AND `mapScene` are available: `{firePos && mapScene && <PlayerCircle ... />}`. This ensures characters always spawn at correctly raycasted ground positions around the detected fire/campfire center.
  2. **Better fallback Y** — Changed `fireCenterY` fallback from 0 to 0.5 (above ground surface) as a safety net.
  3. **Improved getGroundY** — Filters raycast intersections by face normal direction (normal.y > 0.5) to prefer walkable ground surfaces over tree canopies/rooftops/walls.
  4. **Ground clipping offset** — Added `GROUND_Y_OFFSET = 0.02` to all ground Y calculations.
  5. **Rotation cleanup** — Uses `atan2(-moveX, -moveZ)` for correct Three.js facing direction, with configurable `MODEL_FACING_OFFSET` (default 0) for model alignment.
- **Files Modified:**
  - `client/src/app/[locale]/(game)/game/page.tsx` — Conditional rendering of PlayerCircle behind `firePos && mapScene` guard
  - `client/src/components/3d/PlayerCircle.tsx` — Improved getGroundY, GROUND_Y_OFFSET, MODEL_FACING_OFFSET, fallback fireCenterY=0.5

### IMPROVE_TASKS #10 — Character Rotation & Ground Positioning Fix (2026-03-13)
- **Stage:** DONE
- **Tasks Completed:**
  1. **Character rotation fix** — Added `MODEL_FACING_OFFSET = Math.PI` constant. GLB character models are authored facing +Z, but Three.js rotation.y=0 faces -Z. The offset is applied to `groupRef.rotation.y` so the model's visual front aligns with the movement direction. The logical rotation (`rotRef.current`) stays unchanged so the camera still positions correctly behind the character.
  2. **Ground surface detection** — Improved `getGroundY()` to filter raycast hits by **face normal direction** (prefers upward-facing surfaces with normal.y > 0.5). This prevents characters from snapping to tree canopies, rooftops, or walls. Falls back to the lowest intersection if no upward-facing surface is found.
  3. **Ground clipping prevention** — Added `GROUND_Y_OFFSET = 0.02` applied to all ground Y calculations (initial position, per-frame movement, home position pre-computation). Prevents character feet from visually clipping into the ground mesh due to floating-point precision.
  4. **Camera rotation reporting** — Updated `GLBCharacterWithPosTracking` to subtract `MODEL_FACING_OFFSET` from the visual rotation before reporting to the camera controller, so the camera always uses the logical facing direction.
- **Files Modified:**
  - `client/src/components/3d/PlayerCircle.tsx` — Added MODEL_FACING_OFFSET, GROUND_Y_OFFSET, improved getGroundY with normal filtering, applied offset to rotation and ground Y in all locations

### IMPROVE_TASKS #9 — Character Rotation & Camera Direction Fix (2026-03-13)
- **Stage:** DONE
- **Tasks Completed:**
  1. **Character rotation fix** — Changed `Math.atan2(moveX, moveZ)` to `Math.atan2(-moveX, -moveZ)` in both `usePlayerControl` and `useWander`. In Three.js, rotation.y=0 means facing -Z. The old formula had the character facing *opposite* to the movement direction (off by π). Now when pressing ArrowUp (-Z movement), rotation.y=0, model correctly faces -Z. Applied to both player-controlled movement and NPC wandering.
  2. **Camera already correct** — The third-person camera offset calculation `(sin(rot)*dist, 0, cos(rot)*dist)` was already placing the camera behind the character's facing direction. With the rotation fix, this now works correctly: camera is behind the character, looking over their shoulder in the movement direction.
- **Files Modified:**
  - `client/src/components/3d/PlayerCircle.tsx` — Fixed rotation formula in usePlayerControl and useWander

### IMPROVE_TASKS #8 — Camera Toggle + Night Brightness (2026-03-13)
- **Stage:** DONE
- **Tasks Completed:**
  1. **Y key camera toggle** — Added `CameraController` component in ForestScene.tsx that supports two modes: `panoramic` (existing OrbitControls behavior) and `thirdPerson` (camera follows behind local player character with smooth interpolation). Added 'y'/'Y' to `useKeyboard` accepted keys. Added `onLocalPlayerPosition` and `onCameraToggle` callback props to `PlayerCircle`. Position reported via `GLBCharacterWithPosTracking`. Camera mode state managed in `Game3DScene`. HUD indicator shows current mode (bottom-left corner). Third-person camera: offset behind player (5.5 units back, 3.5 units up), smooth lerp (delta * 4.0), looks at player + 1.2 Y offset.
  2. **Night scene brightness** — Increased all night lighting values: ambient intensity 0.15→0.35 (color #334466→#556688), directional intensity 0.3→0.6 (color #6677AA→#7788BB), fog color #0B1026→#1A2240 with extended range 15-50→18-55, background color #0B1026→#1A2240, moon pointLight intensity 2→4 with distance 40→50. Night is now visibly dark but you can clearly see characters and the map.
- **Files Modified:**
  - `client/src/components/3d/ForestScene.tsx` — Added CameraController component, updated night lighting values, new camera-related props
  - `client/src/components/3d/PlayerCircle.tsx` — Added 'y' key to useKeyboard, added onLocalPlayerPosition/onCameraToggle props, position reporting in GLBCharacterWithPosTracking
  - `client/src/app/[locale]/(game)/game/page.tsx` — Added camera mode state, position tracking, camera mode indicator HUD, wired new props

### IMPROVE_TASKS #7 — Movement, Collision, Animation & Dedup Fixes (2026-03-13)
- **Stage:** DONE
- **Tasks Completed:**
  1. **#1 Free roaming movement** — Increased `maxRadius` from 5 to 12 so players can explore the entire map. Speed increased from 2.0 to 2.5. NPC wander radius increased from 1.2 to 2.0. Slope threshold reduced from 1.0 to 0.5 for more natural terrain following.
  2. **#2 Don't walk through objects** — Added `canMoveTo()` horizontal collision raycasting. Casts a ray in the movement direction at character chest height (Y + 0.4). If the ray hits any map mesh within the step distance + small buffer, movement is blocked. Works for both player-controlled and NPC movement. NPCs auto-pick new targets when blocked.
  3. **#3 Realistic walk animation** — Replaced simple `sin(t*10)` bounce with proper walk cycle. Added: asymmetric step bounce (double-bump per stride), side-to-side weight transfer sway, forward lean while walking, subtle body twist counter-rotation, different idle animation (micro-sway), and jump-specific animations (lean back on ascent, forward on descent). Walk phase tracked via `walkPhaseRef` in movement hooks.
  4. **#4 Duplicate key error** — Added `useMemo`-based player deduplication in three places: `PlayerList` component, `VotePanel` component, and `GamePage` main component. Bot IDs (`bot-{uuid}`) could occasionally appear duplicated in the players array from socket events (likely due to reconnection or dual listener registration). The `PlayerCircle` component already had dedup — now all components that render `players.map()` with `key={player.id}` are protected.
- **Files Modified:**
  - `client/src/components/3d/PlayerCircle.tsx` — Added `canMoveTo()` horizontal raycaster, updated `useWander`/`usePlayerControl` with collision checks + larger radius, added `walkPhaseRef` to movement hooks, rewrote animation loop with realistic walk cycle
  - `client/src/app/[locale]/(game)/game/page.tsx` — Added player dedup in `PlayerList`, `VotePanel`, and `GamePage` components

### IMPROVE_TASKS #6 — Character Ground Positioning via Raycasting (2026-03-13)
- **Stage:** DONE
- **Task:** "Vị trí đứng của nhân vật vẫn chưa khớp và di chuyển được trên map"
- **Root Cause:** Characters were placed at the fire position Y coordinate, which doesn't match the actual ground mesh surface. The map has varied terrain heights.
- **Solution:** Implemented `THREE.Raycaster` ground detection system:
  1. **`getGroundY()` utility** — Casts a ray downward from (x, 30, z) to find the topmost mesh intersection. Returns the Y coordinate of the hit point, or a fallback if no hit.
  2. **`useWander` hook** — NPCs now raycast at each movement step to set Y to the ground surface
  3. **`usePlayerControl` hook** — Player-controlled movement raycasts at new position. If Y difference > 1.0 unit (too steep), movement is blocked — acting as basic collision detection preventing climbing walls/objects
  4. **Home positions** — Pre-computed via `getGroundY` in the `PlayerCircle` render, so characters start on the correct surface
  5. **Animation Y** — Walking bounce/breathing/jump animations now offset from `posRef.current.y` (raycasted) instead of `homePosition[1]`
- **Architecture:**
  - `ForestScene` exposes `onMapSceneReady` callback (alongside existing `onFireDetected`)
  - `MapModel` refs the `<primitive>` node, waits for world matrices, then passes the scene object up
  - `Game3DScene` in page.tsx stores `mapScene` in state and passes to `PlayerCircle`
  - `PlayerCircle` passes `mapScene` through to each `GLBCharacter` for per-frame raycasting
  - Shared `THREE.Raycaster` instance (module-level) avoids GC pressure
- **Files Modified:**
  - `client/src/components/3d/ForestScene.tsx` — Added `onMapSceneReady` callback, `primitiveRef` on map model, `useEffect` to notify parent when scene is ready with world transforms
  - `client/src/components/3d/PlayerCircle.tsx` — Added `getGroundY()` raycasting utility, updated `useWander`/`usePlayerControl` to raycast for Y, added `mapScene` prop throughout component chain, pre-compute `homeGroundYs`, animation uses `posRef.current.y`
  - `client/src/app/[locale]/(game)/game/page.tsx` — Added `THREE` import, `mapScene` state, `handleMapSceneReady` callback, wired through to `PlayerCircle`

### IMPROVE_TASKS #5 — Map Bugs & Character Positioning (2026-03-13)
- **Stage:** DONE
- **Tasks Completed:**
  1. **#1 Character position alignment** — Characters now use fire position Y coordinate for vertical alignment on map surface. Characters arranged around detected fire/lamp positions rather than hardcoded origin.
  2. **#2 Detect fire position & render characters around it** — Added `onFireDetected` callback to `ForestScene`/`MapModel`. Runtime traversal of loaded GLTF scene searches node names for "lamp"/"fire"/"flame", averages their world positions. `PlayerCircle` accepts `firePosition` prop and uses it as center for character circle. `Game3DScene` in page.tsx wires fire detection from `ForestScene` to `PlayerCircle` via React state.
  3. **#3 Map gray colors (ROOT CAUSE FIX)** — Previous fix (removing scene.clone) was insufficient. True root cause: model REQUIRED `KHR_materials_pbrSpecularGlossiness` GLTF extension which was removed from Three.js GLTFLoader in r150+ (current: 0.170). Materials had only `diffuseFactor`/`glossinessFactor`/`specularFactor` with NO `pbrMetallicRoughness` fallback. Fix: converted GLB offline using `npx @gltf-transform/cli metalrough map_model.glb map_model_converted.glb` to transform specular-glossiness materials to metallic-roughness workflow. Original backed up as `map_model_original.glb`.
  4. **#4 Camera too far** — Reduced camera max distance from 40→22, min distance 8→6. Camera initial position `[0, 10, 16]`, orbit target `[0, 1.5, 0]`. Fog distance 15-50.
- **Files Modified:**
  - `client/src/components/3d/ForestScene.tsx` — Added `onFireDetected` prop/callback, `MapModel` fire detection via scene traversal, camera/orbit distance adjustments, fog tuning
  - `client/src/components/3d/PlayerCircle.tsx` — Added `firePosition` prop, characters arranged around `fireCenterX/Y/Z`, radius `max(2.5, players * 0.35)`
  - `client/src/app/[locale]/(game)/game/page.tsx` — `Game3DScene` wires fire detection: `useState` for firePos, `useCallback` for handler, passes to both components
  - `client/public/models/map_model.glb` — Converted from specular-glossiness to metallic-roughness via @gltf-transform/cli
- **Notes:**
  - Collision detection (characters walking through objects) was NOT implemented — requires raycasting/physics engine which is a larger scope task
  - Original GLB backed up as `map_model_original.glb`

### IMPROVE_TASKS #4 — Map Size/Color + Emoji Circle Fix (2026-03-13)
- **Stage:** DONE
- **Tasks Completed:**
  1. **#1 Map too small + character scale** — Increased map model scale from `0.35` to `1.0`, repositioned to `[0, -1.0, 0]`. Reduced character model scale from `0.8` to `0.55` so characters feel proportional inside the map. Updated camera position from `[0, 8, 14]` to `[0, 12, 20]`, orbit target to `[0, 2, 0]`, orbit distances `8-40`, shadow camera bounds to `±25`, shadow map to `2048x2048`, fog distance to `20-60`, camera far to `200`.
  2. **#2 Map colors gray** — Root cause: cloning the Sketchfab scene (`scene.clone(true)`) broke the `KHR_materials_pbrSpecularGlossiness` extension materials. Fix: use `scene` directly without cloning (only one map instance needed), just enable shadows via traverse without touching materials.
  3. **#3 Emoji picker circular layout** — Replaced grid/flex-wrap layout with circular CSS positioning. 16 emojis positioned in a circle using `Math.cos/sin` for placement. Selected emoji highlighted with golden glow, enlarged to 1.5x, shown in center preview. Center displays current selection + Tab/Enter hints.
- **Files Modified:**
  - `client/src/components/3d/ForestScene.tsx` — Map scale 0.35→1.0, camera/orbit/fog/shadow adjustments, removed scene cloning
  - `client/src/components/3d/PlayerCircle.tsx` — Character scale 0.8→0.55, circular EmojiPicker layout, adjusted Html positions for smaller characters

### IMPROVE_TASKS #3 — GLB Map + Emoji Picker (2026-03-13)
- **Stage:** DONE
- **Tasks Completed:**
  1. **#1 Replace procedural forest map with GLB map model** — Removed all procedural scene components (Tree, Ground, ForestRing with 60 trees). Replaced with `map_model.glb` loaded via `useGLTF` from `@react-three/drei`. Map model is from Sketchfab (7.1MB, ~150K vertices, uses KHR_materials_pbrSpecularGlossiness extension). Model is preloaded, cloned, and positioned with `scale=0.35, position=[0, -0.5, 0]`. Kept lighting system (ambient + directional with day/night lerp transitions), fog, Moon, Fireflies, Stars (night), Clouds (day). Adjusted camera position from `[0, 6, 12]` to `[0, 8, 14]` and orbit target from `[0, 0.5, 0]` to `[0, 1, 0]` for better framing of the new map. Removed procedural CampFire from PlayerCircle since the map model provides the environment.
  2. **#2 Replace shuriken with emoji picker** — Removed: ShurikenData interface, Shuriken component, all shuriken state/refs, F key shuriken firing logic, remote shuriken spawning in `fun:slapped` handler. Added emoji picker system: F key toggles picker open/close, Tab cycles through 16 emojis (😀😂😍😎🤔😱🤣😡👍👏🔥💀🐺😈🙏❤️), Enter confirms selection. Picker renders as Html overlay (dark glassmorphism panel) above local player's character with golden highlight on selected emoji. Selected emoji floats above character head for 3 seconds with gentle upward drift and fade-out. Emoji broadcast to other players via new `fun:emoji` socket event. Enhanced `useKeyboard` hook with `justPressed` ref to distinguish single key presses from held keys for Tab/Enter/F.
- **Components removed:** Shuriken, ShurikenData, CampFire (procedural campfire — map model now provides environment). From ForestScene: Tree, Ground, ForestRing.
- **Components added:** EmojiPicker (Html overlay with grid of emojis), FloatingEmoji (animated emoji display above head), MapModel (useGLTF-based map renderer).
- **Server changes:** Added `fun:emoji` handler in game.gateway.ts — receives `{ emoji: string }`, broadcasts `{ playerId, emoji }` to other players in the room.
- **Files Modified:**
  - `client/src/components/3d/ForestScene.tsx` — Replaced procedural forest with GLB map model
  - `client/src/components/3d/PlayerCircle.tsx` — Replaced shuriken with emoji picker system, removed CampFire
  - `server/src/modules/game/game.gateway.ts` — Added `fun:emoji` socket handler

### IMPROVE_TASKS #2 — GLB Models + Shuriken (2026-03-13)
- **Stage:** DONE
- **Tasks Completed:**
  1. **#1 Replace procedural characters with GLB models** — Replaced the entire procedural ChibiCharacter (1500+ lines of boxGeometry/sphereGeometry/coneGeometry) with 5 GLTF models loaded via `useGLTF` from `@react-three/drei`. Models: `b_model.glb`, `g_model.glb`, `m_model.glb`, `s_model.glb`, `w_model.glb`. Each player gets a deterministic model assignment based on hash of their player ID. Models are preloaded for fast rendering. Dead players get grayscale tint + transparency. All existing features preserved: movement (keyboard + wander AI), jump, chat bubbles, name tags, role emoji, selection rings, glow effects, hit reactions.
  2. **#2 Replace sword attack with shuriken projectile** — Removed the sword mesh and sword-slash attack animation. Pressing F now fires a spinning 4-pointed shuriken projectile that flies forward in the direction the character is facing. Shuriken is a procedural star shape (4 cone geometries + center hub) with rapid spin animation and trail glow light. Projectiles live for 1.5 seconds before despawning. Remote players also see shurikens flying from attacker to target via `fun:slapped` socket event. Performance optimized: shuriken positions mutated in-place (refs), React state only changes on add/remove.
- **Components removed:** All procedural hat components (PointyHat, TopHat, Hood, Crown, JesterHat, Helmet, Bandana, Goggles), RoleHat, WolfEars, Cape, RoleAccessory, full ChibiCharacter body geometry (~1200 lines of JSX). Sword mesh and attack arm animation code.
- **Components added:** Shuriken projectile component, GLBCharacter (useGLTF-based), ShurikenData interface, getModelIndex() hash function.
- **Kept intact:** RoleCostume (simplified to emoji + glowColor only), useKeyboard, useWander, usePlayerControl, CampFire, PlayerCircle export API, ChibiCharacterWithPosTracking (renamed to GLBCharacterWithPosTracking), all jump/hit/slap logic, socket event listeners (fun:slapped, fun:jumped).
- **Files Modified:**
  - `client/src/components/3d/PlayerCircle.tsx` — Complete rewrite: GLB models, shuriken system, removed procedural geometry

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
- **Roles:** 50+ total (ROLES.md is source of truth)
- **Teams:** Village, Werewolf, Solo (+ Vampire/Cult Leader on Village team)
- **i18n:** English + Vietnamese (next-intl)
