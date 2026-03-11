# Phase 2 — 3D Scene & Characters Plan

> Priority: P2 | Estimated: 7-10 days | Depends on: Phase 0 (partially), Phase 1 (game state)
> 16 roles = 16 unique costumes + animations — see ROLES.md
> Can start in parallel with Phase 1 for scene/character setup, but game integration requires Phase 1.

---

## Goal

Build an immersive 3D village scene with cute chibi characters that react to game events. The 3D scene overlays the game UI, creating a theatrical experience for the social deduction gameplay.

---

## Module 1: Scene Foundation (2 days)

### React Three Fiber Setup
- `GameScene.tsx` — Main R3F `<Canvas>` wrapper component
  - WebGL 2 renderer, antialiasing, shadows
  - Responsive sizing (fill viewport)
  - Performance monitor (FPS counter in dev)
  - Quality auto-detection (reduce effects on low FPS)
- Suspense boundary with 2D loading screen while models load

### Village Environment
- `Village.tsx` — Village scene component
  - Ground plane with tiled grass texture
  - Cobblestone paths between buildings
  - 5-7 cute cottages (low-poly, stylized)
  - Village square with campfire in center
  - Wooden fences, barrels, crates (props)
  - 3-5 trees (stylized, rounded canopy)

### Skybox & Lighting
- `Skybox.tsx` — Day/night sky
  - Day: bright blue gradient + fluffy clouds
  - Night: deep navy + stars (particle points) + moon
  - Blend between day/night over 10 seconds on phase change
- `Lighting.tsx` — Dynamic lighting
  - Day: warm directional light (sun), ambient light
  - Night: cool directional light (moon), reduced ambient, point lights for lanterns
  - Smooth transition between lighting presets
  - Shadows enabled for directional light

### Camera System
- `CameraController.tsx` — Camera management
  - Default: orbit around village center (locked Y axis, limited zoom)
  - Phase transitions: smooth camera moves
  - Night: zoom in slightly, lower angle (intimate)
  - Vote: camera centers on village square
  - Death: camera focuses on eliminated character
  - Spectator: free orbit for dead players

---

## Module 2: Character System (2 days)

### Base Character Model
- Source or create a chibi character model (.glb format)
  - 2.5-head-tall proportions
  - ~5,000-8,000 triangles
  - Face rig with blend shapes: neutral, happy, scared, angry, suspicious, dead
  - Humanoid skeleton (~30 bones)
  - PBR materials with subsurface scattering for skin

### Character Component
- `Character.tsx` — Single character instance
  - Load model via `useGLTF` (clone for each player)
  - Apply player-specific: hair color, skin tone, accessories
  - Display floating name label (billboarded `<Text>`)
  - Status indicators: alive (normal), dead (grayscale + ghost), selected (glow outline)
  - Clickable for game interactions (vote, target selection)

### Character Group
- `CharacterGroup.tsx` — Position all characters
  - Night: scattered around village (sleeping positions)
  - Day: gathered near village square
  - Vote: arranged in a circle around campfire
  - Smooth transitions between formations (lerp positions)
  - Dead characters: faded ghost version, floating slightly above ground

### Animations
- `useIdleAnimation.ts` — Breathing, weight shift, blink (looped)
- `useWalkAnimation.ts` — Bouncy chibi walk cycle
- `useExpressions.ts` — Blend shape controller
  - Map game events to expressions:
    - Night: sleepy/neutral (villagers), alert (special roles), menacing (werewolves)
    - Day: neutral, suspicious (during accusations)
    - Vote: anxious
    - Death: shocked → dead face
    - Win: ecstatic / sad based on team

---

## Module 3: Role Costumes & Reveals (3-4 days)

### Costume System
- Each of the 16 roles has visual additions applied on reveal
- Costumes are overlay meshes attached to character bones
- Reveal animation: 2-second sequence with particle effects

### 16 Role Costumes

#### Village Team (9 costumes)
| Role | Key Visual Elements | Particles |
|------|-------------------|-----------|
| Doctor | White coat, stethoscope, medical bag, red cross | Green healing glow, plus signs |
| Gunner | Dual pistols, ammo belt, cowboy hat | Gun smoke, brass shells |
| Seer | Purple robe, crystal ball, third-eye glow | Star sparkles, constellation dots |
| Aura Seer | White robes, golden orb, spectral aura rings | Golden light motes, aura waves |
| Medium | Spirit lantern, ghostly veil, floating candles | Ghost wisps, spirit orbs |
| Witch | Pointy hat, cauldron, 2 potion bottles | Bubbles, runic symbols, potion drip |
| Avenger | Dark cloak, red dagger, vengeance rune | Red embers, dark smoke |
| Beast Hunter | Leather armor, bear trap, trophy necklace | Dust, leaf particles, metallic glint |
| Cursed | Normal → dark veins, wolf features emerging | Dark energy crackle, purple veins |

#### Werewolf Team (4 costumes)
| Role | Key Visual Elements | Particles |
|------|-------------------|-----------|
| Werewolf | Wolf ears, amber eyes, claws, fur collar, tail | Dark mist, amber glow |
| W. Shaman | Wolf ears + tribal staff, purple runes, bone necklace | Purple curse symbols, bone dust |
| Alpha Wolf | Massive ears, RED eyes, larger claws, bone crown | Red eye trails, intimidation waves |
| W. Seer | Wolf ears + blue seer eye, arcane runes on arms | Blue-amber dual glow, rune circles |

#### Solo Team (3 costumes)
| Role | Key Visual Elements | Particles |
|------|-------------------|-----------|
| Headhunter | Hooded cloak, crosshair monocle, hidden blade | Dark shadow trail, crosshair flicker |
| Fool | Jester hat with bells, patchwork outfit, oversized shoes | Confetti, spinning stars, bell jingles |
| Bomber | Dynamite on belt, goggles, lit fuse, blast vest | Fuse sparks, smoke wisps, mini explosions |

### Role Reveal Animation Sequence
1. Character glows white (0.5s)
2. Costume elements materialize with particle burst (1s)
3. Role-specific pose + expression (0.5s)
4. Role name text floats above character

### Death Animation Sequence
1. Character staggers, shocked expression (0.5s)
2. Falls to ground dramatically (0.5s)
3. Cute ghost rises from body (1s)
4. Role reveal (if not already known)
5. Ghost fades to translucent (spectator mode)
6. If Avenger: red vengeance rune flies to revenge target
7. If Bomber: bomb icon visible on belt

### Cursed Transformation Animation
1. Character convulses, dark veins spread across skin (1s)
2. Small wolf ears sprout, nails extend slightly (1s)
3. Eyes flash amber for a moment (0.5s)
4. Dark particle burst, character joins wolf group (0.5s)

### Bomber Explosion Animation
1. Fuse burns down (countdown visual, 1s)
2. Screen shake + flash (0.3s)
3. Fire + smoke particles burst (1s)
4. Debris settles, target eliminated (0.5s)

### Medium Resurrection Animation
1. Ghost of dead player glows brighter (0.5s)
2. Light pillar descends from sky (1s)
3. Ghost solidifies, color returns (1s)
4. Character stands up, alive again (0.5s)

---

## Module 4: Effects & Polish (1-2 days)

### Particle Systems
- Fireflies (night scene) — random floating green-yellow dots
- Campfire sparks — upward orange particles from fire
- Fog (night) — low-lying volumetric fog plane
- Potion bubbles (witch) — floating green/red spheres
- Hearts (cupid-related) — floating heart shapes
- Stars (seer) — twinkling star particles
- Curse runes (shaman) — purple floating symbols
- Fuse sparks (bomber) — orange sparking trail
- Dark veins (cursed transformation) — purple-red tendrils
- Ghost wisps (medium) — ethereal cyan wisps
- Trap glint (beast hunter) — metallic shine
- Gun smoke (gunner) — white puff on shoot
- Confetti (fool) — colorful paper bits
- Blood/vengeance (avenger) — red ember particles

### Post-Processing
- `Effects.tsx` — Post-processing stack
  - Bloom: make lights and glowing elements pop
  - Vignette: subtle darkening at edges (stronger at night)
  - Color grading: warm tint for day, cool blue for night
  - Screen shake: on death events (brief, subtle)

### Shaders
- `moonlight.glsl` — Volumetric moon god-rays (night only)
- `outline.glsl` — Selection glow outline for highlighted characters
- `fog.glsl` — Animated ground fog

### Day/Night Transition
Full 10-second transition synced with game phase:
1. Skybox blend (0-10s)
2. Lighting color/intensity shift (0-8s)
3. Particle activation/deactivation (2-8s)
4. Post-processing color grade shift (0-10s)
5. Ambient sound crossfade (0-10s)
6. UI theme shift (5-10s)

### Performance
- LOD system: reduce polygon count at distance
- Quality settings: Low / Medium / High / Ultra
  - Low: no shadows, no particles, no post-processing, reduced model detail
  - Medium: soft shadows, some particles, bloom only
  - High: full shadows, all particles, full post-processing
  - Ultra: highest texture quality, SSAO, volumetric fog
- Auto-quality: monitor FPS, reduce quality if < 30 FPS
- Model compression: DRACO for all .glb files
- Texture atlasing: combine related textures to reduce draw calls

---

## Success Criteria

- [ ] 3D village scene renders with day and night lighting
- [ ] Day/night transition plays smoothly on phase change
- [ ] Characters appear for each player, positioned correctly
- [ ] Characters show idle animation (breathing, blinking)
- [ ] Clicking a character selects them (glow outline)
- [ ] Dead characters show ghost state
- [ ] Role reveal animation plays with costume + particles (all 16 roles)
- [ ] Cursed transformation animation plays on wolf bite conversion
- [ ] Bomber explosion animation plays with screen shake
- [ ] Medium resurrection animation plays with light pillar
- [ ] Camera transitions smoothly between phases
- [ ] Fireflies, campfire sparks, fog effects visible at night
- [ ] Runs at 60 FPS on modern desktop, 30 FPS on mobile
- [ ] Loading screen shows while models load (< 5s on broadband)

---

## Key Files

```
client/src/components/3d/GameScene.tsx
client/src/components/3d/Village.tsx
client/src/components/3d/Character.tsx
client/src/components/3d/CharacterGroup.tsx
client/src/components/3d/Skybox.tsx
client/src/components/3d/Lighting.tsx
client/src/components/3d/Effects.tsx
client/src/components/3d/CameraController.tsx
client/src/three/models/useCharacterModel.ts
client/src/three/models/useVillageModel.ts
client/src/three/models/useCostumeModel.ts
client/src/three/animations/useIdleAnimation.ts
client/src/three/animations/useWalkAnimation.ts
client/src/three/animations/useExpressions.ts
client/src/three/animations/useRoleAnimation.ts
client/src/three/shaders/moonlight.glsl
client/src/three/shaders/outline.glsl
client/src/three/shaders/fog.glsl
client/src/three/utils/camera-utils.ts
client/src/three/utils/lighting-utils.ts
client/src/three/utils/performance.ts
public/models/character-base.glb
public/models/village-scene.glb
public/models/costumes/*.glb          (16 role costumes)
public/textures/*
```

---

## 3D Asset Pipeline

### Option A: Professional 3D Artist (Best Quality)
- Commission chibi character + village from freelance artist
- Estimated cost: $3,000-8,000
- Delivery: 2-4 weeks

### Option B: AI-Assisted + Manual Cleanup (Faster, Cheaper)
- Use Meshy/Tripo3D to generate base models from text prompts
- Manual cleanup in Blender: topology, UV unwrap, rigging
- Estimated cost: $500-1,500
- Delivery: 1-2 weeks

### Option C: Open-Source Models (Fastest, Free)
- Use existing chibi character models from Sketchfab/Mixamo
- Customize textures and add role-specific accessories
- Estimated cost: $0-200 (licenses)
- Delivery: 3-5 days

**Recommendation:** Start with Option C for MVP, upgrade to Option A/B for polish phase.
