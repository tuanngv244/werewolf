# Werewolf Game (Ma Soi) — Architecture Document

> Last updated: 2026-03-09
> Stack: Next.js 15 + NestJS + React Three Fiber + Socket.io + PostgreSQL + Redis
> Roles: 16 (9 Village + 4 Werewolf + 3 Solo) — see ROLES.md

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Desktop     │  │   Tablet     │  │   Mobile     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         └──────────────────┼──────────────────┘                  │
│              ┌─────────────▼─────────────┐                      │
│              │   Next.js 15 Client       │                      │
│              │   R3F + Socket.io + i18n  │                      │
│              └─────────┬───┬─────────────┘                      │
│                   REST │   │ WebSocket                           │
│              ┌─────────▼───▼─────────────┐                      │
│              │   NestJS Server            │                      │
│              │   Game Engine + Socket.io  │                      │
│              └─────┬───────┬─────────────┘                      │
│         ┌──────────▼──┐  ┌─▼──────────┐                         │
│         │ PostgreSQL  │  │   Redis     │                         │
│         │ (users,     │  │ (rooms,     │                         │
│         │  stats)     │  │  games)     │                         │
│         └─────────────┘  └────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### Principles
1. **Server-authoritative** — All game logic on server. Client renders state, sends actions.
2. **Real-time via Socket.io** — Game events, rooms, chat. REST for auth/profiles only.
3. **Redis for ephemeral state** — Active rooms/games. PostgreSQL for persistent data.
4. **Shared types** — `shared/` package used by both client and server.
5. **3D progressive enhancement** — Playable with 2D fallback.

---

## 2. Game Roles (16 total, from ROLES.md)

### Seer Result System
When the Seer or Aura Seer checks a player, they see one of:
- **Good (Thiện)** — Player appears to be on the village team
- **Evil (Ác)** — Player appears to be on the werewolf team
- **Unknown (Không Rõ)** — Ambiguous, cannot determine

The **Werewolf Shaman** can curse a player during the day, causing them to appear **Evil** to the Seer/Aura Seer that night, even if they are actually Good/Unknown.

### Village Team (9 roles)

| Role | EN | VI | Seer | Night Action | Day Action |
|------|----|----|------|-------------|------------|
| Doctor | Doctor | Bác Sĩ | Good | Protect 1 player | — |
| Gunner | Gunner | Xạ Thủ | Unknown | — | Shoot player (2 bullets/game) |
| Seer | Seer | Tiên Tri | Good | View 1 player's role | — |
| Aura Seer | Aura Seer | Thầy Bói | Good | View 1 player's alignment | — |
| Medium | Medium | Thầy Đồng | Unknown | Talk to dead; resurrect 1/game | — |
| Witch | Witch | Phù Thủy | Unknown | See attack; heal(1x)/kill(1x) | — |
| Avenger | Avenger | Kẻ Báo Thù | Good | Set revenge target | — |
| Beast Hunter | Beast Hunter | Thợ Săn Quái Thú | Unknown | Place/move trap | — |
| Cursed | Cursed | Bán Sói | Good→Evil | — (passive: converts if bitten) | — |

### Werewolf Team (4 roles)

| Role | EN | VI | Seer | Night Action | Day Action |
|------|----|----|------|-------------|------------|
| Werewolf | Werewolf | Ma Sói | Evil | Vote to kill 1 player | — |
| W. Shaman | Werewolf Shaman | Sói Pháp Sư | Evil | — | Curse 1 player (appears Evil) |
| Alpha Wolf | Alpha Werewolf | Sói Đầu Đàn | Unknown | 2x vote weight in kill vote | — |
| W. Seer | Werewolf Seer | Sói Tiên Tri | Evil | View 1 player's role (shared) | — |

### Solo Team (3 roles)

| Role | EN | VI | Seer | Win Condition |
|------|----|----|------|---------------|
| Headhunter | Headhunter | Thợ Săn Người | Unknown | Target voted out → win. Target dies otherwise → join Village |
| Fool | Fool | Thằng Ngố | Unknown | Get yourself voted out → win |
| Bomber | Bomber | Kẻ Đặt Bom | Unknown | Place bomb → explodes next night. Immune to wolf kills |

---

## 3. Game Engine — State Machine

```
GAME START → Assign roles (+ Headhunter gets target)
    ↓
NIGHT PHASE (30-60s) → Collect night actions
    ↓
RESOLVE NIGHT → Process all actions
    ↓
DAY PHASE (2-5 min) → Discussion + Gunner shots + Shaman curse
    ↓
VOTE PHASE (20-45s) → Majority vote
    ↓
  ┌── Tie/Skip → NIGHT
  ├── Fool voted out → FOOL WINS (game may continue for others)
  ├── Headhunter's target voted out → HEADHUNTER WINS (game may continue)
  └── Other player voted out → LAST WORDS → CHECK WIN → NIGHT or GAME OVER
```

### Night Resolution Order
```
1. Medium         → Talk to dead, optional resurrect
2. Seer           → Check target role (receive result)
3. Aura Seer      → Check target alignment (Good/Evil/Unknown)
4. Werewolf Seer  → Check target role (result shared with all wolves)
5. Beast Hunter   → Place/move trap
6. Avenger        → Set/change revenge target
7. Werewolves     → Vote on kill target (Alpha has 2x weight)
8. Witch (see)    → Sees who wolves targeted
9. Witch (heal)   → Can use heal potion on attacked player
10. Witch (kill)  → Can use kill potion on any player
11. Doctor        → Protect one player
12. Bomber        → Place bomb (explodes NEXT night)
13. RESOLVE:
    a. Previous night's bomb explodes → target dies (no protection)
    b. Wolf target: killed UNLESS protected by Doctor OR Witch heal
       - If target has Beast Hunter trap → weakest wolf dies instead
       - If target is Cursed → Cursed converts to wolf (not killed)
       - If target is Bomber → Bomber is immune (wolf kill fails)
    c. Witch kill target: dies (no protection possible)
    d. If killed player is Avenger → Avenger's revenge target also dies
    e. Resurrected player returns to life (Medium, 1x per game)
```

### Day Phase Special Actions
- **Gunner** can shoot any player (2 bullets total per game, irreversible)
- **Werewolf Shaman** can curse one player (target appears Evil to seers that night)

### Win Conditions
```
VILLAGE WINS:       All werewolves eliminated
WEREWOLF WINS:      Werewolves >= remaining village team members
FOOL WINS:          Fool gets voted out (solo win, game may continue)
HEADHUNTER WINS:    Headhunter's target gets voted out (solo win)
BOMBER WINS:        Based on game rules variant (bomb kills enough, or special condition)
```

Note: Solo wins can co-exist with team wins. If Fool is voted out, Fool wins but the game continues for remaining players.

---

## 4. Data Models

### PostgreSQL (Persistent)
```
User {
  id, username, email, passwordHash, googleId, avatarUrl,
  isGuest, gamesPlayed, gamesWon, totalKills, totalSaves,
  level, xp, goldCoins, moonGems, preferredLanguage,
  createdAt, updatedAt
}

GameRecord {
  id, roomCode, result, totalRounds, playerCount,
  players: jsonb[],  // { userId, username, role (16 possible), survived, kills, saves }
  roleDistribution: jsonb,
  eventLog: jsonb[],
  durationSeconds, createdAt
}

PlayerStat {
  id, userId (FK), role (16 possible roles),
  timesPlayed, timesWon, kills, saves,
  timesEliminatedByVote, timesEliminatedByWerewolf,
  specialStats: jsonb  // role-specific: trapsTriggered, potionsUsed, bombsPlaced, etc.
}
```

### Redis (Ephemeral)
```
room:{code}         → Hash (room state, players, settings with 16-role selection)
game:{id}           → Hash (game state, phase, roles, actions, votes, seer results,
                            shamanCurse, beastHunterTraps, bomberBombs, avengerTargets,
                            gunnerBullets, witchPotions, mediumResurrected,
                            cursedConverted, headhunterTarget, foolStatus)
socket:{socketId}   → String (userId)
rooms:public        → Set (public room codes)
```

---

## 5. Socket.io Events

### Game Events (updated for 16 roles)
| Event | Direction | Description |
|-------|-----------|-------------|
| `game:night:action` | C→S | Night action (varies by role) |
| `game:night:result` | S→Player | Private result (Seer check, Aura check, W.Seer check) |
| `game:day:gunner:shoot` | C→S | Gunner shoots a player |
| `game:day:shaman:curse` | C→S | Shaman curses a player |
| `game:medium:chat` | C→S | Medium sends message to dead players |
| `game:medium:resurrect` | C→S | Medium resurrects a dead player |
| `game:dawn` | S→Room | Night results: deaths, trap triggers, bomb explosions, conversions |
| `game:cursed:convert` | S→Player | You have been converted to werewolf |
| `game:fool:win` | S→Room | Fool was voted out and wins |
| `game:headhunter:win` | S→Room | Headhunter's target was voted out |
| `game:bomb:explode` | S→Room | Bomber's bomb detonated |
| `game:trap:trigger` | S→Room | Beast Hunter's trap activated |

---

## 6. Security
- Server-authoritative: client never knows other roles
- Socket auth: JWT required
- All 16 role actions validated server-side (correct phase, alive, correct role, valid target)
- Seer result manipulation by Shaman computed server-side only
- Rate limiting on socket events

---

## 7. Performance Targets

| Metric | Target |
|--------|--------|
| 3D initial load | < 5s |
| Desktop FPS | 60 fps |
| Mobile FPS | 30 fps |
| Socket latency | < 100ms |
| 3D assets | < 5 MB compressed |
| Concurrent rooms | 100+ |
| Concurrent connections | 1,000+ |
