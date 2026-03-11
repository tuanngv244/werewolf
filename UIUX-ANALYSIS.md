# Werewolf Game (Ma Soi) — UI/UX Analysis & Design System

> Generated: 2026-03-09 | Stack: Next.js 15 + React Three Fiber + TailwindCSS
> Roles: 16 (9 Village + 4 Werewolf + 3 Solo) — see ROLES.md

---

## 1. Platform Overview

| Metric | Value |
|--------|-------|
| Game Type | Real-time multiplayer social deduction |
| Players | 6-16 per room |
| Roles | 16 (9 Village + 4 Werewolf + 3 Solo) |
| Core Experience | 3D village scene + UI overlay |
| Design Style | Super cute chibi 3D + whimsical fantasy UI |
| Theme Modes | Day (warm) + Night (dark) — synced with game phase |
| Target Devices | Desktop (primary), Tablet, Mobile |
| Languages | English + Vietnamese (i18n) |
| Art Direction | Cute chibi characters with realistic material quality |

---

## 2. Design Philosophy — Cute Fantasy

### 2.1 Visual Identity

The game world is a **cute, magical medieval village** where adorable chibi characters try to survive werewolf attacks. The visual style blends:

- **Chibi 3D characters** — Big heads, small bodies, oversized eyes, exaggerated expressions
- **Storybook environments** — Warm cottages, glowing lanterns, magical forests
- **Fantasy UI elements** — Scrolls, wooden frames, magical runes, parchment textures
- **Soft, rounded shapes** — Everything feels friendly and approachable
- **Rich lighting** — Warm golden days, mysterious blue-silver nights

The overall feel should be: **"A bedtime fairy tale where cute villagers outwit sneaky wolves."**

### 2.2 Design Principles

| Principle | Application |
|-----------|-------------|
| **Adorable** | Characters, icons, and UI elements all radiate cuteness — big eyes, round shapes, warm colors |
| **Immersive** | The 3D village creates a sense of place — you're IN the village, not just looking at cards |
| **Readable** | Despite the cute aesthetic, all information must be clear — who's alive, what phase, timer |
| **Dramatic** | Key moments (night fall, death, vote reveal, bomb explosion) have theatrical flair |
| **Inclusive** | Vietnamese culture-friendly defaults, bilingual with zero friction switching |
| **Performant** | 3D must run smoothly on mid-range devices — beauty shouldn't sacrifice playability |

### 2.3 Color Palette

```
=== DAY PHASE PALETTE ===
Sky:                #87CEEB → #4A90D9 (gradient, bright blue)
Sunlight:           #FFD93D (warm golden)
Grass:              #7EC850 (fresh green)
Cottages:           #D4A574 (warm wood), #C94C4C (red roofs)
UI Background:      #FFF8E7 (warm cream)
UI Card:            #FFFFFF with shadow + wooden border frame
UI Text Primary:    #2C1810 (dark brown)
UI Text Secondary:  #8B7355 (warm brown)
UI Accent:          #E8A838 (golden amber)
UI Button Primary:  #4CAF50 (friendly green) → #45a049 (hover)
UI Button Danger:   #E74C3C (warm red)
UI Button Ghost:    transparent, border #D4A574

=== NIGHT PHASE PALETTE ===
Sky:                #0B1026 → #1a1a3e (gradient, deep navy)
Moonlight:          #C4D7E0 (cool silver-blue)
Stars:              #FFFFFF, #FFD93D (twinkling)
Lanterns:           #FFB347 (warm orange glow)
Fog:                rgba(180, 200, 220, 0.15)
UI Background:      #1A1A2E (deep navy)
UI Card:            #16213E with soft glow border
UI Text Primary:    #E8E8E8 (light gray)
UI Text Secondary:  #8892A8 (muted blue-gray)
UI Accent:          #C4A35A (moonlit gold)
UI Button Primary:  #5B6EAE (muted blue)
UI Button Danger:   #C0392B (deep red)

=== ROLE COLORS (16 roles) ===

Village Team:
  Doctor:           #3498DB (medical blue) + #FFFFFF (coat white)
  Gunner:           #B8860B (dark goldenrod) + #8B4513 (leather brown)
  Seer:             #9B59B6 (mystic purple) + #E8D5F5 (aura)
  Aura Seer:        #E6E6FA (lavender) + #FFD700 (golden orb)
  Medium:           #7FDBFF (ethereal cyan) + #D3D3D3 (ghostly gray)
  Witch:            #6C3483 (deep purple) + #27AE60 (potion green)
  Avenger:          #C0392B (vengeance red) + #1C1C1C (dark cloak)
  Beast Hunter:     #8B6914 (leather brown) + #556B2F (dark olive)
  Cursed:           #27AE60 (village green) → #8B0000 (wolf red on transform)

Werewolf Team:
  Werewolf:         #8B0000 (dark red) + #FF4500 (amber eyes)
  Werewolf Shaman:  #800080 (purple) + #8B0000 (dark red) + bone white
  Alpha Werewolf:   #4A0000 (deep crimson) + #FF0000 (red eyes)
  Werewolf Seer:    #191970 (midnight blue) + #8B0000 (dark red)

Solo Team:
  Headhunter:       #2C3E50 (dark gray-blue) + #E74C3C (target red)
  Fool:             #FF6B6B (coral pink) + #FFD93D (yellow) + #7B68EE (purple)
  Bomber:           #FF8C00 (dark orange) + #FFD700 (gold fuse) + #333333 (gunpowder)

=== SEER RESULT COLORS ===
Good (Thiện):       #4CAF50 (green) with halo icon
Evil (Ác):          #E74C3C (red) with devil horns icon
Unknown (Không Rõ): #9E9E9E (gray) with question mark icon

=== STATUS COLORS ===
Alive:              #4CAF50 (green)
Dead:               #95A5A6 (gray) with ghost overlay
Voting:             #F39C12 (amber)
Protected:          #3498DB (blue shield)
Poisoned:           #9B59B6 (purple)
Cursed by Shaman:   #800080 (purple curse runes)
Trapped:            #556B2F (dark olive bear trap)
Bombed:             #FF8C00 (orange bomb icon)
Targeted (Headhunter): #E74C3C (red crosshair, only HH sees)
```

### 2.4 Typography

```
=== FONTS ===
Headings:       "Fredoka One" — rounded, playful, bubbly
Body Text:      "Nunito" — friendly rounded sans-serif
Game UI:        "Nunito" semi-bold for labels, regular for descriptions
Chat:           "Nunito" regular, 14px
Monospace:      "Fira Code" (for room codes)

=== SCALE ===
Game Title:         4xl-6xl (36-60px), Fredoka One, tracking-tight
Section Headers:    2xl-3xl (24-30px), Fredoka One
Card Titles:        lg-xl (18-20px), Nunito Bold
Body Text:          base (16px), Nunito Regular
Labels/Captions:    sm (14px), Nunito Semi-bold
Badges:             xs (12px), Nunito Bold, uppercase
Timer Display:      5xl (48px), Fredoka One, monospace-numeric
Room Code:          3xl (30px), Fira Code, letter-spacing 0.3em

=== SPECIAL TEXT STYLES ===
Role Name:          xl, Fredoka One, role-specific color, text-shadow glow
Phase Title:        4xl, Fredoka One, animated fade-in, centered
Death Message:      lg, Nunito Italic, red/gray, with skull emoji
System Message:     sm, Nunito, muted color, italic
```

### 2.5 Spacing & Layout

```
=== GENERAL ===
Container:          max-w-7xl (1280px) with px-4 sm:px-6 lg:px-8
Card Padding:       p-4 (16px) compact, p-6 (24px) default
Section Gap:        py-8 (32px) between sections
Card Gap:           gap-4 (16px) in grids
Border Radius:      rounded-2xl (16px) for cards
                    rounded-xl (12px) for buttons
                    rounded-lg (8px) for inputs
                    rounded-full for avatars and badges

=== GAME VIEW ===
3D Canvas:          Full viewport (100vw × 100vh)
UI Overlay:         Absolute positioned panels over canvas
Top Bar:            h-16 (64px), fixed top, full width
Side Panels:        w-80 (320px), fixed left or right, scrollable
Bottom Panel:       h-auto, fixed bottom, chat + actions
Player Circle:      Radial layout, responsive to player count
```

---

## 3. Page Layouts & Wireframes

### 3.1 Home / Landing Page

```
┌──────────────────────────────────────────────────────────────┐
│  [🐺 Logo]   How to Play   Roles   About    [EN|VI] [Login] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              ┌─────────────────────────────┐                 │
│              │                             │                 │
│              │   3D Village Scene          │                 │
│              │   (Animated chibi chars     │                 │
│              │    walking around village)  │                 │
│              │                             │                 │
│              └─────────────────────────────┘                 │
│                                                              │
│         🐺 WEREWOLF  ·  MA SÓI                              │
│         "Can you find the wolf among us?"                    │
│                                                              │
│    ┌─────────────────┐    ┌──────────────────┐               │
│    │  ▶ PLAY NOW     │    │  📖 How to Play  │               │
│    └─────────────────┘    └──────────────────┘               │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│    ⚔️ HOW TO PLAY                                            │
│    ┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐  │
│    │ Step 1 │────▶│ Step 2 │────▶│ Step 3 │────▶│ Step 4 │  │
│    │  Join  │     │ Night  │     │  Day   │     │  Vote  │  │
│    │  Room  │     │ Phase  │     │ Phase  │     │ Phase  │  │
│    └────────┘     └────────┘     └────────┘     └────────┘  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│    🎭 ROLES (16 roles across 3 teams)                        │
│                                                              │
│    ── VILLAGE TEAM (Phe Dân) ──                              │
│    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│    │💊 Doc  │ │🔫 Gun  │ │🔮 Seer │ │✨ Aura │ │👻 Med  │   │
│    │Bác Sĩ  │ │Xạ Thủ  │ │Tiên Tri│ │Thầy Bói│ │Thầy Đồng│  │
│    └────────┘ └────────┘ └────────┘ └────────┘ └────────┘   │
│    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│    │🧙 Witch│ │⚔️ Avngr│ │🪤 BHunt│ │🔄 Crsd │              │
│    │Phù Thủy│ │Báo Thù │ │Săn Thú │ │Bán Sói │              │
│    └────────┘ └────────┘ └────────┘ └────────┘              │
│                                                              │
│    ── WEREWOLF TEAM (Phe Sói) ──                             │
│    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│    │🐺 Wolf │ │🐺 Shamn│ │🐺 Alpha│ │🐺 WSeer│              │
│    │Ma Sói  │ │Sói P.Sư│ │Sói Đ.Đ │ │Sói T.T │              │
│    └────────┘ └────────┘ └────────┘ └────────┘              │
│                                                              │
│    ── SOLO TEAM (Phe Riêng) ──                               │
│    ┌────────┐ ┌────────┐ ┌────────┐                          │
│    │🎯 HHead│ │🃏 Fool │ │💣 Bomb │                          │
│    │Săn Người│ │Thằng Ngố│ │Đặt Bom │                          │
│    └────────┘ └────────┘ └────────┘                          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  Footer: Made with ❤️ | GitHub | Discord | Privacy          │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Create Room — Role Selection

```
┌──────────────────────────────────────────────────────────────┐
│  CREATE ROOM                                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Room Name: [_________________]   Language: [🇺🇸 EN ▼]      │
│  Max Players: [===========●===] 10                           │
│                                                              │
│  ── SELECT ROLES ──                                          │
│                                                              │
│  VILLAGE TEAM (Phe Dân)                     Auto-Balance: ON │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ [✅] 💊 Doctor / Bác Sĩ          Seer: Good        │    │
│  │ [✅] 🔫 Gunner / Xạ Thủ          Seer: Unknown     │    │
│  │ [✅] 🔮 Seer / Tiên Tri          Seer: Good        │    │
│  │ [  ] ✨ Aura Seer / Thầy Bói     Seer: Good        │    │
│  │ [  ] 👻 Medium / Thầy Đồng       Seer: Unknown     │    │
│  │ [✅] 🧙 Witch / Phù Thủy         Seer: Unknown     │    │
│  │ [  ] ⚔️ Avenger / Kẻ Báo Thù     Seer: Good        │    │
│  │ [  ] 🪤 Beast Hunter / Săn Thú   Seer: Unknown     │    │
│  │ [  ] 🔄 Cursed / Bán Sói         Seer: Good→Evil   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  WEREWOLF TEAM (Phe Sói)                                     │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ [✅] 🐺 Werewolf / Ma Sói       ×2   Seer: Evil    │    │
│  │ [  ] 🐺 W. Shaman / Sói Pháp Sư     Seer: Evil    │    │
│  │ [  ] 🐺 Alpha Wolf / Sói Đầu Đàn    Seer: Unknown  │    │
│  │ [  ] 🐺 W. Seer / Sói Tiên Tri      Seer: Evil    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  SOLO TEAM (Phe Riêng)                                       │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ [  ] 🎯 Headhunter / Thợ Săn Người  Seer: Unknown  │    │
│  │ [  ] 🃏 Fool / Thằng Ngố            Seer: Unknown  │    │
│  │ [  ] 💣 Bomber / Kẻ Đặt Bom         Seer: Unknown  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  TIMERS                                                      │
│  Night:  [30s] [45s] [●60s]                                  │
│  Day:    [2m] [●3m] [5m]                                     │
│  Vote:   [20s] [●30s] [45s]                                  │
│  Words:  [●10s] [15s] [20s]                                  │
│                                                              │
│  Summary: 10 players = 2🐺 + 1🔮 + 1💊 + 1🧙 + 1🔫 + 4🌾   │
│  (Remaining slots filled with Villagers)                     │
│                                                              │
│        [Cancel]                    [Create Room ▶]           │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 In-Game View (Night Phase — Seer)

```
┌──────────────────────────────────────────────────────────────┐
│  🌙 NIGHT PHASE  │  Round 2  │  ⏱️ 0:32  │  9/12 Alive     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────────────────────────────────────────────┐   │
│   │              🌙  3D VILLAGE SCENE  🌙                │   │
│   │      Dark village with moonlight, fog, fireflies     │   │
│   │      Characters in sleeping positions                │   │
│   │                                                      │   │
│   │   ┌───────────────────────────────────┐              │   │
│   │   │ 🔮 You are the SEER (Tiên Tri)   │              │   │
│   │   │                                   │              │   │
│   │   │ Choose a player to reveal their   │              │   │
│   │   │ true role:                        │              │   │
│   │   │                                   │              │   │
│   │   │ ┌──────┐ ┌──────┐ ┌──────┐       │              │   │
│   │   │ │ 😊   │ │ 😎   │ │ 🤗   │       │              │   │
│   │   │ │Wolf42│ │Minh01│ │HoaLe │       │              │   │
│   │   │ │[Pick]│ │[Pick]│ │[Pick]│       │              │   │
│   │   │ └──────┘ └──────┘ └──────┘       │              │   │
│   │   │ ┌──────┐ ┌──────┐ ┌──────┐       │              │   │
│   │   │ │ 😄   │ │ 😊   │ │ 😎   │       │              │   │
│   │   │ │Tuan99│ │LinhNg│ │Gamer │       │              │   │
│   │   │ │[Pick]│ │[Pick]│ │[Pick]│       │              │   │
│   │   │ └──────┘ └──────┘ └──────┘       │              │   │
│   │   │                                   │              │   │
│   │   │         [Confirm Check 🔮]        │              │   │
│   │   └───────────────────────────────────┘              │   │
│   │                                                      │   │
│   │   Last night result:                                 │   │
│   │   "Minh01 is 🐺 Werewolf (Ma Sói) — EVIL"          │   │
│   │                                                      │   │
│   └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 3.4 In-Game View (Day Phase — Gunner Action)

```
┌──────────────────────────────────────────────────────────────┐
│  ☀️ DAY PHASE  │  Round 2  │  ⏱️ 2:15  │  8/12 Alive       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐  ┌──────────────────────────────┐   │
│  │ PLAYERS (8 alive)   │  │ 💬 VILLAGE CHAT              │   │
│  │                     │  │                              │   │
│  │ 😊 Wolf42     ✅   │  │ Wolf42: I was sleeping!      │   │
│  │ 😎 Minh01     ✅   │  │ Minh01: suspicious...        │   │
│  │ 🤗 HoaLe     ✅   │  │ HoaLe: I think Minh01 is 🐺 │   │
│  │ 😄 Tuan99     ✅   │  │ System: ☠️ LinhNg was killed │   │
│  │ 😊 Gamer      ✅   │  │         by werewolves        │   │
│  │ 😎 BaoKhanh   ✅   │  │ Tuan99: let's vote Minh01    │   │
│  │ 🤗 ThuyAnh    ✅   │  │                              │   │
│  │ 😄 DucMinh    ✅   │  │ ────────────────────────     │   │
│  │ 😊 LinhNg     💀   │  │ [Type message...]    [Send]  │   │
│  │ 😎 AnhTu      💀   │  │                              │   │
│  │                     │  └──────────────────────────────┘   │
│  │                     │                                     │
│  │ 🔫 YOUR ACTION:     │  ┌──────────────────────────────┐   │
│  │ Gunner (Xạ Thủ)    │  │ 🔫 GUNNER: 2 bullets left    │   │
│  │ Bullets: ●● (2/2)  │  │ Shoot a player? (irreversible)│   │
│  │                     │  │ [Select player ▼] [🔫 Shoot]  │   │
│  │ [📢 Nominate]       │  └──────────────────────────────┘   │
│  └─────────────────────┘                                     │
│                                                              │
│              [⏭️ Skip to Vote]  (majority needed)            │
└──────────────────────────────────────────────────────────────┘
```

### 3.5 Game Over Screen

```
┌──────────────────────────────────────────────────────────────┐
│              🎉 VILLAGE WINS! / Dân Làng Chiến Thắng! 🎉    │
│              "The werewolves have been defeated!"             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────────────────────────────────────────────┐   │
│   │  ROLE REVEAL — All 16 possible roles shown           │   │
│   │                                                      │   │
│   │  Wolf42   → 🐺 Werewolf / Ma Sói        ELIMINATED  │   │
│   │  Minh01   → 🐺 Alpha Wolf / Sói Đ.Đàn   ELIMINATED  │   │
│   │  HoaLe    → 🔮 Seer / Tiên Tri          SURVIVED ⭐ │   │
│   │  Tuan99   → 💊 Doctor / Bác Sĩ          SURVIVED ⭐ │   │
│   │  Gamer    → 🔫 Gunner / Xạ Thủ          SURVIVED ⭐ │   │
│   │  BaoKhanh → 🧙 Witch / Phù Thủy         ELIMINATED  │   │
│   │  ThuyAnh  → 🃏 Fool / Thằng Ngố         SURVIVED    │   │
│   │  DucMinh  → 🪤 Beast Hunter / Săn Thú   SURVIVED ⭐ │   │
│   │  LinhNg   → 🌾 Villager / Dân Làng      ELIMINATED  │   │
│   │  AnhTu    → 🔄 Cursed / Bán Sói         ELIMINATED  │   │
│   │                                (converted to 🐺)     │   │
│   │                                                      │   │
│   │  🃏 Fool (ThuyAnh) did NOT achieve solo win          │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                              │
│   ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│   │ 📊 Your Stats│  │ +25 XP Earned │  │ +10 Gold Coins  │  │
│   │ Role: Seer   │  │ Level 3 → 4   │  │ Balance: 150    │  │
│   │ Kills: 0     │  │ ████████░░    │  │                 │  │
│   │ Checks: 3    │  │               │  │                 │  │
│   └──────────────┘  └───────────────┘  └─────────────────┘  │
│                                                              │
│       [🔄 Play Again]    [🏠 Home]    [📊 Full Stats]        │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. 3D Character Design — Detailed Specifications

### 4.1 Base Character Model

```
=== CHIBI PROPORTIONS ===
Total Height:       ~2.5 head heights
Head:               40% of total height (oversized, round)
Body:               35% of total height (small, stubby)
Legs:               25% of total height (short, thick)
Arms:               Short, slightly chubby
Hands:              Simplified mitt-style (3 fingers + thumb visible)
Feet:               Small, rounded boots/shoes

=== FACE DETAILS ===
Eyes:               Large (30% of face width), round, shiny
                    Iris has light reflection dots (2 small white circles)
                    Subtle iris color gradient
                    Eyelids with blink animation (every 3-5 seconds)
                    Pupils dilate in fear, contract in anger
Eyebrows:           Thin, expressive, above eye area
Nose:               Very small dot or slight bump (chibi style)
Mouth:              Small in neutral, stretches for expressions
                    Cat-mouth (:3) for cute idle
Cheeks:             Permanent soft blush (pink circles)
Ears:               Small, rounded, human (unless werewolf reveal)

=== SKIN ===
Shader:             PBR with subsurface scattering (SSS)
Tone Options:       Light, Medium, Tan, Dark, Fantasy (blue, green)

=== TECHNICAL ===
Polygon Budget:     5,000-8,000 tris per character
Texture Size:       1024×1024 per character atlas
Format:             GLTF 2.0 / GLB (binary), DRACO compressed
Skeleton:           ~30 bones (humanoid rig)
Blend Shapes:       8 face expressions + 4 mouth shapes
```

### 4.2 Role Costume Designs (16 roles)

```
=== VILLAGE TEAM ===

DOCTOR (BÁC SĨ) — Seer: Good
  Base: White coat over simple clothes
  Additions: Stethoscope, medical bag, red cross glow
  Particles: Soft green healing glow, floating plus signs
  Color: #3498DB blue + #FFFFFF white

GUNNER (XẠ THỦ) — Seer: Unknown
  Base: Brown leather vest, belt with holsters
  Additions: Dual pistols holstered, ammo belt, cowboy-style hat
  Particles: Gun smoke wisps, brass shell casings
  Color: #B8860B goldenrod + #8B4513 brown

SEER (TIÊN TRI) — Seer: Good
  Base: Mystic purple robe with star/moon patterns
  Additions: Crystal ball floating beside, third eye glow on forehead
  Particles: Star sparkles, crystal reflections, constellation dots
  Color: #9B59B6 purple + #E8D5F5 light purple

AURA SEER (THẦY BÓI) — Seer: Good
  Base: White flowing robes, ethereal
  Additions: Glowing orb of golden light, spectral aura rings around hands
  Particles: Golden light motes, aura waves
  Color: #E6E6FA lavender + #FFD700 gold

MEDIUM (THẦY ĐỒNG) — Seer: Unknown
  Base: Dark blue ceremonial robes
  Additions: Spirit lantern (ghostly green), ghostly veil, floating candles
  Particles: Ghost wisps, candle flames, spirit orbs
  Color: #7FDBFF cyan + #D3D3D3 ghostly gray

WITCH (PHÙ THỦY) — Seer: Unknown
  Base: Dark purple layered dress
  Additions: Pointy hat (bent tip), bubbling cauldron, 2 potion bottles
  Particles: Bubbles, sparkles, potion drip, runic symbols
  Color: #6C3483 deep purple + #27AE60 green + #E74C3C red

AVENGER (KẺ BÁO THÙ) — Seer: Good
  Base: Dark hooded cloak
  Additions: Glowing red dagger, vengeance rune on forehead, flame aura
  Particles: Red ember particles, dark smoke wisps
  Color: #C0392B crimson + #1C1C1C black

BEAST HUNTER (THỢ SĂN QUÁI THÚ) — Seer: Unknown
  Base: Heavy leather armor, scarred
  Additions: Large bear trap in hand, trophy necklace (teeth/claws), scars
  Particles: Dust, leaf particles, metallic glint on trap
  Color: #8B6914 leather + #556B2F dark olive

CURSED (BÁN SÓI) — Seer: Good → Evil
  Base: Normal villager outfit
  Transformation: Dark veins spread across skin, eyes flash amber,
                  small wolf features emerge (subtle ears, slightly longer nails)
  Particles: Dark energy crackle on transformation, purple-red veins
  Color: #27AE60 green → #8B0000 dark red (gradual shift)

=== WEREWOLF TEAM ===

WEREWOLF (MA SÓI) — Seer: Evil
  Base: Torn peasant clothes
  Additions: Fluffy wolf ears, amber glowing eyes, claws, fur collar, tail
  Particles: Dark mist swirls, amber eye glow
  Color: #8B0000 dark red + #FF4500 amber

WEREWOLF SHAMAN (SÓI PHÁP SƯ) — Seer: Evil
  Base: Tribal-style torn clothes
  Additions: Wolf ears + mystic tribal staff with skull, purple curse runes, bone necklace
  Particles: Purple curse symbols floating, bone dust, dark energy swirls
  Color: #800080 purple + #8B0000 red + bone #F5F5DC

ALPHA WEREWOLF (SÓI ĐẦU ĐÀN) — Seer: Unknown
  Base: Larger frame than normal werewolf
  Additions: Massive wolf ears, RED glowing eyes (not amber), larger claws,
             crown of bones, battle scars, thicker fur
  Particles: Red eye trails, dark aura, intimidation waves
  Color: #4A0000 deep crimson + #FF0000 red eyes

WEREWOLF SEER (SÓI TIÊN TRI) — Seer: Evil
  Base: Dark robes with wolf motifs
  Additions: Wolf ears + glowing blue seer eye (one eye wolf amber, one eye seer blue),
             arcane wolf runes on arms, mystic wolf-eye amulet
  Particles: Blue and amber dual glow, rune circles, knowledge sparkles
  Color: #191970 midnight blue + #8B0000 dark red

=== SOLO TEAM ===

HEADHUNTER (THỢ SĂN NGƯỜI) — Seer: Unknown
  Base: Hooded dark cloak, mysterious
  Additions: Crosshair monocle over one eye, hidden blade, target mark
             (only the Headhunter sees a red crosshair on their target)
  Particles: Subtle dark shadow trail, crosshair flicker
  Color: #2C3E50 dark blue-gray + #E74C3C target red

FOOL (THẰNG NGỐ) — Seer: Unknown
  Base: Colorful patchwork outfit
  Additions: Jester hat with 3 bells (red, yellow, purple), oversized shoes,
             curly-toed boots, ruffled collar, silly grin
  Particles: Confetti, spinning stars, bell jingles (particles)
  Color: #FF6B6B coral + #FFD93D yellow + #7B68EE purple

BOMBER (KẺ ĐẶT BOM) — Seer: Unknown
  Base: Heavy work clothes, soot-stained
  Additions: Dynamite sticks strapped to belt, goggles on forehead,
             lit fuse in hand, mischievous grin, blast-shield vest
  Particles: Fuse sparks, smoke wisps, tiny explosion flashes
  Color: #FF8C00 dark orange + #FFD700 gold fuse + #333333 gunpowder
```

### 4.3 Character Animations

```
=== SHARED ANIMATIONS (All Characters) ===
Idle:               Breathing, weight shift, blink (every 3-5s)
Walk:               Bouncy chibi walk (slight hop per step)
Point:              Arm extends, finger points (accusation)
Clap:               Happy clapping (victory)
Cry:                Eyes water, arms rub eyes (defeat)
Sleep:              Z's float up, eyes closed (night phase villagers)
Ghost Rise:         Soul separates, floats up with cute ghost sheet

=== EXPRESSION BLEND SHAPES ===
Neutral, Happy, Scared, Angry, Suspicious, Sad, Surprised, Dead
Smirk (werewolf plotting), Mischievous (Fool/Bomber)

=== ROLE-SPECIFIC ANIMATIONS ===
Doctor:             Open medical bag, administer medicine, thumbs up
Gunner:             Draw pistol, aim, fire (recoil), holster
Seer:               Hold crystal ball, sparkle effect, nod knowingly
Aura Seer:          Hold glowing orb, aura pulse, revelation gesture
Medium:             Hold spirit lantern, ghostly voices, resurrection glow
Witch:              Stir cauldron, hold potion, pour
Avenger:            Draw dagger, mark target with red rune
Beast Hunter:       Set trap on ground, mechanical snap animation
Cursed Transform:   Convulse, dark veins spread, wolf features emerge
Werewolf Attack:    Leap, slash with claws, howl
W. Shaman Curse:    Wave tribal staff, purple runes fly toward target
Alpha Wolf:         Larger, more aggressive attack, ground pound
W. Seer Check:      One eye glows blue, mystical scan
Headhunter:         Adjust monocle, mark target (crosshair appears)
Fool:               Dance, juggle, bells jingle, pratfall
Bomber Plant:       Place bomb carefully, light fuse, sneak away
Bomber Explode:     Bomb detonates (screen shake, fire, smoke)
```

---

## 5. Localization (i18n) — All 16 Roles

### 5.1 Role Translation Table

| Key | English | Vietnamese |
|-----|---------|-----------|
| `role.doctor.name` | Doctor | Bác Sĩ |
| `role.doctor.desc` | Each night, protect one player from being killed | Chọn một người để che chở mỗi đêm, người đó sẽ không bị giết |
| `role.gunner.name` | Gunner | Xạ Thủ |
| `role.gunner.desc` | Has 2 bullets to shoot any player during the day | Có hai viên đạn để bắn ai đó vào ban ngày |
| `role.seer.name` | Seer | Tiên Tri |
| `role.seer.desc` | Each night, view one player's exact role | Được xem vai trò của một người chơi mỗi đêm |
| `role.auraSeer.name` | Aura Seer | Thầy Bói |
| `role.auraSeer.desc` | Each night, view one player's alignment (Good/Evil/Unknown) | Xem được một người chơi thuộc phe nào mỗi đêm |
| `role.medium.name` | Medium | Thầy Đồng |
| `role.medium.desc` | Talk to dead players each night. Resurrect one player per game | Nói chuyện với người đã chết mỗi đêm và hồi sinh một người mỗi ván |
| `role.witch.name` | Witch | Phù Thủy |
| `role.witch.desc` | Has 1 heal potion (only when target is attacked) and 1 kill potion | Có một bình cứu (chỉ khi bị tấn công) và một bình giết |
| `role.avenger.name` | Avenger | Kẻ Báo Thù |
| `role.avenger.desc` | Choose a player who will die if you are killed | Chọn một người để chết khi bạn bị giết |
| `role.beastHunter.name` | Beast Hunter | Thợ Săn Quái Thú |
| `role.beastHunter.desc` | Place a trap. If wolf bites trapped player, weakest wolf dies | Đặt bẫy lên người chơi. Khi sói cắn người có bẫy, sói yếu nhất chết |
| `role.cursed.name` | Cursed | Bán Sói |
| `role.cursed.desc` | Normal villager until bitten by werewolf, then becomes a werewolf | Là Dân Làng cho tới khi bị Sói cắn, sau đó trở thành Sói |
| `role.werewolf.name` | Werewolf | Ma Sói |
| `role.werewolf.desc` | Each night, vote with other wolves to kill one player | Chọn một người để cắn chết vào mỗi đêm |
| `role.werewolfShaman.name` | Werewolf Shaman | Sói Pháp Sư |
| `role.werewolfShaman.desc` | During the day, curse a player to appear Evil to Seers that night | Yểm một người ban ngày, người đó bị coi là Ác bởi Tiên Tri ban đêm |
| `role.alphaWerewolf.name` | Alpha Werewolf | Sói Đầu Đàn |
| `role.alphaWerewolf.desc` | A werewolf with double voting power in the night kill vote | Ma Sói có gấp đôi phiếu bầu trong đêm |
| `role.werewolfSeer.name` | Werewolf Seer | Sói Tiên Tri |
| `role.werewolfSeer.desc` | View one player's role at night — all wolves see the result | Xem vai trò của ai đó trong đêm, các Sói sẽ biết |
| `role.headhunter.name` | Headhunter | Thợ Săn Người |
| `role.headhunter.desc` | Get your target voted out to win. If target dies otherwise, join Village | Lừa mục tiêu bị treo cổ ban ngày. Nếu mục tiêu chết cách khác, thắng cùng Dân |
| `role.fool.name` | Fool | Thằng Ngố |
| `role.fool.desc` | Win by getting yourself voted out during the day | Lừa dân làng treo cổ bạn vào ban ngày |
| `role.bomber.name` | Bomber | Kẻ Đặt Bom |
| `role.bomber.desc` | Place a bomb at night, explodes next night. Immune to werewolf kills | Đặt bom ban đêm, nổ đêm sau. Không thể bị Sói giết |
| `game.phase.night` | Night Falls... | Đêm Buông Xuống... |
| `game.phase.day` | Dawn Breaks! | Bình Minh Lên! |
| `game.phase.vote` | Time to Vote! | Thời Gian Bỏ Phiếu! |
| `game.death.werewolf` | {player} was killed by werewolves | {player} đã bị sói giết |
| `game.death.vote` | {player} was voted out by the village | {player} đã bị dân làng treo cổ |
| `game.death.gunner` | {player} was shot by the Gunner | {player} đã bị Xạ Thủ bắn |
| `game.death.witch` | {player} was poisoned by the Witch | {player} đã bị Phù Thủy đầu độc |
| `game.death.avenger` | {player} was killed by the Avenger's revenge | {player} đã bị Kẻ Báo Thù trả thù |
| `game.death.bomb` | {player} was killed by the Bomber's explosion | {player} đã bị nổ bom |
| `game.death.trap` | {wolf} was killed by Beast Hunter's trap | {wolf} đã chết bởi bẫy Thợ Săn Quái Thú |
| `game.win.village` | The Village Wins! | Dân Làng Chiến Thắng! |
| `game.win.werewolf` | The Werewolves Win! | Sói Chiến Thắng! |
| `game.win.fool` | The Fool Wins! | Thằng Ngố Chiến Thắng! |
| `game.win.headhunter` | The Headhunter Wins! | Thợ Săn Người Chiến Thắng! |
| `game.win.bomber` | The Bomber Wins! | Kẻ Đặt Bom Chiến Thắng! |
| `game.seerResult.good` | Good | Thiện |
| `game.seerResult.evil` | Evil | Ác |
| `game.seerResult.unknown` | Unknown | Không Rõ |

---

## 6. Responsive Design

### 6.1 Breakpoints

| Breakpoint | Screen | 3D Quality | UI Layout |
|------------|--------|-----------|-----------|
| Mobile (<640px) | Phone portrait | Low (no shadows, no particles) | Stacked panels, bottom sheet |
| Mobile Landscape (640-768px) | Phone landscape | Low-Medium | Side-by-side, compact |
| Tablet (768-1024px) | iPad | Medium | Split view, collapsible chat |
| Desktop (1024-1440px) | Laptop | High (all effects) | Full layout, side panels |
| Large Desktop (>1440px) | Monitor | Ultra | Expanded, larger 3D |

### 6.2 Mobile Game View
- 3D scene fills entire screen (background)
- UI elements as floating overlays
- Bottom sheet for chat (swipe up)
- Player list as horizontal scroll at top
- Actions via bottom action bar
- Tap player in 3D scene to select

---

## 7. Animation & Motion Design

### 7.1 Game Phase Transitions

| Transition | Visual Effect | Duration |
|------------|--------------|----------|
| Day → Night | Sky darkens, moon rises, lanterns light, fog rolls in | 10s |
| Night → Dawn | Sky brightens, sun rises, fog clears, rooster crows | 10s |
| Discussion → Vote | Characters walk to circle, campfire lights, drums | 5s |
| Vote → Last Words | Camera zooms to eliminated player, spotlight | 3s |
| Bomb explodes | Screen shake, fire particles, smoke, debris | 2s |
| Cursed transforms | Dark veins, wolf features emerge, howl | 3s |
| Medium resurrects | Ghost descends, light pillar, flesh returns | 4s |

### 7.2 Micro-interactions

| Element | Trigger | Animation |
|---------|---------|-----------|
| Play Now button | Hover | Gentle bounce + golden glow |
| Room card | Hover | Lift 4px + shadow deepens |
| Player avatar | Hover | Scale 1.1 + name appears |
| Vote button | Click | Ballot flies to center |
| Timer < 5s | Auto | Pulse red + tick sound |
| Gunner shoots | Click | Recoil, flash, smoke |
| Bomb planted | Night | Fuse sparks, subtle ticking |
| Role reveal | Auto | Card flip + sparkle burst |

---

## 8. Accessibility

### 8.1 WCAG 2.1 AA Requirements

| Requirement | Implementation |
|-------------|----------------|
| Color contrast | All text ≥ 4.5:1 ratio |
| Keyboard navigation | Tab through all elements |
| Screen readers | aria-labels on all game actions |
| Focus indicators | Golden glow focus ring |
| Reduced motion | Disable 3D animations |
| Color-blind mode | Patterns + shapes for role indicators |
| Text scaling | 200% zoom support |

### 8.2 Seer Result Accessibility
- Good: Green + halo icon + "Good" text
- Evil: Red + devil horns icon + "Evil" text
- Unknown: Gray + question mark icon + "Unknown" text
- Never rely on color alone — always icon + text + color

---

## 9. Design Priorities

### P0 — Foundation
1. TailwindCSS game theme (fantasy palette, fonts)
2. Base UI components
3. Language toggle + i18n (all 16 roles)
4. 3D canvas setup
5. Basic village scene + lighting

### P1 — Core Game UX
6. All 16 role cards with descriptions
7. Night action panels (different for each role)
8. Day action panels (Gunner shoot, Shaman curse)
9. Vote interface
10. Chat panel (4 channels)
11. Seer result display (Good/Evil/Unknown)

### P2 — 3D Polish
12. All 16 role costumes
13. Role reveal animations
14. Phase transitions
15. Particle effects per role

### P3 — Enhancement
16. Sound effects (role-specific)
17. Tutorial covering all 16 roles
18. Accessibility features

---

*This document defines the UI/UX vision for the Werewolf Game with all 16 roles. ROLES.md is the source of truth for role definitions.*
